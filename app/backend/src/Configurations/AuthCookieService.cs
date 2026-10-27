using Microsoft.AspNetCore.Http;

namespace backend.src.Configurations;

public sealed class AuthCookieService(
    AuthCookieSettings settings,
    AuthSecuritySettings? securitySettings = null)
{
    private readonly AuthSecuritySettings securitySettings = securitySettings ?? new AuthSecuritySettings();

    public void AppendAuthenticationCookies(HttpResponse response, string accessToken, string refreshToken)
    {
        response.Cookies.Append(
            settings.AccessCookieName,
            accessToken,
            CreateCookieOptions("/api", TimeSpan.FromMinutes(securitySettings.AccessTokenLifetimeMinutes)));
        response.Cookies.Append(
            settings.RefreshCookieName,
            refreshToken,
            CreateCookieOptions("/api/auth", TimeSpan.FromMinutes(securitySettings.RefreshTokenLifetimeMinutes)));
    }

    public void ExpireAuthenticationCookies(HttpResponse response)
    {
        response.Cookies.Delete(settings.AccessCookieName, CreateExpirationOptions("/api"));
        response.Cookies.Delete(settings.RefreshCookieName, CreateExpirationOptions("/api/auth"));
    }

    private CookieOptions CreateCookieOptions(string path, TimeSpan lifetime)
        => new()
        {
            HttpOnly = true,
            IsEssential = true,
            MaxAge = lifetime,
            Path = path,
            SameSite = SameSiteMode.None,
            Secure = settings.RequireSecure
        };

    private CookieOptions CreateExpirationOptions(string path)
        => new()
        {
            HttpOnly = true,
            IsEssential = true,
            MaxAge = TimeSpan.Zero,
            Path = path,
            SameSite = SameSiteMode.None,
            Secure = settings.RequireSecure,
            Expires = DateTimeOffset.UnixEpoch
        };
}
