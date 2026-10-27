using backend.src.Configurations;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace backend.Tests.Configurations;

public sealed class AuthTokenSelectorTests
{
    [Fact]
    public void Select_PrefersAccessCookieOverAuthorizationHeader()
    {
        var context = new DefaultHttpContext();
        context.Request.Headers.Cookie = "cb_access=cookie-token";
        context.Request.Headers.Authorization = "Bearer header-token";

        var selection = AuthTokenSelector.Select(context.Request, "cb_access");

        Assert.True(selection.AccessCookiePresent);
        Assert.Equal("cookie-token", selection.Token);
    }

    [Fact]
    public void Select_UsesBearerHeaderOnlyWhenAccessCookieIsAbsent()
    {
        var context = new DefaultHttpContext();
        context.Request.Headers.Authorization = "Bearer header-token";

        var selection = AuthTokenSelector.Select(context.Request, "cb_access");

        Assert.False(selection.AccessCookiePresent);
        Assert.Equal("header-token", selection.Token);
    }

    [Fact]
    public void Select_DoesNotFallBackToBearerWhenAccessCookieIsEmpty()
    {
        var context = new DefaultHttpContext();
        context.Request.Headers.Cookie = "cb_access=";
        context.Request.Headers.Authorization = "Bearer header-token";

        var selection = AuthTokenSelector.Select(context.Request, "cb_access");

        Assert.True(selection.AccessCookiePresent);
        Assert.True(string.IsNullOrWhiteSpace(selection.Token));
    }
}
