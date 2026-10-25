using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend.src.Bases.Enums;
using Microsoft.IdentityModel.Tokens;

namespace backend.src.Services;

public record IssuedToken(string Token, string Jti, DateTime ExpiresAt);

public class TokenService(IConfiguration configuration)
{
    public string? GetSecretKey(TokenType type) => type switch
    {
        TokenType.ACCESS => configuration["Jwt:AccessSecret:Key"],
        TokenType.REFRESH => configuration["Jwt:RefreshSecret:Key"],
        TokenType.VERIFY_REGISTER => configuration["Jwt:VerifyRegisterSecret:Key"],
        _ => null
    };

    public string GenerateToken(Guid userId, TokenType type, IEnumerable<Claim>? additionalClaims = null)
        => Issue(userId, type, additionalClaims).Token;

    public IssuedToken Issue(Guid userId, TokenType type, IEnumerable<Claim>? additionalClaims = null)
    {
        var secret = GetSecretKey(type);
        if (string.IsNullOrWhiteSpace(secret))
            throw new InvalidOperationException($"Secret key for {type} is not configured");

        var jti = Guid.NewGuid().ToString();
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(JwtRegisteredClaimNames.Jti, jti)
        };
        if (additionalClaims != null) claims.AddRange(additionalClaims);

        var expires = type switch
        {
            TokenType.ACCESS => DateTime.UtcNow.AddMinutes(configuration.GetValue("Auth:AccessMinutes", 15)),
            TokenType.REFRESH => DateTime.UtcNow.AddDays(configuration.GetValue("Auth:RefreshDays", 7)),
            TokenType.VERIFY_REGISTER => DateTime.UtcNow.AddMinutes(1024),
            _ => throw new ArgumentOutOfRangeException(nameof(type))
        };

        var creds = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)), SecurityAlgorithms.HmacSha256);
        var jwt = new JwtSecurityToken(
            issuer: configuration["ApiSettings:Issuer"],
            audience: configuration["ApiSettings:Audience"],
            claims: claims,
            expires: expires,
            signingCredentials: creds);

        return new IssuedToken(new JwtSecurityTokenHandler().WriteToken(jwt), jti, expires);
    }

    public ClaimsPrincipal Validate(string token, TokenType type)
    {
        if (string.IsNullOrWhiteSpace(token))
            throw new SecurityTokenException("Token is required");

        var secret = GetSecretKey(type);
        if (string.IsNullOrWhiteSpace(secret))
            throw new InvalidOperationException($"Secret key for {type} is not configured");

        var issuer = configuration["ApiSettings:Issuer"];
        var audience = configuration["ApiSettings:Audience"];

        var handler = new JwtSecurityTokenHandler { MapInboundClaims = false };
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = !string.IsNullOrEmpty(issuer),
            ValidIssuer = issuer,
            ValidateAudience = !string.IsNullOrEmpty(audience),
            ValidAudience = audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            RequireExpirationTime = true,
            RequireSignedTokens = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
            ClockSkew = TimeSpan.Zero
        };
        return handler.ValidateToken(token, parameters, out _);
    }

    public ClaimsPrincipal ValidateRegisterVerificationToken(string token)
        => Validate(token, TokenType.VERIFY_REGISTER);
}