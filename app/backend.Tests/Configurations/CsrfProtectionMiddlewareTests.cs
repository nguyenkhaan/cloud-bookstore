using System.Security.Claims;
using backend.src.Configurations;
using backend.src.Infrastructure;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace backend.Tests.Configurations;

public sealed class CsrfProtectionMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_RejectsUnsafeCookieRequestWithoutCsrfToken()
    {
        var (context, nextCalled) = CreateCookieAuthenticatedContext();
        var middleware = new CsrfProtectionMiddleware(
            _ =>
            {
                nextCalled.Value = true;
                return Task.CompletedTask;
            },
            CreateSettings());

        await middleware.InvokeAsync(context, CreateCsrfTokenService());

        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
        Assert.False(nextCalled.Value);
    }

    [Fact]
    public async Task InvokeAsync_AllowsUnsafeCookieRequestWithValidCsrfTokenAndOrigin()
    {
        var tokenStore = new InMemoryCsrfTokenStore();
        var csrfTokenService = new CsrfTokenService(tokenStore);
        var csrfToken = await csrfTokenService.IssueAsync("access-jti", TimeSpan.FromMinutes(15));
        var (context, nextCalled) = CreateCookieAuthenticatedContext();
        context.Request.Headers["X-CSRF-Token"] = csrfToken;
        var middleware = new CsrfProtectionMiddleware(
            _ =>
            {
                nextCalled.Value = true;
                return Task.CompletedTask;
            },
            CreateSettings());

        await middleware.InvokeAsync(context, csrfTokenService);

        Assert.True(nextCalled.Value);
    }

    [Fact]
    public async Task InvokeAsync_DoesNotRequireCsrfForBearerOnlyRequest()
    {
        var context = new DefaultHttpContext();
        context.Request.Method = HttpMethods.Post;
        var nextCalled = false;
        var middleware = new CsrfProtectionMiddleware(
            _ =>
            {
                nextCalled = true;
                return Task.CompletedTask;
            },
            CreateSettings());

        await middleware.InvokeAsync(context, CreateCsrfTokenService());

        Assert.True(nextCalled);
    }

    private static (DefaultHttpContext Context, MutableBoolean NextCalled) CreateCookieAuthenticatedContext()
    {
        var context = new DefaultHttpContext();
        context.Request.Method = HttpMethods.Post;
        context.Request.Headers.Origin = "https://app.example.test";
        context.User = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim("jti", "access-jti")],
            authenticationType: "cookie"));
        context.Items[AuthTokenSelector.CookieAuthenticationItem] = true;
        return (context, new MutableBoolean());
    }

    private static AuthCookieSettings CreateSettings() => new()
    {
        AllowedOrigins = ["https://app.example.test"],
        CsrfHeaderName = "X-CSRF-Token"
    };

    private static CsrfTokenService CreateCsrfTokenService()
        => new(new InMemoryCsrfTokenStore());

    private sealed class MutableBoolean
    {
        public bool Value { get; set; }
    }

    private sealed class InMemoryCsrfTokenStore : ICsrfTokenStore
    {
        private readonly Dictionary<string, string> values = [];

        public Task<string?> GetAsync(string accessJti, CancellationToken cancellationToken = default)
            => Task.FromResult(values.GetValueOrDefault(accessJti));

        public Task RemoveAsync(string accessJti, CancellationToken cancellationToken = default)
        {
            values.Remove(accessJti);
            return Task.CompletedTask;
        }

        public Task StoreAsync(
            string accessJti,
            string tokenHash,
            TimeSpan lifetime,
            CancellationToken cancellationToken = default)
        {
            values[accessJti] = tokenHash;
            return Task.CompletedTask;
        }
    }
}
