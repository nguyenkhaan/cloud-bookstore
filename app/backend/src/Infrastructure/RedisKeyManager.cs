using System.Security.Cryptography;
using System.Text;
using backend.src.Bases.Enums;

namespace backend.src.Infrastructure;

public static class RedisKeyManager
{
    private const string ServicePrefix = "cloudbookstore";
    private const string AuthenticationScope = "auth";
    private const string CsrfScope = "csrf";
    private const string RegistrationVerificationScope = "verify_register";
    private const string EmailThrottleScope = "email_throttle";

    public static string ForToken(TokenType tokenType, string tokenId)
    {
        if (string.IsNullOrWhiteSpace(tokenId))
        {
            throw new ArgumentException("Token ID is required.", nameof(tokenId));
        }

        return Join(AuthenticationScope, tokenType.ToString().ToLowerInvariant(), tokenId);
    }

    public static string ForCurrentRegistrationVerification(Guid employeeId)
    {
        if (employeeId == Guid.Empty)
        {
            throw new ArgumentException("Employee ID is required.", nameof(employeeId));
        }

        return Join(
            AuthenticationScope,
            RegistrationVerificationScope,
            "current",
            employeeId.ToString("D"));
    }

    public static string ForCsrf(string accessTokenId)
    {
        if (string.IsNullOrWhiteSpace(accessTokenId))
        {
            throw new ArgumentException("Access token ID is required.", nameof(accessTokenId));
        }

        return Join(AuthenticationScope, CsrfScope, accessTokenId);
    }

    public static string ForEmailThrottleByAddress(string normalizedEmail) =>
        Join(AuthenticationScope, EmailThrottleScope, "address", Hash(normalizedEmail));

    public static string ForEmailThrottleByIp(string clientIp) =>
        Join(AuthenticationScope, EmailThrottleScope, "ip", Hash(clientIp));

    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    private static string Join(params string[] segments)
        => string.Join(':', new[] { ServicePrefix }.Concat(segments));
}
