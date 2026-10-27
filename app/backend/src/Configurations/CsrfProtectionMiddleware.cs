using System.IdentityModel.Tokens.Jwt;
using backend.src.Infrastructure;
using Microsoft.AspNetCore.Http;

namespace backend.src.Configurations;

public sealed class CsrfProtectionMiddleware(RequestDelegate next, AuthCookieSettings settings)
{
    public async Task InvokeAsync(HttpContext context, CsrfTokenService csrfTokenService)
    {
        if (IsSafeMethod(context.Request.Method) ||
            !IsCookieAuthenticated(context) ||
            context.User.Identity?.IsAuthenticated != true)
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

    private static bool IsCookieAuthenticated(HttpContext context)
        => context.Items.TryGetValue(AuthTokenSelector.CookieAuthenticationItem, out var source) &&
            source is true;

    private static bool IsSafeMethod(string method)
        => HttpMethods.IsGet(method) ||
            HttpMethods.IsHead(method) ||
            HttpMethods.IsOptions(method) ||
            HttpMethods.IsTrace(method);

    private static Task RejectAsync(HttpContext context, int statusCode)
    {
        context.Response.StatusCode = statusCode;
        return Task.CompletedTask;
    }
}
