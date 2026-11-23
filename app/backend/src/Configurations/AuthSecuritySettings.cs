using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Configuration;

namespace backend.src.Configurations;

public sealed class AuthSecuritySettings
{
    public const string SectionName = "AuthSecurity";

    [Range(1, 20)]
    public int MaxFailedLoginAttempts { get; init; } = 5;

    [Range(1, 1_440)]
    public int LockoutDurationMinutes { get; init; } = 15;

    [Range(1, 1_440)]
    public int AccessTokenLifetimeMinutes { get; init; } = 15;

    [Range(1, 43_200)]
    public int RefreshTokenLifetimeMinutes { get; init; } = 10_080;

    [Range(1, 10_080)]
    public int VerificationTokenLifetimeMinutes { get; init; } = 1_024;

    [Range(1, 1_440)]
    public int ResetPasswordTokenLifetimeMinutes { get; init; } = 15;

    public static AuthSecuritySettings FromConfiguration(IConfiguration configuration)
        => configuration.GetSection(SectionName).Get<AuthSecuritySettings>() ?? new AuthSecuritySettings();
}
