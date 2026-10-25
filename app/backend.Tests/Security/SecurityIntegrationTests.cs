using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace backend.Tests.Security;

public class SecurityIntegrationTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public SecurityIntegrationTests(ApiFactory factory)
    {
        _factory = factory;
        factory.SeedUsers();
    }

    private record TokenBody(string AccessToken);
    private record MeBody(Guid Id, string Email, string FullName, string Role);

    private async Task<(HttpClient Client, string Token)> LoginAsync(string email)
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password = ApiFactory.Password });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<TokenBody>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body!.AccessToken);
        return (client, body.AccessToken);
    }

    [Theory]
    [InlineData("/api/auth/me")]
    [InlineData("/api/access-check/admin")]
    public async Task ProtectedEndpoint_WithoutToken_Returns401Json(string path)
    {
        var response = await _factory.CreateClient().GetAsync(path);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Contains("UNAUTHENTICATED", await response.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData(ApiFactory.AdminEmail, "admin", HttpStatusCode.OK)]
    [InlineData(ApiFactory.AdminEmail, "counter", HttpStatusCode.OK)]
    [InlineData(ApiFactory.AdminEmail, "inventory", HttpStatusCode.OK)]
    [InlineData(ApiFactory.CashierEmail, "admin", HttpStatusCode.Forbidden)]
    [InlineData(ApiFactory.CashierEmail, "counter", HttpStatusCode.OK)]
    [InlineData(ApiFactory.CashierEmail, "inventory", HttpStatusCode.Forbidden)]
    [InlineData(ApiFactory.InventoryEmail, "admin", HttpStatusCode.Forbidden)]
    [InlineData(ApiFactory.InventoryEmail, "counter", HttpStatusCode.Forbidden)]
    [InlineData(ApiFactory.InventoryEmail, "inventory", HttpStatusCode.OK)]
    public async Task RoleMatrix_IsEnforced(string email, string area, HttpStatusCode expected)
    {
        var (client, _) = await LoginAsync(email);

        var response = await client.GetAsync($"/api/access-check/{area}");

        Assert.Equal(expected, response.StatusCode);
        if (expected == HttpStatusCode.Forbidden)
            Assert.Contains("FORBIDDEN", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Login_SetsHttpOnlyRefreshCookie_AndDoesNotLeakRefreshTokenInBody()
    {
        var response = await _factory.CreateClient()
            .PostAsJsonAsync("/api/auth/login", new { email = ApiFactory.CashierEmail, password = ApiFactory.Password });

        var cookie = Assert.Single(response.Headers.GetValues("Set-Cookie"), c => c.StartsWith("refresh_token="));
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("refreshToken", await response.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Refresh_UsesCookie_AndRotatesSession()
    {
        var (client, oldToken) = await LoginAsync(ApiFactory.CashierEmail);

        var refresh = await client.PostAsync("/api/auth/refresh", null); // cookie do HttpClient tự gửi
        Assert.Equal(HttpStatusCode.OK, refresh.StatusCode);
        var newToken = (await refresh.Content.ReadFromJsonAsync<TokenBody>())!.AccessToken;

        Assert.NotEqual(oldToken, newToken);
        var oldRequest = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        oldRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", oldToken);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(oldRequest)).StatusCode);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", newToken);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Refresh_WithoutCookie_Returns401()
    {
        var response = await _factory.CreateClient().PostAsync("/api/auth/refresh", null);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AfterLogout_OldAccessToken_Returns401()
    {
        var (client, _) = await LoginAsync(ApiFactory.CashierEmail);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);

        var logout = await client.PostAsync("/api/auth/logout", null);
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsync("/api/auth/refresh", null)).StatusCode);
    }

    [Fact]
    public async Task WhenAccountIsLocked_ExistingSessionIsRevoked_AndLoginIsBlocked()
    {
        var (client, _) = await LoginAsync(ApiFactory.InventoryEmail);
        var me = await client.GetFromJsonAsync<MeBody>("/api/auth/me");

        // Admin khóa tài khoản => phải gọi RevokeAllAsync (S01/S04 sẽ gọi hàm này)
        await _factory.Store.RevokeAllAsync(me!.Id);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);

        var login = await _factory.CreateClient()
            .PostAsJsonAsync("/api/auth/login", new { email = ApiFactory.LockedEmail, password = ApiFactory.Password });
        Assert.Equal(HttpStatusCode.Forbidden, login.StatusCode);
        Assert.Contains("ACCOUNT_LOCKED", await login.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task ExpiredAccessToken_Returns401_EvenIfJtiIsStillInStore()
    {
        var userId = Guid.NewGuid();
        var jti = Guid.NewGuid().ToString();
        await _factory.Store.CreateAsync(userId, jti, TimeSpan.FromMinutes(5), Guid.NewGuid().ToString(), TimeSpan.FromMinutes(5));

        var jwt = new JwtSecurityToken(
            ApiFactory.Issuer, ApiFactory.Audience,
            [new Claim("sub", userId.ToString()), new Claim("jti", jti), new Claim("role", "ADMIN")],
            notBefore: DateTime.UtcNow.AddHours(-2),
            expires: DateTime.UtcNow.AddHours(-1),
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(ApiFactory.AccessSecret)), SecurityAlgorithms.HmacSha256));

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", new JwtSecurityTokenHandler().WriteToken(jwt));

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/access-check/admin")).StatusCode);
    }
}