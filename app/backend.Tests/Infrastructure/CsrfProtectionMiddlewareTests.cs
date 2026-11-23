using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using backend.src.Configurations;
using backend.src.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace backend.Tests.Infrastructure;

public sealed class CsrfProtectionMiddlewareTests
{
    private const string Origin = "http://localhost:5173";
    private static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(30);

    [Fact]
    public async Task Anonymous_endpoint_is_not_blocked_by_a_stale_cookie_session()
    {
        // Login after a failed logout: valid access cookie, no CSRF header.
        var (status, nextCalled) = await RunAsync(endpointMetadata: [], csrfHeader: null);

        Assert.True(nextCalled);
        Assert.Equal(StatusCodes.Status200OK, status);
    }

    [Fact]
    public async Task AllowAnonymous_endpoint_is_not_blocked_even_with_authorize_metadata()
    {
        var (status, nextCalled) = await RunAsync(
            endpointMetadata: [new AuthorizeAttribute(), new AllowAnonymousAttribute()],
            csrfHeader: null);

        Assert.True(nextCalled);
        Assert.Equal(StatusCodes.Status200OK, status);
    }

    [Fact]
    public async Task Authorized_endpoint_without_csrf_header_is_rejected_with_csrf_code()
    {
        var context = CreateContext([new AuthorizeAttribute()], csrfHeader: null);
        var nextCalled = false;

        await CreateMiddleware(() => nextCalled = true).InvokeAsync(context, CreateCsrfService(out _));

        Assert.False(nextCalled);
        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
        context.Response.Body.Position = 0;
        using var body = await JsonDocument.ParseAsync(context.Response.Body);
        Assert.Equal("CSRF_TOKEN_INVALID", body.RootElement.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Authorized_endpoint_with_valid_csrf_header_passes()
    {
        var service = CreateCsrfService(out var store);
        var token = await service.IssueAsync("jti-1", Lifetime);
        var context = CreateContext([new AuthorizeAttribute()], csrfHeader: token);
        var nextCalled = false;

        await CreateMiddleware(() => nextCalled = true).InvokeAsync(context, service);

        Assert.True(nextCalled);
    }

    private static async Task<(int Status, bool NextCalled)> RunAsync(object[] endpointMetadata, string? csrfHeader)
    {
        var context = CreateContext(endpointMetadata, csrfHeader);
        var nextCalled = false;
        await CreateMiddleware(() => nextCalled = true).InvokeAsync(context, CreateCsrfService(out _));
        return (context.Response.StatusCode, nextCalled);
    }

    private static CsrfProtectionMiddleware CreateMiddleware(Action onNext)
        => new(_ => { onNext(); return Task.CompletedTask; }, CreateSettings());

    private static CsrfTokenService CreateCsrfService(out InMemoryCsrfTokenStore store)
    {
        store = new InMemoryCsrfTokenStore();
        return CsrfTokenServiceTests.CreateService(store);
    }

    private static AuthCookieSettings CreateSettings()
        => new() { AllowedOrigins = [Origin], CsrfHeaderName = "X-CSRF-Token" };

    private static DefaultHttpContext CreateContext(object[] endpointMetadata, string? csrfHeader)
    {
        var context = new DefaultHttpContext();
        context.Request.Method = HttpMethods.Post;
        context.Request.Headers.Origin = Origin;
        if (csrfHeader is not null)
        {
            context.Request.Headers["X-CSRF-Token"] = csrfHeader;
        }

        context.Response.Body = new MemoryStream();
        context.Items[AuthTokenSelector.CookieAuthenticationItem] = true;
        context.User = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(JwtRegisteredClaimNames.Jti, "jti-1")],
            authenticationType: "Cookie"));
        context.SetEndpoint(new Endpoint(_ => Task.CompletedTask, new EndpointMetadataCollection(endpointMetadata), "test"));
        return context;
    }
}
