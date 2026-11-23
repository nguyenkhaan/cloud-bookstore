using System.IdentityModel.Tokens.Jwt;
using backend.src.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;

namespace backend.src.Configurations;

public sealed class CsrfProtectionMiddleware(RequestDelegate next, AuthCookieSettings settings)
{
    public async Task InvokeAsync(HttpContext context, CsrfTokenService csrfTokenService)
    {
        if (IsSafeMethod(context.Request.Method) ||
            !RequiresAuthorization(context) ||
            !IsCookieAuthenticated(context) ||
            context.User.Identity?.IsAuthenticated is not true)
        {
            await next(context);
            return;
        }

        if (!settings.IsAllowedOrigin(context.Request.Headers.Origin.ToString()))
        {
            await RejectAsync(context, StatusCodes.Status403Forbidden);
            return;
        }

        var accessJti = context.User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
        var presentedToken = context.Request.Headers[settings.CsrfHeaderName].ToString();
        try
        {
            if (string.IsNullOrWhiteSpace(accessJti) ||
                !await csrfTokenService.IsValidAsync(accessJti, presentedToken, context.RequestAborted))
            {
                await RejectAsync(context, StatusCodes.Status403Forbidden);
                return;
            }
        }
        catch
        {
            await RejectAsync(context, StatusCodes.Status503ServiceUnavailable);
            return;
        }

        await next(context);
    }

    // CSRF protects actions performed with the cookie identity. Endpoints that do not require
    // authorization (login, register, verify, password reset, refresh) never act as that identity,
    // so a stale session cookie must not block them.
    private static bool RequiresAuthorization(HttpContext context)
    {
        var metadata = context.GetEndpoint()?.Metadata;
        return metadata?.GetMetadata<IAuthorizeData>() is not null &&
            metadata.GetMetadata<IAllowAnonymous>() is null;
    }

    private static bool IsCookieAuthenticated(HttpContext context)
        => context.Items.TryGetValue(AuthTokenSelector.CookieAuthenticationItem, out var source) &&
            source is true;
    //endpoint -> unsafe method -> thuc hien kiem tra request co hop le khong (POST, PUT, PATCH, DELETE)
    //endpoint -> safe method -> Cho bypass middleware 
    private static bool IsSafeMethod(string method)
        => HttpMethods.IsGet(method) ||
            HttpMethods.IsHead(method) ||
            HttpMethods.IsOptions(method) ||
            HttpMethods.IsTrace(method);

    private static Task RejectAsync(HttpContext context, int statusCode)
    {
        context.Response.StatusCode = statusCode;
        if (statusCode != StatusCodes.Status403Forbidden)
        {
            return Task.CompletedTask;
        }

        // A machine-readable code lets the browser client refresh its CSRF token and retry once,
        // instead of confusing this with a role (RBAC) 403.
        return context.Response.WriteAsJsonAsync(
            new { code = CsrfRejectedCode, message = "CSRF token is missing or invalid." },
            context.RequestAborted);
    }

    public const string CsrfRejectedCode = "CSRF_TOKEN_INVALID";
}
