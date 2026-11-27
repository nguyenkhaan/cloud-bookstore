using System.ComponentModel.DataAnnotations;
using System.Data.Common;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using backend.src.Bases.Enums;
using backend.src.Configurations;
using backend.src.Controllers;
using backend.src.Data;
using backend.src.Dto.AuthDto;
using backend.src.Exceptions;
using backend.src.Helpers;
using backend.src.Infrastructure;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Npgsql;
using Xunit;

namespace backend.Tests.Services;

public sealed class AuthServiceTests : IAsyncLifetime
{
    private const string Email = "employee@example.test";
    private const string CurrentPassword = "Current12345!";
    private const string NewPassword = "Replacement123!";
    private const string UserAgent = "Mozilla/5.0";
    private const string AccessSecret = "test-access-signing-secret-at-least-32-bytes";
    private static readonly string CurrentPasswordHash = BCrypt.Net.BCrypt.HashPassword(CurrentPassword, workFactor: 4);

    private readonly ResetCleanupFailure resetCleanupFailure = new();
    private readonly DbContextOptions<AppDbContext> options;
    private readonly bool usesPostgres;
    private readonly FakeEmail email = new();
    private readonly FakeRedis redis = new();
    private readonly HttpClient redisClient;
    private readonly TokenService tokenService;
    private readonly TokenJtiStore tokenStore;
    private readonly CsrfTokenService csrfService;
    private readonly IConfiguration configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
    {
        ["Jwt:AccessSecret:Key"] = AccessSecret,
        ["Jwt:RefreshSecret:Key"] = "test-refresh-signing-secret-at-least-32-bytes",
        ["Jwt:VerifyRegisterSecret:Key"] = "test-register-signing-secret-at-least-32-bytes",
        ["Jwt:ResetPasswordSecret:Key"] = "test-password-reset-secret-at-least-32-bytes",
        ["ApiSettings:Issuer"] = "auth-service-tests",
        ["ApiSettings:Audience"] = "auth-service-tests",
        ["AppSettings:AllowedEmailDomains"] = "@example.test",
        ["UpstashRedis:RestUrl"] = "https://redis.example.test",
        ["UpstashRedis:RestToken"] = "test-redis-token",
    }).Build();

    public AuthServiceTests()
    {
        var databaseName = $"auth_tests_{Guid.NewGuid():N}";
        var testConnectionString = Environment.GetEnvironmentVariable("CLOUDBOOK_AUTH_TEST_POSTGRES");
        var builder = new DbContextOptionsBuilder<AppDbContext>();
        usesPostgres = !string.IsNullOrWhiteSpace(testConnectionString);
        if (usesPostgres)
        {
            var connection = new NpgsqlConnectionStringBuilder(testConnectionString) { Database = databaseName, Pooling = false };
            builder.UseNpgsql(connection.ConnectionString).AddInterceptors(new RejectCleanupCommand(resetCleanupFailure));
        }
        else
        {
            builder.UseInMemoryDatabase(databaseName)
                .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .AddInterceptors(new RejectCleanupSave(resetCleanupFailure));
        }
        options = builder.Options;

        redisClient = new HttpClient(redis);
        var redisService = new RedisService(redisClient, configuration);
        tokenService = new TokenService(configuration);
        tokenStore = new TokenJtiStore(redisService);
        csrfService = new CsrfTokenService(new RedisCsrfTokenStore(redisService), CsrfTokenSigningKey.FromSecret(AccessSecret));
    }

    public async Task InitializeAsync()
    {
        if (usesPostgres)
        {
            await using var db = new AppDbContext(options);
            await db.Database.EnsureCreatedAsync();
        }
    }

    public async Task DisposeAsync()
    {
        redisClient.Dispose();
        if (usesPostgres)
        {
            await using var db = new AppDbContext(options);
            await db.Database.EnsureDeletedAsync();
        }
    }

    [Fact]
    public async Task Untracked_tokens_with_live_redis_keys_fail_access_validation_and_refresh()
    {
        var employeeId = await SeedEmployeeAsync();
        var access = tokenService.GenerateToken(employeeId, TokenType.ACCESS, [new Claim("role", nameof(RoleName.CASHIER))]);
        var refresh = tokenService.GenerateToken(employeeId, TokenType.REFRESH);
        var accessJti = await tokenStore.StoreLoginAsync(access, refresh);
        var csrf = await csrfService.IssueAsync(accessJti, TimeSpan.FromHours(1));
        await using var db = new AppDbContext(options);
        var service = CreateService(db);

        Assert.True(await tokenStore.IsActiveAsync(accessJti, TokenType.ACCESS));
        Assert.Equal(accessJti, await tokenStore.GetAccessJtiForRefreshAsync(ReadJwt(refresh).Id));
        Assert.True(await csrfService.IsValidAsync(accessJti, csrf));
        Assert.Equal("Session has been revoked or is invalid.", (await ValidateAccessAsync(access))?.Failure?.Message);
        var failure = await Assert.ThrowsAsync<UnauthorizedException>(() => service.Refresh(refresh, csrf, UserAgent));
        Assert.Equal("Invalid or expired refresh token", failure.Message);
        Assert.Empty(await db.EmployeeSessions.ToListAsync());
    }

    [Fact]
    public async Task Change_password_preserves_current_session_and_revokes_other_tracked_sessions()
    {
        var employeeId = await SeedEmployeeAsync();
        await using var db = new AppDbContext(options);
        var service = CreateService(db);
        var current = await LoginAsync(service);
        var other = await LoginAsync(service);

        await service.ChangePasswordAsync(employeeId, ReadJwt(current.AccessToken).Id, ChangeRequest(NewPassword));

        await using var persisted = new AppDbContext(options);
        Assert.Null((await GetDeviceAsync(persisted, current)).RevokedAt);
        Assert.NotNull((await GetDeviceAsync(persisted, other)).RevokedAt);
        Assert.Null((await ValidateAccessAsync(current.AccessToken))?.Failure);
        Assert.NotNull((await ValidateAccessAsync(other.AccessToken))?.Failure);
        Assert.All(SessionKeys(current), key => Assert.True(redis.Values.ContainsKey(key)));
        Assert.All(SessionKeys(other), key => Assert.False(redis.Values.ContainsKey(key)));
        Assert.True(PasswordPolicy.Verify(NewPassword, (await persisted.Employees.SingleAsync()).Password));
        Assert.Equal("CHANGE_PASSWORD", (await persisted.AuditLogs.SingleAsync()).Action);
    }

    [Fact]
    public async Task Reset_delivery_failure_clears_its_hash_and_returns_same_204_as_unknown_email()
    {
        await SeedEmployeeAsync();
        await using var db = new AppDbContext(options);
        var controller = CreateController(db);
        string? hashAtDelivery = null;
        email.DeliverReset = async _ =>
        {
            hashAtDelivery = await GetResetHashAsync();
            throw new InvalidOperationException("SMTP rejected the message.");
        };

        Assert.IsType<NoContentResult>(await controller.RequestPasswordReset(ResetRequest()));
        Assert.IsType<NoContentResult>(await controller.RequestPasswordReset(ResetRequest("unknown@example.test")));
        Assert.Equal(1, email.ResetAttempts);
        Assert.NotNull(hashAtDelivery);
        Assert.Null(await GetResetHashAsync());
    }

    [Fact]
    public async Task Older_failed_reset_delivery_does_not_clear_newer_successful_reset_link()
    {
        await SeedEmployeeAsync();
        await using var olderDb = new AppDbContext(options);
        var olderController = CreateController(olderDb);
        string? olderHash = null;
        string? newerToken = null;
        string? newerHash = null;
        IActionResult? newerResponse = null;
        email.DeliverReset = async _ =>
        {
            olderHash = await GetResetHashAsync();
            email.DeliverReset = token =>
            {
                newerToken = token;
                return Task.CompletedTask;
            };
            await using var newerDb = new AppDbContext(options);
            newerResponse = await CreateController(newerDb).RequestPasswordReset(ResetRequest());
            newerHash = await GetResetHashAsync();
            throw new InvalidOperationException("Older SMTP delivery failed.");
        };

        Assert.IsType<NoContentResult>(await olderController.RequestPasswordReset(ResetRequest()));
        Assert.IsType<NoContentResult>(newerResponse);
        Assert.Equal(2, email.ResetAttempts);
        Assert.NotNull(olderHash);
        Assert.NotNull(newerHash);
        Assert.NotEqual(olderHash, newerHash);
        Assert.Equal(newerHash, await GetResetHashAsync());
        Assert.NotNull(newerToken);
        await using var resetDb = new AppDbContext(options);
        await CreateService(resetDb).ResetPassword(new ResetPasswordRequest { Token = newerToken, NewPassword = NewPassword });
        Assert.Null(await GetResetHashAsync());
    }

    [Fact]
    public async Task Reset_cleanup_database_failure_still_returns_204()
    {
        await SeedEmployeeAsync();
        await using var db = new AppDbContext(options);
        var controller = CreateController(db);
        email.DeliverReset = _ =>
        {
            resetCleanupFailure.Induce = true;
            throw new InvalidOperationException("SMTP rejected the message.");
        };

        Assert.IsType<NoContentResult>(await controller.RequestPasswordReset(ResetRequest()));
        Assert.IsType<NoContentResult>(await controller.RequestPasswordReset(ResetRequest("unknown@example.test")));
        Assert.Equal(1, resetCleanupFailure.Attempts);
        Assert.NotNull(await GetResetHashAsync());
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(2)]
    public async Task Revocation_commits_and_retries_each_failed_redis_delete_independently(int failedKeyIndex)
    {
        var employeeId = await SeedEmployeeAsync();
        await using var db = new AppDbContext(options);
        var service = CreateService(db);
        var current = await LoginAsync(service);
        var other = await LoginAsync(service);
        var deviceId = (await GetDeviceAsync(db, other)).Id;
        var currentAccessJti = ReadJwt(current.AccessToken).Id;
        var keys = SessionKeys(other);
        redis.FailNextDeleteOf.Add(keys[failedKeyIndex]);

        await service.RevokeSessionAsync(employeeId, currentAccessJti, deviceId);

        await using var persisted = new AppDbContext(options);
        var revokedAt = (await GetDeviceAsync(persisted, other)).RevokedAt;
        Assert.NotNull(revokedAt);
        Assert.Null((await GetDeviceAsync(persisted, current)).RevokedAt);
        Assert.Equal([keys[failedKeyIndex]], keys.Where(redis.Values.ContainsKey));
        Assert.NotNull((await ValidateAccessAsync(other.AccessToken))?.Failure);

        await CreateService(persisted).RevokeSessionAsync(employeeId, currentAccessJti, deviceId);

        Assert.All(keys, key => Assert.False(redis.Values.ContainsKey(key)));
        Assert.Equal(revokedAt, (await GetDeviceAsync(persisted, other)).RevokedAt);
        Assert.Equal("REVOKE_SESSION", (await persisted.AuditLogs.SingleAsync()).Action);
    }

    [Fact]
    public async Task Bulk_revocation_cleans_later_sessions_after_a_redis_failure()
    {
        var employeeId = await SeedEmployeeAsync();
        await using var db = new AppDbContext(options);
        var service = CreateService(db);
        var current = await LoginAsync(service);
        var other = await LoginAsync(service);
        var another = await LoginAsync(service);
        var otherKeys = SessionKeys(other);
        var anotherKeys = SessionKeys(another);
        redis.FailNextDeleteOf.UnionWith([otherKeys[0], anotherKeys[0]]);

        await service.RevokeOtherSessionsAsync(employeeId, ReadJwt(current.AccessToken).Id);

        var remainingKey = Assert.Single(otherKeys.Concat(anotherKeys), redis.Values.ContainsKey);
        Assert.Contains(remainingKey, new[] { otherKeys[0], anotherKeys[0] });
        Assert.Equal(2, await db.EmployeeSessions.CountAsync(device => device.RevokedAt != null));
    }

    [Fact]
    public async Task Rotation_deletes_old_refresh_and_csrf_keys_when_old_access_key_has_expired()
    {
        await SeedEmployeeAsync();
        await using var db = new AppDbContext(options);
        var service = CreateService(db);
        var original = await LoginAsync(service);
        var originalDevice = (await GetDeviceAsync(db, original)).Id;
        var keys = SessionKeys(original);
        Assert.True(redis.Values.Remove(keys[0]));
        Assert.True(redis.Values.ContainsKey(keys[1]));

        var rotated = await service.Refresh(original.RefreshToken, original.CsrfToken, UserAgent);

        Assert.All(keys, key => Assert.False(redis.Values.ContainsKey(key)));
        Assert.All(SessionKeys(rotated), key => Assert.True(redis.Values.ContainsKey(key)));
        await using var persisted = new AppDbContext(options);
        var device = Assert.Single(await persisted.EmployeeSessions.ToListAsync());
        Assert.Equal(originalDevice, device.Id);
        Assert.Equal(ReadJwt(rotated.RefreshToken).Id, device.RefreshJti);
        Assert.NotEqual(ReadJwt(original.RefreshToken).Id, device.RefreshJti);
        Assert.Null((await ValidateAccessAsync(rotated.AccessToken))?.Failure);
    }

    public static TheoryData<string, bool> UnicodePasswords => new()
    {
        { "Aabcdefghij1\u0085", false },
        { "Aabcdefghij1\uFEFF", true },
        { "\U0001D400abcdefghi1!", true },
        { "\U0001D400abcdefghij1", false },
        { "\U0001D400abcdefgh1!", false },
        { $"\U0001D400{new string('a', 125)}1!", true },
        { "abcdefghij\U000104281!", false },
    };

    [Theory]
    [MemberData(nameof(UnicodePasswords))]
    public async Task Unicode_policy_is_consistent_across_register_reset_and_change(string password, bool accepted)
    {
        var employeeId = await SeedEmployeeAsync();
        await using var db = new AppDbContext(options);
        var service = CreateService(db);
        var current = await LoginAsync(service);
        var accessJti = ReadJwt(current.AccessToken).Id;
        var register = new RegisterRequest { Email = "new@example.test", FullName = "New Employee", Phone = "0901234567", Password = password };
        var change = ChangeRequest(password);
        await service.RequestPasswordReset(ResetRequest());
        var reset = new ResetPasswordRequest { Token = Assert.IsType<string>(email.LastResetToken), NewPassword = password };
        Assert.All(new object[] { register, change, reset }, request =>
            Assert.True(Validator.TryValidateObject(request, new ValidationContext(request), null, validateAllProperties: true)));

        if (accepted)
        {
            PasswordPolicy.Validate(password);
            await service.Register(register);
            await service.ChangePasswordAsync(employeeId, accessJti, change);
            await service.RequestPasswordReset(ResetRequest());
            await service.ResetPassword(new ResetPasswordRequest { Token = Assert.IsType<string>(email.LastResetToken), NewPassword = password });
            Assert.True(PasswordPolicy.Verify(password, (await db.Employees.SingleAsync(item => item.Email == register.Email)).Password));
            Assert.True(PasswordPolicy.Verify(password, (await db.Employees.SingleAsync(item => item.Id == employeeId)).Password));
        }
        else
        {
            var policyError = Assert.Throws<BadRequestException>(() => PasswordPolicy.Validate(password));
            var registerError = await Assert.ThrowsAsync<BadRequestException>(() => service.Register(register));
            var resetError = await Assert.ThrowsAsync<BadRequestException>(() => service.ResetPassword(reset));
            var changeError = await Assert.ThrowsAsync<BadRequestException>(() => service.ChangePasswordAsync(employeeId, accessJti, change));
            Assert.All(new[] { registerError, resetError, changeError }, error => Assert.Equal(policyError.Message, error.Message));
            Assert.Equal(CurrentPasswordHash, (await db.Employees.SingleAsync()).Password);
        }
    }

    private static ChangePasswordRequest ChangeRequest(string password) =>
        new() { CurrentPassword = CurrentPassword, NewPassword = password };

    private static ForgotPasswordRequest ResetRequest(string address = Email) => new() { Email = address };

    private static Task<BrowserAuthenticationSession> LoginAsync(AuthService service) =>
        service.Login(new LoginRequest(Email, CurrentPassword), UserAgent);

    private static JwtSecurityToken ReadJwt(string token) => new JwtSecurityTokenHandler().ReadJwtToken(token);

    private static string[] SessionKeys(BrowserAuthenticationSession session)
    {
        var accessJti = ReadJwt(session.AccessToken).Id;
        return [RedisKeyManager.ForToken(TokenType.ACCESS, accessJti),
            RedisKeyManager.ForToken(TokenType.REFRESH, ReadJwt(session.RefreshToken).Id), RedisKeyManager.ForCsrf(accessJti)];
    }

    private static Task<EmployeeSessionModel> GetDeviceAsync(AppDbContext db, BrowserAuthenticationSession session)
    {
        var accessJti = ReadJwt(session.AccessToken).Id;
        return db.EmployeeSessions.AsNoTracking().SingleAsync(item => item.AccessJti == accessJti);
    }

    private async Task<Guid> SeedEmployeeAsync()
    {
        await using var db = new AppDbContext(options);
        var employee = new EmployeeModel
        {
            Email = Email, FullName = "Test Employee", Phone = "0901234567", Password = CurrentPasswordHash,
            Role = new RoleModel { RoleName = RoleName.CASHIER }, Status = EmployeeStatus.ACTIVE,
        };
        db.Employees.Add(employee);
        await db.SaveChangesAsync();
        return employee.Id;
    }

    private async Task<string?> GetResetHashAsync()
    {
        await using var db = new AppDbContext(options);
        return await db.Employees.Where(item => item.Email == Email).Select(item => item.PasswordResetTokenHash).SingleAsync();
    }

    private AuthService CreateService(AppDbContext db)
    {
        var audit = new AuditLogService(db);
        var cloudinary = new CloudinaryService(Options.Create(new CloudinarySettings
        {
            CloudName = "test", ApiKey = "test", ApiSecret = "test",
        }));
        return new AuthService(db, tokenService, new SettingService(configuration), email, tokenStore, csrfService, audit,
            new UploadIntentService(db, cloudinary, audit), cloudinary, configuration);
    }

    private AuthController CreateController(AppDbContext db)
    {
        var settings = new AuthCookieSettings();
        return new AuthController(CreateService(db), new AuthCookieService(settings), settings);
    }

    private async Task<AuthenticateResult?> ValidateAccessAsync(string accessToken)
    {
        await using var db = new AppDbContext(options);
        await using var services = new ServiceCollection().AddSingleton(db).AddSingleton(tokenStore).BuildServiceProvider();
        var scheme = new AuthenticationScheme(JwtBearerDefaults.AuthenticationScheme, null, typeof(JwtBearerHandler));
        var context = new TokenValidatedContext(new DefaultHttpContext { RequestServices = services }, scheme, new JwtBearerOptions())
        {
            Principal = new ClaimsPrincipal(new ClaimsIdentity(ReadJwt(accessToken).Claims, scheme.Name)),
        };
        await AccessTokenValidation.ValidateAsync(context);
        return context.Result;
    }

    private sealed class FakeEmail() : EmailService(Options.Create(new EmailSettings()), NullLogger<EmailService>.Instance)
    {
        public Func<string, Task> DeliverReset { get; set; } = _ => Task.CompletedTask;
        public int ResetAttempts { get; private set; }
        public string? LastResetToken { get; private set; }

        public override Task SendPasswordResetEmailAsync(string recipientEmail, string recipientName, string token,
            CancellationToken cancellationToken = default)
        {
            ResetAttempts++;
            LastResetToken = token;
            return DeliverReset(token);
        }

        public override Task SendAccountVerificationEmailAsync(string recipientEmail, string recipientName, string token,
            CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private sealed class FakeRedis : HttpMessageHandler
    {
        public Dictionary<string, string> Values { get; } = [];
        public HashSet<string> FailNextDeleteOf { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var command = await request.Content!.ReadFromJsonAsync<string[]>(cancellationToken) ?? throw new InvalidOperationException();
            var key = command[1];
            if (command[0] == "DEL" && command.Skip(1).Any(FailNextDeleteOf.Contains))
            {
                FailNextDeleteOf.Clear();
                return new HttpResponseMessage(HttpStatusCode.ServiceUnavailable);
            }

            object? result = command[0] switch
            {
                "GET" => Values.GetValueOrDefault(key),
                "SET" => Store(key, command[2]),
                "EXISTS" => Values.ContainsKey(key) ? 1 : 0,
                "DEL" => command.Skip(1).Count(Values.Remove),
                _ => throw new InvalidOperationException($"Unexpected Redis command: {command[0]}"),
            };
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = JsonContent.Create(new { result }) };
        }

        private string Store(string key, string value)
        {
            Values[key] = value;
            return "OK";
        }
    }

    private sealed class ResetCleanupFailure
    {
        public bool Induce { get; set; }
        public int Attempts { get; private set; }

        public void ThrowIfInduced()
        {
            if (!Induce)
                return;
            Attempts++;
            throw new DbUpdateException("Unexpected storage failure during cleanup.");
        }
    }

    private sealed class RejectCleanupSave(ResetCleanupFailure failure) : SaveChangesInterceptor
    {
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData,
            InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            failure.ThrowIfInduced();
            return ValueTask.FromResult(result);
        }
    }

    private sealed class RejectCleanupCommand(ResetCleanupFailure failure) : DbCommandInterceptor
    {
        public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(DbCommand command, CommandEventData eventData,
            InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (eventData.CommandSource == CommandSource.ExecuteUpdate)
                failure.ThrowIfInduced();
            return ValueTask.FromResult(result);
        }
    }
}
