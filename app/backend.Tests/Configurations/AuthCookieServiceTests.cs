using backend.src.Configurations;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace backend.Tests.Configurations;

public sealed class AuthCookieServiceTests
{
    [Fact]
    public void AppendAuthenticationCookies_SetsCrossSiteHttpOnlyCookiesWithScopedPaths()
    {
        var service = new AuthCookieService(new AuthCookieSettings
        {
            AccessCookieName = "cb_access",
            RefreshCookieName = "cb_refresh",
            RequireSecure = true
        });
        var response = new DefaultHttpContext().Response;

        service.AppendAuthenticationCookies(response, "access-token", "refresh-token");

        var cookies = response.Headers.SetCookie.ToArray();
        Assert.Contains(cookies, cookie => cookie?.Contains("cb_access=access-token") == true &&
            cookie.Contains("path=/api", StringComparison.OrdinalIgnoreCase) &&
            cookie.Contains("httponly", StringComparison.OrdinalIgnoreCase) &&
            cookie.Contains("secure", StringComparison.OrdinalIgnoreCase) &&
            cookie.Contains("samesite=none", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(cookies, cookie => cookie?.Contains("cb_refresh=refresh-token") == true &&
            cookie.Contains("path=/api/auth", StringComparison.OrdinalIgnoreCase) &&
            cookie.Contains("httponly", StringComparison.OrdinalIgnoreCase) &&
            cookie.Contains("secure", StringComparison.OrdinalIgnoreCase) &&
            cookie.Contains("samesite=none", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void ExpireAuthenticationCookies_DeletesBothCookiesUsingTheirOriginalPaths()
    {
        var service = new AuthCookieService(new AuthCookieSettings
        {
            AccessCookieName = "cb_access",
            RefreshCookieName = "cb_refresh"
        });
        var response = new DefaultHttpContext().Response;

        service.ExpireAuthenticationCookies(response);

        var cookies = response.Headers.SetCookie.ToArray();
        Assert.Contains(cookies, cookie => cookie?.Contains("cb_access=", StringComparison.Ordinal) == true &&
            cookie.Contains("path=/api", StringComparison.OrdinalIgnoreCase) &&
            cookie.Contains("expires=", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(cookies, cookie => cookie?.Contains("cb_refresh=", StringComparison.Ordinal) == true &&
            cookie.Contains("path=/api/auth", StringComparison.OrdinalIgnoreCase) &&
            cookie.Contains("expires=", StringComparison.OrdinalIgnoreCase));
    }
}
