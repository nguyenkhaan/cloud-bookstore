using System.ComponentModel.DataAnnotations;

namespace backend.src.Configurations;

public sealed class AuthCookieSettings
{
    public const string SectionName = "AuthCookies";

    [Required]
    public string AccessCookieName { get; init; } = "cloudbook_access";

    [Required]
    public string RefreshCookieName { get; init; } = "cloudbook_refresh";

    [Required]
    public string CsrfHeaderName { get; init; } = "X-CSRF-Token";

    public bool RequireSecure { get; init; } = true;

    [MinLength(1)]
    public string[] AllowedOrigins { get; init; } =
    [
        "https://cloudbook.cloudian.io.vn",
        "http://localhost:5173"
    ];

    public bool IsAllowedOrigin(string? origin)
    {
        if (!Uri.TryCreate(origin, UriKind.Absolute, out var requestedOrigin))
        {
            return false;
        }

        var normalizedRequestedOrigin = requestedOrigin.GetLeftPart(UriPartial.Authority);
        return AllowedOrigins.Any(allowedOrigin =>
            Uri.TryCreate(allowedOrigin, UriKind.Absolute, out var configuredOrigin) &&
            string.Equals(
                configuredOrigin.GetLeftPart(UriPartial.Authority),
                normalizedRequestedOrigin,
                StringComparison.OrdinalIgnoreCase));
    }
}
