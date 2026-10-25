using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend.src.Bases.Enums;
using backend.src.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace backend.Tests.Services;

public sealed class TokenServiceTests
{
    [Fact]
    public void ValidateAccessToken_RejectsAnExpiredTokenWithoutClockSkew()
    {
        var configuration = new ConfigurationManager
        {
            ["Jwt:AccessSecret:Key"] = "test-access-secret-key-at-least-32-characters"
        };
        var tokenService = new TokenService(configuration);
        var expiredToken = new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(
            claims:
            [
                new Claim(JwtRegisteredClaimNames.Sub, Guid.NewGuid().ToString()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim("token_use", TokenType.ACCESS.ToString())
            ],
            expires: DateTime.UtcNow.AddSeconds(-1),
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:AccessSecret:Key"]!)),
                SecurityAlgorithms.HmacSha256)));

        Assert.Throws<SecurityTokenExpiredException>(() => tokenService.ValidateAccessToken(expiredToken));
    }
}
