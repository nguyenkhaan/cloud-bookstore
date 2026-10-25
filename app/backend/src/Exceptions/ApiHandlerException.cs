using Microsoft.AspNetCore.Diagnostics;

namespace backend.src.Exceptions;

public sealed class ApiHandlerException(ILogger<ApiHandlerException> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        var (statusCode, message, code) = exception is ApiException api
            ? (api.StatusCode, api.Message, api.Code)
            : (StatusCodes.Status500InternalServerError, "Internal Server Error.", (string?)null);

        if (statusCode >= StatusCodes.Status500InternalServerError)
        {
            logger.LogError(exception, "Exception while processing {Method} {Path}",
                context.Request.Method, context.Request.Path);
        }

        if (statusCode == StatusCodes.Status401Unauthorized)
            context.Response.Headers.WWWAuthenticate = "Bearer";

        context.Response.StatusCode = statusCode;
        await context.Response.WriteAsJsonAsync(new
        {
            message,
            code,
            notification = "Cloudian Notification!!!",
            path = context.Request.Path.ToString(),
            timestamp = DateTimeOffset.UtcNow
        }, cancellationToken);
        return true;
    }
}