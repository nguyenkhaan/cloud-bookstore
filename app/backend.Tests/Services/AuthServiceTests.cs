using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Text;
using System.Text.Json;
using backend.src.Bases.Enums;
using backend.src.Data;
using backend.src.Dto.AuthDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace backend.Tests.Services;

public class AuthServiceTests
{
    private const string VerifyRegisterSecret = "test-verify-register-secret-key-32-characters";

    [Fact]
    public async Task Register_PreservesBadRequestException_WhenEmailDomainIsNotAllowed()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;
        await using var dbContext = new AppDbContext(dbOptions);
        await dbContext.Database.EnsureCreatedAsync();

        var configuration = new ConfigurationManager
        {
            ["AppSettings:AllowedEmainDomains"] = "@cloud.io"
        };
        var authService = new AuthService(
            dbContext,
            new TokenService(configuration),
            new SettingService(configuration),
            CreateTokenStore(configuration, new FakeRedisHandler()));
        var request = new RegisterRequest
        {
            Email = "cashier@example.com",
            FullName = "Cashier Test",
            Password = "TestPassword123!",
            Phone = "0123456789"
        };

        await Assert.ThrowsAsync<BadRequestException>(() => authService.Register(request));
    }

    [Fact]
    public async Task Login_PreservesNotFoundException_WhenEmployeeDoesNotExist()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;
        await using var dbContext = new AppDbContext(dbOptions);
        await dbContext.Database.EnsureCreatedAsync();

        var configuration = new ConfigurationManager();
        var authService = new AuthService(
            dbContext,
            new TokenService(configuration),
            new SettingService(configuration),
            CreateTokenStore(configuration, new FakeRedisHandler()));

        await Assert.ThrowsAsync<NotFoundException>(() =>
            authService.Login(new LoginRequest("missing@example.com", "TestPassword123!")));
    }

    [Fact]
    public async Task Register_RollsBackEmployee_WhenActivationTokenGenerationFails()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;

        await SeedCashierRole(dbOptions);

        var configuration = new ConfigurationManager
        {
            ["AppSettings:AllowedEmainDomains"] = "@example.com"
        };
        var request = new RegisterRequest
        {
            Email = "cashier@example.com",
            FullName = "Cashier Test",
            Password = "TestPassword123!",
            Phone = "0123456789"
        };

        await using (var dbContext = new AppDbContext(dbOptions))
        {
            var authService = new AuthService(
                dbContext,
                new TokenService(configuration),
                new SettingService(configuration),
                CreateTokenStore(configuration, new FakeRedisHandler()));

            await Assert.ThrowsAsync<InvalidOperationException>(() => authService.Register(request));
        }

        await using var verificationContext = new AppDbContext(dbOptions);
        Assert.False(await verificationContext.Employees.AnyAsync(employee => employee.Email == request.Email));
    }

    [Fact]
    public async Task Verify_ActivatesPendingEmployee_WhenTokenIsValid()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;
        await using var dbContext = new AppDbContext(dbOptions);
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.PENDING_OTP);
        var configuration = CreateVerifyConfiguration(VerifyRegisterSecret);
        var tokenService = new TokenService(configuration);
        var tokenStore = CreateTokenStore(configuration, new FakeRedisHandler());
        var authService = new AuthService(dbContext, tokenService, new SettingService(configuration), tokenStore);
        var token = tokenService.GenerateToken(
            employee.Id,
            TokenType.VERIFY_REGISTER,
            [new Claim("email", employee.Email)]);
        await tokenStore.StoreRegistrationVerificationAsync(token);

        await authService.Verify(token);

        Assert.Equal(EmployeeStatus.ACTIVE, employee.Status);
        await Assert.ThrowsAsync<UnauthorizedException>(() => authService.Verify(token));
    }

    [Fact]
    public async Task Verify_RejectsTokenSignedWithWrongSecret()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;
        await using var dbContext = new AppDbContext(dbOptions);
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.PENDING_OTP);
        var configuration = CreateVerifyConfiguration(VerifyRegisterSecret);
        var authService = new AuthService(
            dbContext,
            new TokenService(configuration),
            new SettingService(configuration),
            CreateTokenStore(configuration, new FakeRedisHandler()));
        var token = new TokenService(CreateVerifyConfiguration("different-verify-register-secret-key-32-chars"))
            .GenerateToken(
                employee.Id,
                TokenType.VERIFY_REGISTER,
                [new Claim("email", employee.Email)]);

        await Assert.ThrowsAsync<UnauthorizedException>(() => authService.Verify(token));

        Assert.Equal(EmployeeStatus.PENDING_OTP, employee.Status);
    }

    [Fact]
    public async Task Verify_DoesNotActivateLockedEmployee()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;
        await using var dbContext = new AppDbContext(dbOptions);
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.LOCKED);
        var configuration = CreateVerifyConfiguration(VerifyRegisterSecret);
        var tokenService = new TokenService(configuration);
        var tokenStore = CreateTokenStore(configuration, new FakeRedisHandler());
        var authService = new AuthService(dbContext, tokenService, new SettingService(configuration), tokenStore);
        var token = tokenService.GenerateToken(
            employee.Id,
            TokenType.VERIFY_REGISTER,
            [new Claim("email", employee.Email)]);
        await tokenStore.StoreRegistrationVerificationAsync(token);

        await Assert.ThrowsAsync<ForbiddenException>(() => authService.Verify(token));

        Assert.Equal(EmployeeStatus.LOCKED, employee.Status);
    }

    [Fact]
    public async Task Login_StoresBothJtis_AndLogoutRevokesThem()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;
        await using var dbContext = new AppDbContext(dbOptions);
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.ACTIVE);
        employee.Password = BCrypt.Net.BCrypt.HashPassword("TestPassword123!");
        await dbContext.SaveChangesAsync();

        var configuration = CreateAuthConfiguration();
        var tokenStore = CreateTokenStore(configuration, new FakeRedisHandler());
        var authService = new AuthService(dbContext, new TokenService(configuration), new SettingService(configuration), tokenStore);

        var response = await authService.Login(new LoginRequest(employee.Email, "TestPassword123!"));
        var accessJwt = new JwtSecurityTokenHandler().ReadJwtToken(response.AccessToken);
        var refreshJwt = new JwtSecurityTokenHandler().ReadJwtToken(response.RefreshToken);

        Assert.Equal("CloudianAPI", accessJwt.Issuer);
        Assert.Contains("CloudianClient", accessJwt.Audiences);
        Assert.True(await tokenStore.IsActiveAsync(accessJwt.Id, TokenType.ACCESS));
        Assert.True(await tokenStore.IsActiveAsync(refreshJwt.Id, TokenType.REFRESH));

        await authService.Logout(response.RefreshToken);

        Assert.False(await tokenStore.IsActiveAsync(accessJwt.Id, TokenType.ACCESS));
        Assert.False(await tokenStore.IsActiveAsync(refreshJwt.Id, TokenType.REFRESH));
    }

    [Fact]
    public async Task Verify_RejectsValidTokenWithoutStoredJti()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;
        await using var dbContext = new AppDbContext(dbOptions);
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.PENDING_OTP);
        var configuration = CreateVerifyConfiguration(VerifyRegisterSecret);
        var tokenService = new TokenService(configuration);
        var authService = new AuthService(
            dbContext, tokenService, new SettingService(configuration), CreateTokenStore(configuration, new FakeRedisHandler()));
        var token = tokenService.GenerateToken(
            employee.Id, TokenType.VERIFY_REGISTER, [new Claim("email", employee.Email)]);

        await Assert.ThrowsAsync<UnauthorizedException>(() => authService.Verify(token));
        Assert.Equal(EmployeeStatus.PENDING_OTP, employee.Status);
    }

    [Fact]
    public async Task Register_Again_InvalidatesPreviousVerificationToken()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;
        await SeedCashierRole(dbOptions);
        await using var dbContext = new AppDbContext(dbOptions);
        var configuration = CreateAuthConfiguration();
        var authService = new AuthService(
            dbContext,
            new TokenService(configuration),
            new SettingService(configuration),
            CreateTokenStore(configuration, new FakeRedisHandler()));
        var request = new RegisterRequest
        {
            Email = "new@cloud.io",
            FullName = "New Cashier",
            Password = "TestPassword123!",
            Phone = "0123456789"
        };

        var firstRegistration = await authService.Register(request);
        var secondRegistration = await authService.Register(request);

        await Assert.ThrowsAsync<UnauthorizedException>(() =>
            authService.Verify(firstRegistration.Activation));
        await authService.Verify(secondRegistration.Activation);

        var employee = await dbContext.Employees.SingleAsync(item => item.Email == request.Email);
        Assert.Equal(EmployeeStatus.ACTIVE, employee.Status);
    }

    [Fact]
    public async Task Register_StoresCurrentVerificationJti()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;
        await SeedCashierRole(dbOptions);
        await using var dbContext = new AppDbContext(dbOptions);
        var configuration = CreateAuthConfiguration();
        var tokenStore = CreateTokenStore(configuration, new FakeRedisHandler());
        var authService = new AuthService(dbContext, new TokenService(configuration), new SettingService(configuration), tokenStore);

        var response = await authService.Register(new RegisterRequest
        {
            Email = "new@cloud.io",
            FullName = "New Cashier",
            Password = "TestPassword123!",
            Phone = "0123456789"
        });

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(response.Activation);
        var employeeId = Guid.Parse(jwt.Subject);
        Assert.True(await tokenStore.IsRegistrationVerificationActiveAsync(employeeId, jwt.Id));
    }

    private static ConfigurationManager CreateVerifyConfiguration(string secret) => new()
    {
        ["Jwt:VerifyRegisterSecret:Key"] = secret
    };

    private static ConfigurationManager CreateAuthConfiguration() => new()
    {
        ["Jwt:AccessSecret:Key"] = "test-access-secret-key-32-characters",
        ["Jwt:RefreshSecret:Key"] = "test-refresh-secret-key-32-characters",
        ["Jwt:VerifyRegisterSecret:Key"] = VerifyRegisterSecret,
        ["ApiSettings:Issuer"] = "CloudianAPI",
        ["ApiSettings:Audience"] = "CloudianClient",
        ["AppSettings:AllowedEmainDomains"] = "@cloud.io"
    };

    private static TokenJtiStore CreateTokenStore(ConfigurationManager configuration, FakeRedisHandler handler)
    {
        configuration["UpstashRedis:RestUrl"] = "https://redis.example.test";
        configuration["UpstashRedis:RestToken"] = "test-token";
        return new TokenJtiStore(new RedisService(new HttpClient(handler), configuration));
    }

    private static async Task<EmployeeModel> SeedEmployee(
        AppDbContext dbContext,
        EmployeeStatus status)
    {
        var role = new RoleModel
        {
            RoleName = RoleName.CASHIER,
            IsActive = true
        };
        var employee = new EmployeeModel
        {
            Email = "cashier@cloud.io",
            FullName = "Cashier Test",
            Password = "hashed-password",
            Phone = "0123456789",
            Role = role,
            Status = status
        };
        dbContext.Employees.Add(employee);
        await dbContext.SaveChangesAsync();
        return employee;
    }

    private static async Task SeedCashierRole(DbContextOptions<AppDbContext> dbOptions)
    {
        await using var dbContext = new AppDbContext(dbOptions);
        await dbContext.Database.EnsureCreatedAsync();
        dbContext.Roles.Add(new RoleModel
        {
            RoleName = RoleName.CASHIER,
            IsActive = true
        });
        await dbContext.SaveChangesAsync();
    }

    private sealed class FakeRedisHandler : HttpMessageHandler
    {
        private readonly Dictionary<string, string> values = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            using var body = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
            var command = body.RootElement.EnumerateArray().Select(part => part.GetString()!).ToArray();
            object? result = command[0] switch
            {
                "SET" => Set(command[1], command[2]),
                "EXISTS" => values.ContainsKey(command[1]) ? 1 : 0,
                "DEL" => command.Skip(1).Count(key => values.Remove(key)),
                "GET" => values.GetValueOrDefault(command[1]),
                _ => throw new NotSupportedException(command[0])
            };
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(JsonSerializer.Serialize(new { result }), Encoding.UTF8, "application/json")
            };
        }

        private string Set(string key, string value)
        {
            values[key] = value;
            return "OK";
        }
    }
}
