using System.IdentityModel.Tokens.Jwt;
using backend.src.Infrastructure;
using Microsoft.AspNetCore.Http;

namespace backend.src.Configurations;

public sealed class CsrfProtectionMiddleware(RequestDelegate next, AuthCookieSettings settings)
{
    public async Task InvokeAsync(HttpContext context, CsrfTokenService csrfTokenService)
    {
        Console.WriteLine(context.User.Identity?.IsAuthenticated);
        if (IsSafeMethod(context.Request.Method) ||
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
        return Task.CompletedTask;
    }
}
