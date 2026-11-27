using System.ComponentModel.DataAnnotations;
using System.Data.Common;
using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
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
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
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
    private const string PostgresConnectionVariable = "CLOUDBOOK_AUTH_TEST_POSTGRES";
    private static readonly string CurrentPasswordHash = BCrypt.Net.BCrypt.HashPassword(CurrentPassword, workFactor: 4);

    private readonly ResetCleanupFailure resetCleanupFailure = new();
    private readonly DbContextOptions<AppDbContext> options;
    private readonly bool usesPostgres;
    private readonly FakeEmail email = new();
    private readonly FakeRedis redis = new();
    private readonly HttpClient redisClient;
    private readonly RedisService redisService;
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
        var testConnectionString = Environment.GetEnvironmentVariable(PostgresConnectionVariable);
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
        redisService = new RedisService(redisClient, configuration);
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

    [Theory]
    [InlineData("redis-http")]
    [InlineData("redis-timeout")]
    [InlineData("redis-cancellation")]
    [InlineData("redis-json")]
    [InlineData("redis-operation")]
    [InlineData("db-npgsql")]
    [InlineData("db-timeout")]
    [InlineData("db-cancellation")]
    [InlineData("db-task-cancellation")]
    [InlineData("db-wrapped-npgsql")]
    [InlineData("db-wrapped-timeout")]
    [InlineData("db-wrapped-socket")]
    public async Task AccessTokenValidation_distinguishes_dependency_outages(string failure)
    {
        var access = await IssueLiveAccessAsync();
        Exception outage = failure switch
        {
            "redis-http" => new HttpRequestException("Dependency detail"),
            "redis-timeout" or "db-timeout" => new TimeoutException("Dependency detail"),
            "redis-cancellation" or "db-task-cancellation" => new TaskCanceledException("Dependency detail"),
            "redis-json" => new JsonException("Dependency detail"),
            "redis-operation" => new InvalidOperationException("Dependency detail"),
            "db-npgsql" => new NpgsqlException("Dependency detail"),
            "db-cancellation" => new OperationCanceledException("Dependency detail"),
            "db-wrapped-npgsql" => new InvalidOperationException("Dependency detail", new NpgsqlException("Connection failed")),
            "db-wrapped-timeout" => new InvalidOperationException("Dependency detail", new TimeoutException()),
            "db-wrapped-socket" => new InvalidOperationException("Dependency detail", new SocketException()),
            _ => throw new ArgumentException("Unknown failure scenario.", nameof(failure)),
        };
        var databaseOptions = options;
        if (failure.StartsWith("redis-", StringComparison.Ordinal))
            redis.ExistsFailure = outage;
        else
            databaseOptions = CreateUnavailableDatabaseOptions(outage);

        var exception = await Assert.ThrowsAsync<ServiceUnavailableException>(() =>
            ValidateAccessAsync(access, databaseOptions: databaseOptions));
        Assert.Same(outage, failure == "db-timeout" ? exception.InnerException?.InnerException : exception.InnerException);
        Assert.DoesNotContain("Dependency detail", exception.Message);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task AccessTokenValidation_propagates_client_abort(bool duringRedisLookup)
    {
        var access = await IssueLiveAccessAsync();
        using var abort = new CancellationTokenSource();
        var databaseOptions = options;
        if (duringRedisLookup)
        {
            redis.ExistsFailure = new OperationCanceledException(abort.Token);
            redis.BeforeExists = abort.Cancel;
        }
        else
        {
            databaseOptions = CreateUnavailableDatabaseOptions(new OperationCanceledException(abort.Token), abort.Cancel);
        }

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            ValidateAccessAsync(access, databaseOptions: databaseOptions, cancellationToken: abort.Token));
        Assert.True(abort.IsCancellationRequested);
    }

    [Theory]
    [InlineData("healthy", HttpStatusCode.OK)]
    [InlineData("redis", HttpStatusCode.ServiceUnavailable)]
    [InlineData("postgres", HttpStatusCode.ServiceUnavailable)]
    [InlineData("revoked", HttpStatusCode.Unauthorized)]
    [InlineData("missing-jti", HttpStatusCode.Unauthorized)]
    [InlineData("invalid-jti", HttpStatusCode.Unauthorized)]
    [InlineData("revoked-session", HttpStatusCode.Unauthorized)]
    [InlineData("expired-session", HttpStatusCode.Unauthorized)]
    [InlineData("inactive-employee", HttpStatusCode.Unauthorized)]
    [InlineData("locked-employee", HttpStatusCode.Unauthorized)]
    [InlineData("temporarily-locked-employee", HttpStatusCode.Unauthorized)]
    [InlineData("changed-role", HttpStatusCode.Unauthorized)]
    public async Task AccessTokenValidation_http_pipeline_preserves_cookies(string state, HttpStatusCode expectedStatus)
    {
        await SeedEmployeeAsync();
        await using var db = new AppDbContext(options);
        var login = await LoginAsync(CreateService(db));
        var access = login.AccessToken;
        var accessJti = ReadJwt(access).Id;
        switch (state)
        {
            case "redis":
                redis.ExistsFailure = new HttpRequestException("Simulated Redis failure");
                break;
            case "revoked":
                await tokenStore.RevokeAccessAsync(accessJti);
                break;
            case "missing-jti":
            case "invalid-jti":
                var original = ReadJwt(access);
                var claims = original.Claims.Where(claim => claim.Type != JwtRegisteredClaimNames.Jti).ToList();
                if (state == "invalid-jti")
                    claims.Add(new Claim(JwtRegisteredClaimNames.Jti, "not-a-valid-jti"));
                access = new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(claims: claims,
                    signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(AccessSecret)),
                        SecurityAlgorithms.HmacSha256)));
                break;
            case "revoked-session":
                (await db.EmployeeSessions.SingleAsync()).RevokedAt = DateTime.UtcNow;
                break;
            case "expired-session":
                (await db.EmployeeSessions.SingleAsync()).ExpiresAt = DateTime.UtcNow.AddMinutes(-1);
                break;
            case "inactive-employee":
                (await db.Employees.SingleAsync()).Status = EmployeeStatus.REVOKED;
                break;
            case "locked-employee":
                (await db.Employees.SingleAsync()).Status = EmployeeStatus.LOCKED;
                break;
            case "temporarily-locked-employee":
                (await db.Employees.SingleAsync()).LockoutEndUtc = DateTime.UtcNow.AddMinutes(5);
                break;
            case "changed-role":
                (await db.Roles.SingleAsync()).RoleName = RoleName.INVENTORY_MANAGER;
                break;
        }
        await db.SaveChangesAsync();

        var databaseOptions = state == "postgres"
            ? CreateUnavailableDatabaseOptions(new NpgsqlException("Simulated PostgreSQL failure"))
            : options;
        await AssertAccessPipelineAsync(access, databaseOptions, expectedStatus);
    }

    [PostgresFact]
    public async Task AccessTokenValidation_http_pipeline_returns_503_when_only_employee_read_fails()
    {
        await SeedEmployeeAsync();
        await using var db = new AppDbContext(options);
        var login = await LoginAsync(CreateService(db));
        var failure = new RejectEmployeeLookup();
        var databaseOptions = new DbContextOptionsBuilder<AppDbContext>(options).AddInterceptors(failure).Options;

        await AssertAccessPipelineAsync(login.AccessToken, databaseOptions, HttpStatusCode.ServiceUnavailable);

        Assert.Equal(1, failure.CompletedSessionReads);
        Assert.Equal(1, failure.FailedEmployeeReads);
    }

    private async Task AssertAccessPipelineAsync(string access, DbContextOptions<AppDbContext> databaseOptions,
        HttpStatusCode expectedStatus)
    {
        var builder = WebApplication.CreateBuilder();
        var tokenValidationCalls = 0;
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Services.AddProblemDetails();
        builder.Services.AddExceptionHandler<ApiHandlerException>();
        builder.Services.AddSingleton(tokenStore);
        builder.Services.AddScoped(_ => new AppDbContext(databaseOptions));
        builder.Services.AddSingleton(TimeProvider.System);
        builder.Services.AddScoped<AccessTokenValidation>();
        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(jwt =>
        {
            jwt.MapInboundClaims = false;
            jwt.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(AccessSecret)),
                ValidIssuer = configuration["ApiSettings:Issuer"],
                ValidAudience = configuration["ApiSettings:Audience"],
            };
            jwt.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    context.Token = AuthTokenSelector.Select(context.Request, new AuthCookieSettings().AccessCookieName).Token;
                    return Task.CompletedTask;
                },
                OnTokenValidated = context =>
                {
                    Interlocked.Increment(ref tokenValidationCalls);
                    return context.HttpContext.RequestServices.GetRequiredService<AccessTokenValidation>().ValidateAsync(context);
                },
            };
        });
        builder.Services.AddAuthorization();
        await using var app = builder.Build();
        app.UseExceptionHandler(new ExceptionHandlerOptions { AllowStatusCode404Response = true });
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapGet("/api/auth/profile", () => Results.Ok()).RequireAuthorization();
        await app.StartAsync();

        using var client = new HttpClient { BaseAddress = new Uri(app.Urls.Single()) };
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/profile");
        request.Headers.Add("Cookie", $"{new AuthCookieSettings().AccessCookieName}={access}");
        using var response = await client.SendAsync(request);
        Assert.Equal(1, tokenValidationCalls);
        Assert.Equal(expectedStatus, response.StatusCode);
        Assert.False(response.Headers.Contains("Set-Cookie"));
        if (expectedStatus == HttpStatusCode.ServiceUnavailable)
        {
            Assert.Empty(response.Headers.WwwAuthenticate);
            var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal("Token state is temporarily unavailable.", payload.GetProperty("message").GetString());
        }
    }

    [Fact]
    public async Task Email_throttle_shares_normalized_address_and_uses_a_fixed_window()
    {
        await SeedEmployeeAsync(EmployeeStatus.PENDING_OTP);
        await using var db = new AppDbContext(options);
        var controller = CreateController(db, IPAddress.Loopback);
        var windowStart = redis.UtcNow;

        Assert.IsType<CreatedResult>(await controller.Register(RegisterEmail($" {Email.ToUpperInvariant()} ")));
        redis.UtcNow = windowStart.AddMinutes(5);
        Assert.IsType<NoContentResult>(await controller.ResendVerification(new ResendVerificationRequest { Email = Email }));
        Assert.Equal(2, email.VerificationAttempts);

        var employee = await db.Employees.SingleAsync();
        employee.Status = EmployeeStatus.ACTIVE;
        await db.SaveChangesAsync();
        Assert.IsType<NoContentResult>(await controller.RequestPasswordReset(ResetRequest()));
        var previousHash = await GetResetHashAsync();
        Assert.NotNull(previousHash);

        redis.UtcNow = windowStart.AddMinutes(15).AddMilliseconds(-1);
        Assert.IsType<NoContentResult>(await controller.RequestPasswordReset(ResetRequest(Email.ToUpperInvariant())));
        Assert.Equal(1, email.ResetAttempts);
        Assert.Equal(previousHash, await GetResetHashAsync());
        Assert.Equal(4, redis.CounterValues[RedisKeyManager.ForEmailThrottleByAddress(Email)].Count);

        redis.UtcNow = windowStart.AddMinutes(15);
        Assert.IsType<NoContentResult>(await controller.RequestPasswordReset(ResetRequest()));
        Assert.Equal(2, email.ResetAttempts);
        Assert.NotEqual(previousHash, await GetResetHashAsync());
    }

    [Theory]
    [InlineData("register")]
    [InlineData("verification-resends")]
    public async Task Email_throttle_suppresses_each_pending_verification_entrypoint(string entrypoint)
    {
        await SeedEmployeeAsync(EmployeeStatus.PENDING_OTP);
        await using var db = new AppDbContext(options);
        var controller = CreateController(db, IPAddress.Loopback);
        Assert.IsType<CreatedResult>(await controller.Register(RegisterEmail($" {Email.ToUpperInvariant()} ")));
        for (var count = 0; count < 2; count++)
            Assert.IsType<NoContentResult>(await controller.ResendVerification(new ResendVerificationRequest { Email = Email }));
        Assert.Equal(3, email.VerificationAttempts);
        var priorTokens = redis.Values.ToArray();

        if (entrypoint == "register")
        {
            var result = Assert.IsType<CreatedResult>(await controller.Register(RegisterEmail(Email)));
            Assert.Equal(new RegisterResponse(Email, "New Employee"), result.Value);
        }
        else
        {
            Assert.IsType<NoContentResult>(await controller.ResendVerification(new ResendVerificationRequest { Email = Email }));
        }

        Assert.Equal(3, email.VerificationAttempts);
        Assert.Equal(priorTokens, redis.Values.ToArray());
        Assert.Equal(EmployeeStatus.PENDING_OTP, (await db.Employees.SingleAsync()).Status);
    }

    [Fact]
    public async Task Email_throttle_checks_actual_ip_and_suppresses_all_three_endpoints_without_mutation()
    {
        configuration["AuthSecurity:EmailThrottleMaxPerIp"] = "2";
        await SeedEmployeeAsync(EmployeeStatus.PENDING_OTP, "pending@example.test");
        await SeedEmployeeAsync(addRole: false);
        await using var db = new AppDbContext(options);
        var controller = CreateController(db, IPAddress.Loopback);

        Assert.IsType<NoContentResult>(await controller.RequestPasswordReset(ResetRequest("missing@example.test")));
        Assert.IsType<NoContentResult>(await controller.ResendVerification(new ResendVerificationRequest { Email = "other@example.test" }));
        controller.Request.Headers["X-Forwarded-For"] = "203.0.113.50";

        var register = Assert.IsType<CreatedResult>(await controller.Register(RegisterEmail(" NEW@EXAMPLE.TEST ")));
        Assert.Equal(new RegisterResponse("new@example.test", "New Employee"), register.Value);
        Assert.IsType<NoContentResult>(await controller.ResendVerification(new ResendVerificationRequest { Email = "pending@example.test" }));
        Assert.IsType<NoContentResult>(await controller.RequestPasswordReset(ResetRequest()));
        Assert.Equal(0, email.VerificationAttempts);
        Assert.Equal(0, email.ResetAttempts);
        Assert.Null(await GetResetHashAsync());
        Assert.Equal(2, await db.Employees.CountAsync());
        Assert.Empty(redis.Values);
        Assert.Equal(5, redis.CounterValues[RedisKeyManager.ForEmailThrottleByIp(IPAddress.Loopback.ToString())].Count);
        Assert.All(redis.CounterValues.Keys, key =>
        {
            Assert.DoesNotContain("@", key);
            Assert.DoesNotContain(IPAddress.Loopback.ToString(), key);
        });

        var otherClient = CreateController(db, IPAddress.IPv6Loopback);
        Assert.IsType<NoContentResult>(await otherClient.RequestPasswordReset(ResetRequest()));
        Assert.Equal(1, email.ResetAttempts);
    }

    [Theory]
    [InlineData("bad address@example.test", NewPassword, "Invalid email address")]
    [InlineData("user@blocked.test", NewPassword, "Email domain is not allowed")]
    [InlineData("new@example.test", "Replacement1234", "Password must be 12 to 128 characters and include an uppercase letter, a digit, and a special character.")]
    public async Task Email_throttle_preserves_register_400_for_each_single_validation_fault(string address,
        string password, string expectedMessage)
    {
        await using var db = new AppDbContext(options);
        var controller = CreateController(db, IPAddress.Loopback);
        redis.IncrementFailure = new TimeoutException();

        var error = await Assert.ThrowsAsync<BadRequestException>(() => controller.Register(RegisterEmail(address, password)));

        Assert.Equal(expectedMessage, error.Message);
        Assert.Equal(0, redis.IncrementAttempts);
    }

    [Fact]
    public async Task Email_throttle_preserves_register_409_for_valid_active_duplicate()
    {
        await SeedEmployeeAsync();
        await using var db = new AppDbContext(options);
        var controller = CreateController(db, IPAddress.Loopback);
        redis.IncrementFailure = new TimeoutException();

        await Assert.ThrowsAsync<ConflictException>(() => controller.Register(RegisterEmail($" {Email.ToUpperInvariant()} ")));
        Assert.Equal(0, redis.IncrementAttempts);
    }

    [Fact]
    public async Task Email_throttle_redis_failure_is_retryable_without_sending_or_mutating()
    {
        await SeedEmployeeAsync();
        await using var db = new AppDbContext(options);
        var controller = CreateController(db, IPAddress.Loopback);
        redis.IncrementFailure = new HttpRequestException("Simulated Redis failure");

        await Assert.ThrowsAsync<ServiceUnavailableException>(() => controller.Register(RegisterEmail("new@example.test")));
        await Assert.ThrowsAsync<ServiceUnavailableException>(() => controller.RequestPasswordReset(ResetRequest()));
        Assert.Equal(1, await db.Employees.CountAsync());
        Assert.Equal(0, email.VerificationAttempts);
        Assert.Equal(0, email.ResetAttempts);
        Assert.Null(await GetResetHashAsync());
    }

    [Fact]
    public async Task Pending_verification_resend_preserves_token_during_Redis_outage_and_can_retry()
    {
        var employeeId = await SeedEmployeeAsync(EmployeeStatus.PENDING_OTP);
        await using var db = new AppDbContext(options);
        var controller = CreateController(db, IPAddress.Loopback);
        var request = new ResendVerificationRequest { Email = Email };
        Assert.IsType<NoContentResult>(await controller.ResendVerification(request));
        Assert.Equal(1, email.VerificationAttempts);
        var tokenKey = RedisKeyManager.ForCurrentRegistrationVerification(employeeId);
        var previousToken = redis.Values[tokenKey];
        var outage = new HttpRequestException("Simulated Redis failure");
        redis.IncrementFailure = outage;

        var error = await Assert.ThrowsAsync<ServiceUnavailableException>(() => controller.ResendVerification(request));

        Assert.Same(outage, error.InnerException);
        Assert.Equal(1, email.VerificationAttempts);
        Assert.Equal(previousToken, redis.Values[tokenKey]);

        redis.IncrementFailure = null;
        Assert.IsType<NoContentResult>(await controller.ResendVerification(request));
        Assert.Equal(2, email.VerificationAttempts);
        Assert.NotEqual(previousToken, redis.Values[tokenKey]);
    }

    [Fact]
    public async Task Profile_update_persists_fields_and_audit()
    {
        var employeeId = await SeedEmployeeAsync();
        await using var db = new AppDbContext(options);
        var profile = await CreateService(db).UpdateProfileAsync(employeeId,
            new UpdateProfileRequest { FullName = "  Updated Employee  ", Phone = "0901234568" });
        Assert.Equal("Updated Employee", profile.FullName);
        Assert.Equal("0901234568", profile.Phone);

        await using var persisted = new AppDbContext(options);
        var employee = await persisted.Employees.SingleAsync();
        Assert.Equal(profile.FullName, employee.FullName);
        Assert.Equal(profile.Phone, employee.Phone);
        Assert.Equal("UPDATE_PROFILE", (await persisted.AuditLogs.SingleAsync()).Action);
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
    public async Task Authenticated_profile_requests_record_activity_at_most_once_per_minute()
    {
        var employeeId = await SeedEmployeeAsync();
        await using var db = new AppDbContext(options);
        var service = CreateService(db);
        var login = await LoginAsync(service);
        var accessJti = ReadJwt(login.AccessToken).Id;
        var clock = new TestTimeProvider(DateTimeOffset.FromUnixTimeSeconds(DateTimeOffset.UtcNow.ToUnixTimeSeconds()).UtcDateTime);
        var initialActivity = clock.UtcNow.AddMinutes(-2);
        var device = await db.EmployeeSessions.SingleAsync(item => item.AccessJti == accessJti);
        device.LastActiveAt = initialActivity;
        await db.SaveChangesAsync();

        Assert.Null((await ValidateAccessAsync(login.AccessToken, clock))?.Failure);
        Assert.Equal(clock.UtcNow, (await GetDeviceAsync(db, login)).LastActiveAt);

        var firstActivity = clock.UtcNow;
        clock.UtcNow = firstActivity.AddSeconds(59);
        Assert.Null((await ValidateAccessAsync(login.AccessToken, clock))?.Failure);
        await service.GetBrowserSessionAsync(accessJti, employeeId);
        Assert.Equal(firstActivity, (await GetDeviceAsync(db, login)).LastActiveAt);

        clock.UtcNow = firstActivity.AddMinutes(1);
        Assert.Null((await ValidateAccessAsync(login.AccessToken, clock))?.Failure);
        Assert.Equal(clock.UtcNow, (await GetDeviceAsync(db, login)).LastActiveAt);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Revoked_or_expired_device_sessions_are_rejected_without_recording_activity(bool revoked)
    {
        await SeedEmployeeAsync();
        await using var db = new AppDbContext(options);
        var login = await LoginAsync(CreateService(db));
        var accessJti = ReadJwt(login.AccessToken).Id;
        var now = DateTime.UtcNow;
        var device = await db.EmployeeSessions.SingleAsync(item => item.AccessJti == accessJti);
        device.LastActiveAt = now.AddMinutes(-2);
        if (revoked)
            device.RevokedAt = now.AddMinutes(-1);
        else
            device.ExpiresAt = now.AddMinutes(-1);
        await db.SaveChangesAsync();
        var originalActivity = (await GetDeviceAsync(db, login)).LastActiveAt;

        Assert.True(await tokenStore.IsActiveAsync(accessJti, TokenType.ACCESS));
        Assert.Equal("Session has been revoked or is invalid.",
            (await ValidateAccessAsync(login.AccessToken, new TestTimeProvider(now)))?.Failure?.Message);
        Assert.Equal(originalActivity, (await GetDeviceAsync(db, login)).LastActiveAt);
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

    private static RegisterRequest RegisterEmail(string address, string password = NewPassword) =>
        new() { Email = address, FullName = "  New Employee  ", Phone = "0901234567", Password = password };

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

    private async Task<Guid> SeedEmployeeAsync(EmployeeStatus status = EmployeeStatus.ACTIVE, string address = Email, bool addRole = true)
    {
        await using var db = new AppDbContext(options);
        var employee = new EmployeeModel
        {
            Email = address, FullName = "Test Employee", Phone = "0901234567", Password = CurrentPasswordHash,
            Role = addRole ? new RoleModel { RoleName = RoleName.CASHIER } : await db.Roles.SingleAsync(), Status = status,
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
            new UploadIntentService(db, cloudinary, audit), cloudinary, configuration, redisService);
    }

    private AuthController CreateController(AppDbContext db, IPAddress? clientIp = null)
    {
        var settings = new AuthCookieSettings();
        var httpContext = new DefaultHttpContext();
        httpContext.Connection.RemoteIpAddress = clientIp;
        return new AuthController(CreateService(db), new AuthCookieService(settings), settings)
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext },
        };
    }

    private async Task<string> IssueLiveAccessAsync()
    {
        var employeeId = Guid.NewGuid();
        var access = tokenService.GenerateToken(employeeId, TokenType.ACCESS, [new Claim("role", nameof(RoleName.CASHIER))]);
        await tokenStore.StoreLoginAsync(access, tokenService.GenerateToken(employeeId, TokenType.REFRESH));
        return access;
    }

    private static DbContextOptions<AppDbContext> CreateUnavailableDatabaseOptions(Exception outage, Action? beforeThrow = null) =>
        new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=127.0.0.1;Database=intercepted;Username=intercepted;Pooling=false")
            .AddInterceptors(new RejectConnection(outage, beforeThrow)).Options;

    private async Task<AuthenticateResult?> ValidateAccessAsync(string accessToken, TimeProvider? clock = null,
        DbContextOptions<AppDbContext>? databaseOptions = null, CancellationToken cancellationToken = default)
    {
        await using var db = new AppDbContext(databaseOptions ?? options);
        await using var services = new ServiceCollection().AddSingleton(db).AddSingleton(tokenStore).BuildServiceProvider();
        var scheme = new AuthenticationScheme(JwtBearerDefaults.AuthenticationScheme, null, typeof(JwtBearerHandler));
        var httpContext = new DefaultHttpContext { RequestServices = services, RequestAborted = cancellationToken };
        httpContext.Request.Method = HttpMethods.Get;
        httpContext.Request.Path = "/api/auth/profile";
        var context = new TokenValidatedContext(httpContext, scheme, new JwtBearerOptions())
        {
            Principal = new ClaimsPrincipal(new ClaimsIdentity(ReadJwt(accessToken).Claims, scheme.Name)),
        };
        var validation = new AccessTokenValidation(clock ?? TimeProvider.System, NullLogger<AccessTokenValidation>.Instance);
        await validation.ValidateAsync(context);
        return context.Result;
    }

    private sealed class TestTimeProvider(DateTime utcNow) : TimeProvider
    {
        public DateTime UtcNow { get; set; } = utcNow;

        public override DateTimeOffset GetUtcNow() => UtcNow;
    }

    private sealed class FakeEmail() : EmailService(Options.Create(new EmailSettings()), NullLogger<EmailService>.Instance)
    {
        public Func<string, Task> DeliverReset { get; set; } = _ => Task.CompletedTask;
        public int ResetAttempts { get; private set; }
        public int VerificationAttempts { get; private set; }
        public string? LastResetToken { get; private set; }

        public override Task SendPasswordResetEmailAsync(string recipientEmail, string recipientName, string token,
            CancellationToken cancellationToken = default)
        {
            ResetAttempts++;
            LastResetToken = token;
            return DeliverReset(token);
        }

        public override Task SendAccountVerificationEmailAsync(string recipientEmail, string recipientName, string token,
            CancellationToken cancellationToken = default)
        {
            VerificationAttempts++;
            return Task.CompletedTask;
        }
    }

    private sealed class FakeRedis : HttpMessageHandler
    {
        public Dictionary<string, string> Values { get; } = [];
        public HashSet<string> FailNextDeleteOf { get; } = [];
        public Dictionary<string, (long Count, DateTimeOffset ExpiresAt)> CounterValues { get; } = [];
        public DateTimeOffset UtcNow { get; set; } = DateTimeOffset.UnixEpoch;
        public Exception? ExistsFailure { get; set; }
        public Action? BeforeExists { get; set; }
        public Exception? IncrementFailure { get; set; }
        public int IncrementAttempts { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var command = await request.Content!.ReadFromJsonAsync<string[]>(cancellationToken) ?? throw new InvalidOperationException();
            var key = command[1];
            if (command[0] == "EXISTS" && ExistsFailure is { } existsFailure)
            {
                BeforeExists?.Invoke();
                throw existsFailure;
            }
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
                "EVAL" => IncrementCounter(command),
                _ => throw new InvalidOperationException($"Unexpected Redis command: {command[0]}"),
            };
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = JsonContent.Create(new { result }) };
        }

        private long IncrementCounter(string[] command)
        {
            IncrementAttempts++;
            if (IncrementFailure is { } incrementFailure)
                throw incrementFailure;
            Assert.Contains("'INCR'", command[1]);
            Assert.Contains("'PEXPIRE'", command[1]);
            Assert.Equal("1", command[2]);
            var key = command[3];
            var counter = CounterValues.GetValueOrDefault(key);
            if (counter.ExpiresAt <= UtcNow)
                counter = (0, UtcNow.AddMilliseconds(double.Parse(command[4], CultureInfo.InvariantCulture)));
            counter.Count++;
            CounterValues[key] = counter;
            return counter.Count;
        }

        private string Store(string key, string value)
        {
            Values[key] = value;
            return "OK";
        }
    }

    private sealed class PostgresFactAttribute : FactAttribute
    {
        public PostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(PostgresConnectionVariable)))
                Skip = $"Set {PostgresConnectionVariable} to run this PostgreSQL test.";
        }
    }

    private sealed class RejectEmployeeLookup : DbCommandInterceptor
    {
        public int CompletedSessionReads { get; private set; }
        public int FailedEmployeeReads { get; private set; }

        public override ValueTask<DbDataReader> ReaderExecutedAsync(DbCommand command, CommandExecutedEventData eventData,
            DbDataReader result, CancellationToken cancellationToken = default)
        {
            if (command.CommandText.Contains("FROM employee_sessions AS ", StringComparison.Ordinal))
                CompletedSessionReads++;
            return ValueTask.FromResult(result);
        }

        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command,
            CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            if (command.CommandText.Contains("FROM employee AS ", StringComparison.Ordinal))
            {
                FailedEmployeeReads++;
                throw new NpgsqlException("Simulated employee lookup outage.", new TimeoutException());
            }
            return ValueTask.FromResult(result);
        }
    }

    private sealed class RejectConnection(Exception outage, Action? beforeThrow) : DbConnectionInterceptor
    {
        public override ValueTask<InterceptionResult> ConnectionOpeningAsync(DbConnection connection,
            ConnectionEventData eventData, InterceptionResult result, CancellationToken cancellationToken = default)
        {
            beforeThrow?.Invoke();
            return ValueTask.FromException<InterceptionResult>(outage);
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
