using System.Security.Claims;
using backend.src.Models;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
namespace backend.src.Services;

public class TokenService
{
    public string GenerateToken(EmployeeModel employee, string secretKey , int expireMinutes)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier , employee.Id.ToString()),
            new Claim(ClaimTypes.Name , employee.Email),
            new Claim(ClaimTypes.Role , "EMPLOYEE")
        };
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: secretKey,
            audience: secretKey,
            claims: claims,
            expires: DateTime.Now.AddMinutes(expireMinutes),
            signingCredentials: creds
        );
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

}
