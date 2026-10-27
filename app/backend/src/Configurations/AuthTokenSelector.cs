using System.Net.Http.Headers;
using Microsoft.AspNetCore.Http;

namespace backend.src.Configurations;

public readonly record struct AuthTokenSelection(bool AccessCookiePresent, string? Token);

public static class AuthTokenSelector
{
    public const string CookieAuthenticationItem = "AuthTokenSelector.CookieAuthentication";

    public static AuthTokenSelection Select(HttpRequest request, string accessCookieName)
    {
        if (request.Cookies.TryGetValue(accessCookieName, out var accessCookie))
        {
            return new AuthTokenSelection(true, accessCookie);
        }

        if (HasCookieNamed(request.Headers.Cookie.ToString(), accessCookieName))
        {
            return new AuthTokenSelection(true, null);
        }

        if (AuthenticationHeaderValue.TryParse(request.Headers.Authorization, out var authorization) &&
            string.Equals(authorization.Scheme, "Bearer", StringComparison.OrdinalIgnoreCase))
        {
            return new AuthTokenSelection(false, authorization.Parameter);
        }

        return new AuthTokenSelection(false, null);
    }

    private static bool HasCookieNamed(string cookieHeader, string cookieName)
    {
        foreach (var cookie in cookieHeader.Split(';', StringSplitOptions.TrimEntries))
        {
            var separator = cookie.IndexOf('=');
            var name = separator >= 0 ? cookie[..separator] : cookie;
            if (string.Equals(name, cookieName, StringComparison.Ordinal))
            {
                return true;
            }
        }

        return false;
    }
}
