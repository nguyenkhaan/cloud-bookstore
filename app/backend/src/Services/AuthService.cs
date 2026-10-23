using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using backend.src.Bases.Enums;
using backend.src.Data;
using backend.src.Dto.AuthDto;
using backend.src.Exceptions;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using BCryptHasher = BCrypt.Net.BCrypt;
using backend.src.Models;
namespace backend.src.Services;

public class AuthService(AppDbContext dbContext, TokenService tokenService, SettingService settingService, TokenJtiStore tokenJtiStore)
{
    public async Task<LoginResponse> Login(LoginRequest request)
    {
        var employee = await dbContext.Employees.Include(employee => employee.Role).FirstOrDefaultAsync(u => u.Email == request.Email);
        if (employee is null)
            throw new NotFoundException("User not found");
        var passwordIsValid = BCryptHasher.Verify(request.Password, employee.Password);
        if (!passwordIsValid)
            throw new NotFoundException("User not found");
        var claims = new List<Claim>
        {
            new ("role" , employee.Role.RoleName.ToString())
        };
        var accessToken = tokenService.GenerateToken(employee.Id, TokenType.ACCESS, claims);
        var refreshToken = tokenService.GenerateToken(employee.Id, TokenType.REFRESH, claims);
        await tokenJtiStore.StoreLoginAsync(accessToken, refreshToken);
        return new LoginResponse(accessToken, refreshToken);
    }
    public async Task<RegisterResponse> Register(RegisterRequest request)
    {
        var email = request.Email.Trim();
        var atIndex = email.LastIndexOf('@');
        if (atIndex <= 0 || atIndex == email.Length - 1)
        {
            throw new BadRequestException("Invalid email address");
        }
        var emailDomains = settingService.GetEmailDomains();
        var emailDomain = email[atIndex..];
        if (!emailDomains.Contains(
            emailDomain,
            StringComparer.OrdinalIgnoreCase))
        {
            throw new BadRequestException("Email domain is not allowed");
        }
        var employee = await dbContext.Employees.FirstOrDefaultAsync(em => em.Email == request.Email);
        if (employee != null)
        {
            if (employee.Status == EmployeeStatus.PENDING_OTP)
            {
                var claims = new List<Claim>
                {
                    new("email" , employee.Email)
                };
                var activateToken = tokenService.GenerateToken(employee.Id, TokenType.VERIFY_REGISTER, claims);
                await tokenJtiStore.StoreAsync(activateToken, TokenType.VERIFY_REGISTER);
                return new RegisterResponse(employee.Email, employee.FullName, activateToken);
            }

            throw new ConflictException("User has been registered");
        }
        var employeeRole = await dbContext.Roles.FirstOrDefaultAsync(r => r.RoleName == RoleName.CASHIER);
        var newEmployee = new EmployeeModel
        {
            Email = request.Email,
            Password = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 12),
            FullName = request.FullName,
            Phone = request.Phone,
            Status = EmployeeStatus.PENDING_OTP,
            Role = employeeRole!
        };
        await using var transaction = await dbContext.Database.BeginTransactionAsync();
        try
        {
            await dbContext.Employees.AddAsync(newEmployee);
            await dbContext.SaveChangesAsync();

            var newClaims = new List<Claim>
            {
                new("email" , request.Email)
            };
            var verifyToken = tokenService.GenerateToken(newEmployee.Id, TokenType.VERIFY_REGISTER, newClaims);
            await tokenJtiStore.StoreAsync(verifyToken, TokenType.VERIFY_REGISTER);

            await transaction.CommitAsync();
            return new RegisterResponse(Email : newEmployee.Email, FullName: newEmployee.FullName, Activation: verifyToken);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task Verify(string token)
    {
        ClaimsPrincipal principal;
        try
        {
            principal = tokenService.ValidateRegisterVerificationToken(token);
        }
        catch (Exception exception) when (exception is SecurityTokenException or ArgumentException)
        {
            throw new UnauthorizedException("Invalid or expired verification token");
        }

        var subject = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
        var email = principal.FindFirstValue("email");
        var jti = principal.FindFirstValue(JwtRegisteredClaimNames.Jti);
        if (!Guid.TryParse(subject, out var employeeId) || string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(jti))
            throw new UnauthorizedException("Invalid or expired verification token");

        if (!await tokenJtiStore.IsActiveAsync(jti, TokenType.VERIFY_REGISTER))
            throw new UnauthorizedException("Invalid or expired verification token");

        var employee = await dbContext.Employees.FindAsync(employeeId);
        if (employee is null || !string.Equals(employee.Email, email, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedException("Invalid or expired verification token");

        if (employee.Status == EmployeeStatus.ACTIVE)
        {
            await tokenJtiStore.RevokeAsync(jti, TokenType.VERIFY_REGISTER);
            return;
        }
        if (employee.Status != EmployeeStatus.PENDING_OTP)
            throw new ForbiddenException("Account cannot be verified");

        employee.Status = EmployeeStatus.ACTIVE;
        await dbContext.SaveChangesAsync();
        await tokenJtiStore.RevokeAsync(jti, TokenType.VERIFY_REGISTER);
    }

    public async Task Logout(string refreshToken)
    {
        ClaimsPrincipal refreshPrincipal;
        try
        {
            refreshPrincipal = tokenService.ValidateRefreshToken(refreshToken);
        }
        catch (Exception exception) when (exception is SecurityTokenException or ArgumentException)
        {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }

        var refreshJti = refreshPrincipal.FindFirstValue(JwtRegisteredClaimNames.Jti);
        if (string.IsNullOrWhiteSpace(refreshJti))
        {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }

        var accessJti = await tokenJtiStore.GetAccessJtiForRefreshAsync(refreshJti);
        if (string.IsNullOrWhiteSpace(accessJti))
            throw new UnauthorizedException("Invalid or expired refresh token");

        await tokenJtiStore.RevokeLoginAsync(accessJti, refreshJti);
    }
}
