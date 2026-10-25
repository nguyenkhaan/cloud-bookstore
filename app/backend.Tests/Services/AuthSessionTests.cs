using System.IdentityModel.Tokens.Jwt;
using backend.src.Data;
using backend.src.Dto.AuthDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using backend.Tests.Fakes;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace backend.Tests.Services;

public class AuthSessionTests : IAsyncLifetime
{
    private const string Email = "cashier@cloud.io";
    private const string Password = "TestPassword123!";
    private readonly FakeSessionStore _store = new();
    private SqliteConnection _connection = null!;
    private AppDbContext _db = null!;
    private AuthService _service = null!;

    public async Task InitializeAsync()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        await _connection.OpenAsync();
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
        await _db.Database.EnsureCreatedAsync();
        var config = new ConfigurationManager
        {
            ["Jwt:AccessSecret:Key"] = "test-access-secret-key-32-characters-long",
            ["Jwt:RefreshSecret:Key"] = "test-refresh-secret-key-32-characters-long",
            ["Jwt:VerifyRegisterSecret:Key"] = "test-verify-register-secret-key-32-characters",
            ["ApiSettings:Issuer"] = "test-issuer",
            ["ApiSettings:Audience"] = "test-audience"
        };
        _service = new AuthService(_db, new TokenService(config), new SettingService(config), _store, _store);
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _connection.DisposeAsync();
    }

    private async Task<EmployeeModel> Seed(EmployeeStatus status = EmployeeStatus.ACTIVE)
    {
        var employee = new EmployeeModel
        {
            Email = Email,
            FullName = "Cashier Test",
            Password = BCrypt.Net.BCrypt.HashPassword(Password, workFactor: 4),
            Phone = "0123456789",
            Status = status,
            Role = new RoleModel { RoleName = RoleName.CASHIER, IsActive = true }
        };
        _db.Employees.Add(employee);
        await _db.SaveChangesAsync();
        return employee;
    }

    private static string Jti(string token) => new JwtSecurityTokenHandler().ReadJwtToken(token).Id;

    [Fact]
    public async Task Login_StoresAccessAndRefreshJti()
    {
        await Seed();
        var result = await _service.Login(new LoginRequest(Email, Password));
        Assert.True(await _store.IsAccessActiveAsync(Jti(result.AccessToken)));
    }

    [Fact]
    public async Task Login_IsCaseInsensitiveOnEmail()
    {
        await Seed();
        var result = await _service.Login(new LoginRequest("  CASHIER@Cloud.io ", Password));
        Assert.False(string.IsNullOrEmpty(result.AccessToken));
    }

    [Fact]
    public async Task Login_WrongPassword_ThrowsInvalidCredentials()
    {
        await Seed();
        var ex = await Assert.ThrowsAsync<UnauthorizedException>(
            () => _service.Login(new LoginRequest(Email, "wrong")));
        Assert.Equal("INVALID_CREDENTIALS", ex.Code);
    }

    [Fact]
    public async Task Login_LocksAfterFiveFailures_EvenWithCorrectPassword()
    {
        await Seed();
        for (var i = 0; i < 5; i++)
            await Assert.ThrowsAsync<UnauthorizedException>(() => _service.Login(new LoginRequest(Email, "wrong")));

        var ex = await Assert.ThrowsAsync<ForbiddenException>(
            () => _service.Login(new LoginRequest(Email, Password)));
        Assert.Equal("ACCOUNT_LOCKED", ex.Code);
    }

    [Theory]
    [InlineData(EmployeeStatus.LOCKED)]
    [InlineData(EmployeeStatus.REVOKED)]
    [InlineData(EmployeeStatus.PENDING_OTP)]
    [InlineData(EmployeeStatus.INVITED)]
    public async Task Login_BlocksNonActiveAccounts(EmployeeStatus status)
    {
        await Seed(status);
        await Assert.ThrowsAsync<ForbiddenException>(() => _service.Login(new LoginRequest(Email, Password)));
    }

    [Fact]
    public async Task Login_DoesNotThrow500_WhenPasswordIsEmpty()
    {
        var e = await Seed(EmployeeStatus.INVITED);
        e.Password = string.Empty;
        await _db.SaveChangesAsync();
        await Assert.ThrowsAsync<UnauthorizedException>(() => _service.Login(new LoginRequest(Email, Password)));
    }

    [Fact]
    public async Task Logout_RevokesAccessAndRefresh()
    {
        await Seed();
        var tokens = await _service.Login(new LoginRequest(Email, Password));

        await _service.Logout(Jti(tokens.AccessToken));

        Assert.False(await _store.IsAccessActiveAsync(Jti(tokens.AccessToken)));
        await Assert.ThrowsAsync<UnauthorizedException>(() => _service.Refresh(tokens.RefreshToken));
    }

    [Fact]
    public async Task Refresh_Rotates_AndReuseRevokesAllSessions()
    {
        await Seed();
        var first = await _service.Login(new LoginRequest(Email, Password));
        var second = await _service.Refresh(first.RefreshToken);

        Assert.False(await _store.IsAccessActiveAsync(Jti(first.AccessToken)));
        Assert.True(await _store.IsAccessActiveAsync(Jti(second.AccessToken)));

        await Assert.ThrowsAsync<UnauthorizedException>(() => _service.Refresh(first.RefreshToken));
        Assert.False(await _store.IsAccessActiveAsync(Jti(second.AccessToken)));
    }

    [Fact]
    public async Task Refresh_RejectsAccessTokenUsedAsRefreshToken()
    {
        await Seed();
        var tokens = await _service.Login(new LoginRequest(Email, Password));
        await Assert.ThrowsAsync<UnauthorizedException>(() => _service.Refresh(tokens.AccessToken));
    }
}