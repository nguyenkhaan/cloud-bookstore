using backend.src.Bases.Enums;

namespace backend.src.Services;

public static class RedisKeyManager
{
    private const string ServicePrefix = "cloudbookstore";
    private const string AuthenticationScope = "auth";
    private const string RegistrationVerificationScope = "verify_register";

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

    private static string Join(params string[] segments)
        => string.Join(':', new[] { ServicePrefix }.Concat(segments));
}
