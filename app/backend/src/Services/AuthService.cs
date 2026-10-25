using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Bases.Enums;
using backend.src.Data;
using backend.src.Dto.AuthDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using BCryptHasher = BCrypt.Net.BCrypt;

namespace backend.src.Services;

public class AuthService(
    AppDbContext dbContext,
    TokenService tokenService,
    SettingService settingService,
    ISessionStore sessions,
    ILoginThrottle throttle)
{
    public async Task<LoginResponse> Login(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var policy = settingService.GetLoginPolicy();

        if (await throttle.GetLockRemainingAsync(email) is { } remaining)
            throw new ForbiddenException(
                $"Account is temporarily locked. Try again in {Math.Ceiling(remaining.TotalMinutes)} minute(s)",
                "ACCOUNT_LOCKED");

        var employee = await dbContext.Employees
            .Include(e => e.Role)
            .FirstOrDefaultAsync(e => e.Email.ToLower() == email);

        if (employee is null
            || string.IsNullOrEmpty(employee.Password)
            || !BCryptHasher.Verify(request.Password, employee.Password))
        {
            if (await throttle.RecordFailureAsync(email, policy.Window) >= policy.MaxAttempts)
                await throttle.LockAsync(email, policy.LockDuration);
            throw new UnauthorizedException("Invalid email or password", "INVALID_CREDENTIALS");
        }

        // Kiểm tra trạng thái SAU khi mật khẩu đúng để không lộ trạng thái tài khoản cho người lạ
        if (employee.Status is EmployeeStatus.LOCKED or EmployeeStatus.REVOKED)
            throw new ForbiddenException("Account is locked", "ACCOUNT_LOCKED");
        if (employee.Status != EmployeeStatus.ACTIVE)
            throw new ForbiddenException("Account is not activated", "ACCOUNT_NOT_ACTIVATED");

        await throttle.ResetAsync(email);
        return await IssueSession(employee);
    }

    public async Task<LoginResponse> Refresh(string refreshToken)
    {
        ClaimsPrincipal principal;
        try
        {
            principal = tokenService.Validate(refreshToken, TokenType.REFRESH);
        }
        catch (Exception ex) when (ex is SecurityTokenException or ArgumentException)
        {
            throw new UnauthorizedException("Invalid or expired refresh token", "INVALID_REFRESH");
        }

        var jti = principal.FindFirstValue(JwtRegisteredClaimNames.Jti);
        if (!Guid.TryParse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub), out var userId) || jti is null)
            throw new UnauthorizedException("Invalid or expired refresh token", "INVALID_REFRESH");

        if (!await sessions.RevokeByRefreshAsync(jti))
        {
            // Token hợp lệ về chữ ký nhưng đã dùng/bị thu hồi => nghi bị đánh cắp, thu hồi mọi phiên
            await sessions.RevokeAllAsync(userId);
            throw new UnauthorizedException("Invalid or expired refresh token", "INVALID_REFRESH");
        }

        var employee = await dbContext.Employees.Include(e => e.Role).FirstOrDefaultAsync(e => e.Id == userId);
        if (employee is null || employee.Status != EmployeeStatus.ACTIVE)
            throw new UnauthorizedException("Invalid or expired refresh token", "INVALID_REFRESH");

        return await IssueSession(employee);
    }

    public Task Logout(string accessJti) => sessions.RevokeByAccessAsync(accessJti);

    public async Task<ProfileResponse> GetProfile(Guid userId)
    {
        var employee = await dbContext.Employees.Include(e => e.Role).FirstOrDefaultAsync(e => e.Id == userId);
        if (employee is null || employee.Status != EmployeeStatus.ACTIVE)
            throw new UnauthorizedException("Session is no longer valid", "INVALID_SESSION");
        return new ProfileResponse(employee.Id, employee.Email, employee.FullName, employee.Role.RoleName.ToString());
    }

    private async Task<LoginResponse> IssueSession(EmployeeModel employee)
    {
        var claims = new[] { new Claim("role", employee.Role.RoleName.ToString()) };
        var access = tokenService.Issue(employee.Id, TokenType.ACCESS, claims);
        var refresh = tokenService.Issue(employee.Id, TokenType.REFRESH, claims);
        await sessions.CreateAsync(
            employee.Id,
            access.Jti, access.ExpiresAt - DateTime.UtcNow,
            refresh.Jti, refresh.ExpiresAt - DateTime.UtcNow);
        return new LoginResponse(access.Token, refresh.Token);
    }

    public async Task<RegisterResponse> Register(RegisterRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var atIndex = email.LastIndexOf('@');
        if (atIndex <= 0 || atIndex == email.Length - 1)
            throw new BadRequestException("Invalid email address");

        var emailDomains = settingService.GetEmailDomains();
        var emailDomain = email[atIndex..];
        if (!emailDomains.Contains(emailDomain, StringComparer.OrdinalIgnoreCase))
            throw new BadRequestException("Email domain is not allowed");

        var employee = await dbContext.Employees.FirstOrDefaultAsync(em => em.Email.ToLower() == email);
        if (employee != null)
        {
            if (employee.Status == EmployeeStatus.PENDING_OTP)
            {
                var activateToken = tokenService.GenerateToken(
                    employee.Id, TokenType.VERIFY_REGISTER, [new Claim("email", employee.Email)]);
                return new RegisterResponse(employee.Email, employee.FullName, activateToken);
            }
            throw new ConflictException("User has been registered");
        }

        var employeeRole = await dbContext.Roles.FirstOrDefaultAsync(r => r.RoleName == RoleName.CASHIER);
        var newEmployee = new EmployeeModel
        {
            Email = email,
            Password = BCryptHasher.HashPassword(request.Password, workFactor: 12),
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

            var verifyToken = tokenService.GenerateToken(
                newEmployee.Id, TokenType.VERIFY_REGISTER, [new Claim("email", email)]);

            await transaction.CommitAsync();
            return new RegisterResponse(newEmployee.Email, newEmployee.FullName, verifyToken);
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
        if (!Guid.TryParse(subject, out var employeeId) || string.IsNullOrWhiteSpace(email))
            throw new UnauthorizedException("Invalid or expired verification token");

        var employee = await dbContext.Employees.FindAsync(employeeId);
        if (employee is null || !string.Equals(employee.Email, email, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedException("Invalid or expired verification token");

        if (employee.Status == EmployeeStatus.ACTIVE) return;
        if (employee.Status != EmployeeStatus.PENDING_OTP)
            throw new ForbiddenException("Account cannot be verified");

        employee.Status = EmployeeStatus.ACTIVE;
        await dbContext.SaveChangesAsync();
    }
}