using Microsoft.AspNetCore.Http;

namespace backend.src.Configurations;

public sealed class UnsafeOriginValidationMiddleware(RequestDelegate next, AuthCookieSettings settings)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var origin = context.Request.Headers.Origin.ToString();
        if (!IsSafeMethod(context.Request.Method) &&
            !string.IsNullOrWhiteSpace(origin) &&
            !settings.IsAllowedOrigin(origin))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }

        await next(context);
    }

    private static bool IsSafeMethod(string method)
        => HttpMethods.IsGet(method) ||
            HttpMethods.IsHead(method) ||
            HttpMethods.IsOptions(method) ||
            HttpMethods.IsTrace(method);
}
