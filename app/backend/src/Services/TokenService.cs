using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using backend.src.Bases.Enums;
namespace backend.src.Services;

public class TokenService(IConfiguration configuration)
{
    public string? GetSecretKey(TokenType type)
    {
        //Su dung truc tiep cai tham so nay luon chu khong gan no tro thanh 1 doi tuong cua class 
        // => Hoan toan co the dung binh thuong
        if (type == TokenType.ACCESS)
            return configuration["Jwt:AccessSecret:Key"];
        if (type == TokenType.REFRESH)
            return configuration["Jwt:RefreshSecret:Key"];
        return null;
    }
    public string GenerateToken(Guid userId , TokenType type, IEnumerable<Claim>? additionalClaims = null)
    {
        var secret = GetSecretKey(type);
        if (string.IsNullOrWhiteSpace(secret))
            throw new InvalidOperationException($"Secret key for ${type} is not configured");
        var keyByte = Encoding.UTF8.GetBytes(secret);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub , userId.ToString()),
            new(JwtRegisteredClaimNames.Jti , Guid.NewGuid().ToString())
        };
        if (additionalClaims != null) claims.AddRange(additionalClaims);
        var expires = type switch
        {
            TokenType.ACCESS => DateTime.UtcNow.AddMinutes(15),
            TokenType.REFRESH => DateTime.UtcNow.AddDays(7),
            _ => throw new ArgumentOutOfRangeException(nameof(type))
        };
        var key = new SymmetricSecurityKey(keyByte);
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            claims: claims,
            expires: expires,
            signingCredentials: creds
        );
        return new JwtSecurityTokenHandler().WriteToken(token);

    }
}