using System.Security.Claims;
using backend.src.Bases.Enums;
using backend.src.Data;
using backend.src.Dto.AuthDto;
using backend.src.Exceptions;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;
using BCryptHasher = BCrypt.Net.BCrypt;
using backend.src.Models;
namespace backend.src.Services;

public class AuthService(AppDbContext dbContext , TokenService tokenService , SettingService settingService)
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

            // Generate verify token
            var newClaims = new List<Claim>
            {
                new("email" , request.Email)
            };
            var verifyToken = tokenService.GenerateToken(newEmployee.Id, TokenType.VERIFY_REGISTER, newClaims);

            await transaction.CommitAsync();
            return new RegisterResponse(Email : newEmployee.Email, FullName: newEmployee.FullName, Activation: verifyToken);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
    //employee.Password = BCrypt.Net.BCrypt.HashPassword(plainPassword, workFactor: 12); -> Thuc hien hash password
}
