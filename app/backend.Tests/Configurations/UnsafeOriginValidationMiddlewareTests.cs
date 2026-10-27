using backend.src.Configurations;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace backend.Tests.Configurations;

public sealed class UnsafeOriginValidationMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_RejectsUnsafeRequestFromAnUnconfiguredOrigin()
    {
        var context = new DefaultHttpContext();
        context.Request.Method = HttpMethods.Post;
        context.Request.Headers.Origin = "https://attacker.example.test";
        var nextCalled = false;
        var middleware = new UnsafeOriginValidationMiddleware(
            _ =>
            {
                nextCalled = true;
                return Task.CompletedTask;
            },
            new AuthCookieSettings { AllowedOrigins = ["https://app.example.test"] });

        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
        Assert.False(nextCalled);
    }

    [Fact]
    public async Task InvokeAsync_AllowsSafeRequestsAndAllowedOrigins()
    {
        var settings = new AuthCookieSettings { AllowedOrigins = ["https://app.example.test"] };
        var calls = 0;
        var middleware = new UnsafeOriginValidationMiddleware(
            _ =>
            {
                calls++;
                return Task.CompletedTask;
            },
            settings);
        var allowedRequest = new DefaultHttpContext();
        allowedRequest.Request.Method = HttpMethods.Post;
        allowedRequest.Request.Headers.Origin = "https://app.example.test";
        var safeRequest = new DefaultHttpContext();
        safeRequest.Request.Method = HttpMethods.Get;
        safeRequest.Request.Headers.Origin = "https://attacker.example.test";

        await middleware.InvokeAsync(allowedRequest);
        await middleware.InvokeAsync(safeRequest);

        Assert.Equal(2, calls);
    }
}
