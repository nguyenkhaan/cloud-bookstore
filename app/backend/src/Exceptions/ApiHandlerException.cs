//https://towardsdev.com/configuring-custom-exception-handlers-in-asp-net-core-8-8106501e2303
using Microsoft.AspNetCore.Diagnostics;

namespace backend.src.Exceptions;

public sealed class ApiHandlerException(ILogger<ApiHandlerException> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context, Exception exception, CancellationToken cancellationToken
    )
    {
        var (statusCode, message) = exception switch
        {
            BadRequestException => (
                StatusCodes.Status400BadRequest,
                exception.Message),
            ConflictException => (
                StatusCodes.Status409Conflict, exception.Message
            ),
            ForbiddenException => (
                StatusCodes.Status403Forbidden,
                exception.Message
            ),
            InternalServerErrorException => (
                StatusCodes.Status500InternalServerError,
                exception.Message
            ),
            NotFoundException => (
                StatusCodes.Status404NotFound, exception.Message
            ),
            UnauthorizedException => (
                StatusCodes.Status401Unauthorized, exception.Message
            ),
            _ => (
                StatusCodes.Status500InternalServerError,
                "Internal Server Error.")
        };

        if (statusCode >= StatusCodes.Status500InternalServerError)
        {
            logger.LogError(
                exception,
                "Exception while processing {Method} {Path}",
                context.Request.Method,
                context.Request.Path
            );
        }

        if (statusCode == StatusCodes.Status401Unauthorized)
        {
            context.Response.Headers.WWWAuthenticate = "Bearer";
        }

        context.Response.StatusCode = statusCode;
        await context.Response.WriteAsJsonAsync(new
        {
            message,
            notification = "Cloudian Notification!!!",
            path = context.Request.Path.ToString(),
            timestamp = DateTimeOffset.UtcNow
        }, cancellationToken);
        return true;
    }
}
