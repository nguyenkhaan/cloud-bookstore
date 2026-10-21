using System.Security.Claims;
using backend.src.Bases.Enums;
using backend.src.Data;
using backend.src.Dto.AuthDto;
using backend.src.Exceptions;
using Microsoft.EntityFrameworkCore;
using BCryptHasher = BCrypt.Net.BCrypt;
namespace backend.src.Services;

public class AuthService(AppDbContext dbContext , TokenService tokenService)
{
    public LoginResponse Login(LoginRequest request)
    {
        try
        {
            var employee = dbContext.Employees.Include(employee => employee.Role).FirstOrDefault(u => u.Email == request.Email);
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
            return new LoginResponse(accessToken , refreshToken);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"An error occur during login {ex}");
        }
    }
    //employee.Password = BCrypt.Net.BCrypt.HashPassword(plainPassword, workFactor: 12); -> Thuc hien hash password
}
