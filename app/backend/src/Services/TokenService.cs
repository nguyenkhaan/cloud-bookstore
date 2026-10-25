using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend.src.Bases.Enums;
using Microsoft.IdentityModel.Tokens;

namespace backend.src.Services;

public class TokenService(IConfiguration configuration)
{
    private readonly AuthSecuritySettings securitySettings = AuthSecuritySettings.FromConfiguration(configuration);

    public string? GetSecretKey(TokenType type)
    {
        return type switch
        {
            TokenType.ACCESS => configuration["Jwt:AccessSecret:Key"],
            TokenType.REFRESH => configuration["Jwt:RefreshSecret:Key"],
            TokenType.VERIFY_REGISTER => configuration["Jwt:VerifyRegisterSecret:Key"],
            TokenType.RESET_PASSWORD => configuration["Jwt:ResetPasswordSecret:Key"],
            _ => null
        };
    }

    public string GenerateToken(Guid userId, TokenType type, IEnumerable<Claim>? additionalClaims = null)
    {
        var secret = GetSecretKey(type);
        if (string.IsNullOrWhiteSpace(secret))
            throw new InvalidOperationException($"Secret key for {type} is not configured");

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("token_use", type.ToString())
        };
        if (additionalClaims is not null)
            claims.AddRange(additionalClaims);

        var expires = type switch
        {
            TokenType.ACCESS => DateTime.UtcNow.AddMinutes(securitySettings.AccessTokenLifetimeMinutes),
            TokenType.REFRESH => DateTime.UtcNow.AddMinutes(securitySettings.RefreshTokenLifetimeMinutes),
            TokenType.VERIFY_REGISTER => DateTime.UtcNow.AddMinutes(securitySettings.VerificationTokenLifetimeMinutes),
            TokenType.RESET_PASSWORD => DateTime.UtcNow.AddMinutes(securitySettings.ResetPasswordTokenLifetimeMinutes),
            _ => throw new ArgumentOutOfRangeException(nameof(type))
        };

        var token = new JwtSecurityToken(
            issuer: configuration["ApiSettings:Issuer"],
            audience: configuration["ApiSettings:Audience"],
            claims: claims,
            expires: expires,
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
                SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public ClaimsPrincipal ValidateRegisterVerificationToken(string token)
        => ValidateToken(token, TokenType.VERIFY_REGISTER);

    public ClaimsPrincipal ValidateAccessToken(string token)
        => ValidateToken(token, TokenType.ACCESS);

    public ClaimsPrincipal ValidateRefreshToken(string token)
        => ValidateToken(token, TokenType.REFRESH);

    public ClaimsPrincipal ValidatePasswordResetToken(string token)
        => ValidateToken(token, TokenType.RESET_PASSWORD);

    private ClaimsPrincipal ValidateToken(string token, TokenType type)
    {
        if (string.IsNullOrWhiteSpace(token))
            throw new SecurityTokenException("Token is required");

        var secret = GetSecretKey(type);
        if (string.IsNullOrWhiteSpace(secret))
            throw new InvalidOperationException($"Secret key for {type} is not configured");

        var tokenHandler = new JwtSecurityTokenHandler { MapInboundClaims = false };
        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            RequireExpirationTime = true,
            RequireSignedTokens = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
            ClockSkew = TimeSpan.Zero
        };

        var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
        if (!string.Equals(principal.FindFirstValue("token_use"), type.ToString(), StringComparison.Ordinal))
            throw new SecurityTokenException("Invalid token type");

        return principal;
    }
}
