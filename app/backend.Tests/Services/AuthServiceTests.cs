using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
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
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace backend.Tests.Services;

public class AuthServiceTests
{
    private const string VerifyRegisterSecret = "test-verify-register-secret-key-32-characters";
    private const string ResetPasswordSecret = "test-reset-password-secret-key-32-characters";

    [Fact]
    public async Task Register_PreservesBadRequestException_WhenEmailDomainIsNotAllowed()
    {
        await using var connection = await OpenConnectionAsync();
        var dbOptions = CreateDatabaseOptions(connection);
        await using var dbContext = new AppDbContext(dbOptions);
        await dbContext.Database.EnsureCreatedAsync();

        var configuration = new ConfigurationManager
        {
            ["AppSettings:AllowedEmailDomains"] = "@cloud.io"
        };
        var authService = CreateAuthService(dbContext, configuration);

        await Assert.ThrowsAsync<BadRequestException>(() => authService.Register(CreateRegistrationRequest("cashier@example.com")));
    }

    [Fact]
    public async Task Login_ReturnsGenericUnauthorizedError_WhenCredentialsAreInvalid()
    {
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateDatabaseOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();

        var authService = CreateAuthService(dbContext, new ConfigurationManager());

        await Assert.ThrowsAsync<UnauthorizedException>(() =>
            authService.Login(new LoginRequest("missing@example.com", "TestPassword123!")));
    }

    [Fact]
    public async Task Login_FindsAnActiveAccount_WhenEmailHasDifferentCasingOrWhitespace()
    {
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateDatabaseOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.ACTIVE);
        const string password = "TestPassword123!";
        employee.Password = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
        await dbContext.SaveChangesAsync();

        var authService = CreateAuthService(dbContext, CreateAuthenticationConfiguration());

        var response = await authService.Login(new LoginRequest("  CASHIER@CLOUD.IO  ", password));

        Assert.False(string.IsNullOrWhiteSpace(response.AccessToken));
    }

    [Fact]
    public async Task Login_TemporarilyLocksAnAccountAfterTheConfiguredNumberOfFailedAttempts()
    {
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateDatabaseOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.ACTIVE);
        const string password = "TestPassword123!";
        employee.Password = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
        await dbContext.SaveChangesAsync();

        var configuration = CreateAuthenticationConfiguration();
        configuration["AuthSecurity:MaxFailedLoginAttempts"] = "2";
        configuration["AuthSecurity:LockoutDurationMinutes"] = "15";
        var authService = CreateAuthService(dbContext, configuration);

        await Assert.ThrowsAsync<UnauthorizedException>(() =>
            authService.Login(new LoginRequest(employee.Email, "wrong-password")));
        var locked = await Assert.ThrowsAsync<ForbiddenException>(() =>
            authService.Login(new LoginRequest(employee.Email, "wrong-password")));

        Assert.Equal("Account is temporarily locked. Try again later.", locked.Message);
        await Assert.ThrowsAsync<ForbiddenException>(() =>
            authService.Login(new LoginRequest(employee.Email, password)));
    }

    [Fact]
    public async Task Login_ClearsAnExpiredTemporaryLock_WhenCredentialsAreCorrect()
    {
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateDatabaseOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.ACTIVE);
        const string password = "TestPassword123!";
        employee.Password = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
        employee.FailedLoginAttempts = 5;
        employee.LockoutEndUtc = DateTime.UtcNow.AddMinutes(-1);
        await dbContext.SaveChangesAsync();

        var response = await CreateAuthService(dbContext, CreateAuthenticationConfiguration())
            .Login(new LoginRequest(employee.Email, password));

        Assert.False(string.IsNullOrWhiteSpace(response.AccessToken));
        Assert.Equal(0, employee.FailedLoginAttempts);
        Assert.Null(employee.LockoutEndUtc);
    }

    [Fact]
    public async Task Login_IssuesNewTokens_AfterAnEarlierAccessTokenHasExpired()
    {
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateDatabaseOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.ACTIVE);
        const string password = "TestPassword123!";
        employee.Password = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
        await dbContext.SaveChangesAsync();

        var configuration = CreateAuthenticationConfiguration();
        var expiredToken = new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(
            claims:
            [
                new Claim(JwtRegisteredClaimNames.Sub, employee.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim("token_use", TokenType.ACCESS.ToString())
            ],
            expires: DateTime.UtcNow.AddSeconds(-1),
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:AccessSecret:Key"]!)),
                SecurityAlgorithms.HmacSha256)));

        Assert.Throws<SecurityTokenExpiredException>(() => new TokenService(configuration).ValidateAccessToken(expiredToken));
        var response = await CreateAuthService(dbContext, configuration).Login(new LoginRequest(employee.Email, password));

        Assert.False(string.IsNullOrWhiteSpace(response.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(response.RefreshToken));
    }

    [Fact]
    public async Task Login_RejectsAnAccountThatHasNotBeenVerified()
    {
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateDatabaseOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.PENDING_OTP);
        const string password = "TestPassword123!";
        employee.Password = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
        await dbContext.SaveChangesAsync();

        var authService = CreateAuthService(dbContext, CreateAuthenticationConfiguration());

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            authService.Login(new LoginRequest(employee.Email, password)));
    }

    [Fact]
    public async Task Register_RollsBackEmployee_WhenActivationTokenGenerationFails()
    {
        await using var connection = await OpenConnectionAsync();
        var dbOptions = CreateDatabaseOptions(connection);
        await SeedCashierRole(dbOptions);

        var configuration = new ConfigurationManager
        {
            ["AppSettings:AllowedEmailDomains"] = "@example.com"
        };
        var request = CreateRegistrationRequest("cashier@example.com");

        await using (var dbContext = new AppDbContext(dbOptions))
        {
            var authService = CreateAuthService(dbContext, configuration);

            await Assert.ThrowsAsync<InvalidOperationException>(() => authService.Register(request));
        }

        await using var verificationContext = new AppDbContext(dbOptions);
        Assert.False(await verificationContext.Employees.AnyAsync(employee => employee.Email == request.Email));
    }

    [Fact]
    public async Task Register_PersistsPendingEmployee_WhenEmailDeliveryFails_SoItCanBeRetried()
    {
        await using var connection = await OpenConnectionAsync();
        var dbOptions = CreateDatabaseOptions(connection);
        await SeedCashierRole(dbOptions);
        var request = CreateRegistrationRequest("retry@cloud.io");

        await using (var dbContext = new AppDbContext(dbOptions))
        {
            var authService = CreateAuthService(
                dbContext,
                CreateAuthenticationConfiguration(),
                new ThrowingEmailService());

            await Assert.ThrowsAsync<InvalidOperationException>(() => authService.Register(request));
        }

        await using var verificationContext = new AppDbContext(dbOptions);
        var employee = await verificationContext.Employees.SingleAsync(item => item.Email == request.Email);
        Assert.Equal(EmployeeStatus.PENDING_OTP, employee.Status);
    }

    [Fact]
    public async Task Verify_ActivatesPendingEmployee_WhenTokenIsValid()
    {
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateDatabaseOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.PENDING_OTP);
        var configuration = CreateVerifyConfiguration(VerifyRegisterSecret);
        var tokenService = new TokenService(configuration);
        var tokenStore = CreateTokenStore(configuration, new FakeRedisHandler());
        var authService = CreateAuthService(dbContext, configuration, new NoOpEmailService(), tokenStore);
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
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateDatabaseOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.PENDING_OTP);
        var configuration = CreateVerifyConfiguration(VerifyRegisterSecret);
        var authService = CreateAuthService(dbContext, configuration);
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
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateDatabaseOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.LOCKED);
        var configuration = CreateVerifyConfiguration(VerifyRegisterSecret);
        var tokenService = new TokenService(configuration);
        var tokenStore = CreateTokenStore(configuration, new FakeRedisHandler());
        var authService = CreateAuthService(dbContext, configuration, new NoOpEmailService(), tokenStore);
        var token = tokenService.GenerateToken(
            employee.Id,
            TokenType.VERIFY_REGISTER,
            [new Claim("email", employee.Email)]);
        await tokenStore.StoreRegistrationVerificationAsync(token);

        await Assert.ThrowsAsync<ForbiddenException>(() => authService.Verify(token));

        Assert.Equal(EmployeeStatus.LOCKED, employee.Status);
    }

    [Fact]
    public async Task Register_SendsVerificationEmail_WithoutExposingTheTokenInTheResponse()
    {
        await using var connection = await OpenConnectionAsync();
        var dbOptions = CreateDatabaseOptions(connection);
        await SeedCashierRole(dbOptions);
        await using var dbContext = new AppDbContext(dbOptions);
        var emailService = new RecordingEmailService();
        var authService = CreateAuthService(dbContext, CreateAuthenticationConfiguration(), emailService);
        var request = CreateRegistrationRequest("new.cashier@cloud.io");

        var response = await authService.Register(request);

        Assert.Equal(request.Email, response.Email);
        Assert.False(JsonSerializer.Serialize(response).Contains("\"Activation\"", StringComparison.Ordinal));
        var email = Assert.Single(emailService.VerificationEmails);
        Assert.Equal(request.Email, email.RecipientEmail);
        Assert.Equal(request.FullName, email.RecipientName);
        Assert.False(string.IsNullOrWhiteSpace(email.Token));
    }

    [Fact]
    public async Task Register_Verify_ThenLogin_ReturnsTokens()
    {
        await using var connection = await OpenConnectionAsync();
        var dbOptions = CreateDatabaseOptions(connection);
        await SeedCashierRole(dbOptions);
        await using var dbContext = new AppDbContext(dbOptions);
        var emailService = new RecordingEmailService();
        var authService = CreateAuthService(dbContext, CreateAuthenticationConfiguration(), emailService);
        var request = CreateRegistrationRequest("login.after.verify@cloud.io");

        await authService.Register(request);
        await authService.Verify(Assert.Single(emailService.VerificationEmails).Token);
        var response = await authService.Login(new LoginRequest(request.Email, request.Password));

        Assert.False(string.IsNullOrWhiteSpace(response.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(response.RefreshToken));
    }

    [Fact]
    public async Task RequestPasswordReset_DoesNotDiscloseUnknownEmail_AndSendsForAnActiveAccount()
    {
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateDatabaseOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.ACTIVE);
        var emailService = new RecordingEmailService();
        var authService = CreateAuthService(dbContext, CreateAuthenticationConfiguration(), emailService);

        await authService.RequestPasswordReset(new ForgotPasswordRequest { Email = "missing@cloud.io" });
        await authService.RequestPasswordReset(new ForgotPasswordRequest { Email = employee.Email });

        var email = Assert.Single(emailService.PasswordResetEmails);
        Assert.Equal(employee.Email, email.RecipientEmail);
        Assert.False(string.IsNullOrWhiteSpace(email.Token));
    }

    [Fact]
    public async Task ResetPassword_ChangesPassword_AndCannotReuseTheLink()
    {
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateDatabaseOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.ACTIVE);
        var emailService = new RecordingEmailService();
        var authService = CreateAuthService(dbContext, CreateAuthenticationConfiguration(), emailService);
        const string newPassword = "ANewPassword123!";

        await authService.RequestPasswordReset(new ForgotPasswordRequest { Email = employee.Email });
        var token = Assert.Single(emailService.PasswordResetEmails).Token;
        await authService.ResetPassword(new ResetPasswordRequest
        {
            Token = token,
            NewPassword = newPassword
        });

        Assert.True(BCrypt.Net.BCrypt.Verify(newPassword, employee.Password));
        await Assert.ThrowsAsync<UnauthorizedException>(() => authService.ResetPassword(new ResetPasswordRequest
        {
            Token = token,
            NewPassword = newPassword
        }));
    }

    [Fact]
    public async Task ResetPassword_RejectsAnAccountVerificationToken()
    {
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateDatabaseOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.ACTIVE);
        var configuration = CreateAuthenticationConfiguration();
        var tokenService = new TokenService(configuration);
        var authService = CreateAuthService(dbContext, configuration);
        var verificationToken = tokenService.GenerateToken(
            employee.Id,
            TokenType.VERIFY_REGISTER,
            [new Claim("email", employee.Email)]);

        await Assert.ThrowsAsync<UnauthorizedException>(() => authService.ResetPassword(new ResetPasswordRequest
        {
            Token = verificationToken,
            NewPassword = "ANewPassword123!"
        }));
    }

    [Fact]
    public async Task Login_StoresBothJtis_AndLogoutRevokesThem()
    {
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateDatabaseOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.ACTIVE);
        employee.Password = BCrypt.Net.BCrypt.HashPassword("TestPassword123!");
        await dbContext.SaveChangesAsync();

        var configuration = CreateAuthenticationConfiguration();
        var tokenStore = CreateTokenStore(configuration, new FakeRedisHandler());
        var authService = CreateAuthService(dbContext, configuration, new NoOpEmailService(), tokenStore);

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
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateDatabaseOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.PENDING_OTP);
        var configuration = CreateVerifyConfiguration(VerifyRegisterSecret);
        var tokenService = new TokenService(configuration);
        var authService = CreateAuthService(dbContext, configuration);
        var token = tokenService.GenerateToken(
            employee.Id,
            TokenType.VERIFY_REGISTER,
            [new Claim("email", employee.Email)]);

        await Assert.ThrowsAsync<UnauthorizedException>(() => authService.Verify(token));
        Assert.Equal(EmployeeStatus.PENDING_OTP, employee.Status);
    }

    [Fact]
    public async Task Register_Again_InvalidatesPreviousVerificationToken()
    {
        await using var connection = await OpenConnectionAsync();
        var dbOptions = CreateDatabaseOptions(connection);
        await SeedCashierRole(dbOptions);
        await using var dbContext = new AppDbContext(dbOptions);
        var emailService = new RecordingEmailService();
        var authService = CreateAuthService(dbContext, CreateAuthenticationConfiguration(), emailService);
        var request = CreateRegistrationRequest("new@cloud.io");

        await authService.Register(request);
        await authService.Register(request);

        Assert.Equal(2, emailService.VerificationEmails.Count);
        await Assert.ThrowsAsync<UnauthorizedException>(() =>
            authService.Verify(emailService.VerificationEmails[0].Token));
        await authService.Verify(emailService.VerificationEmails[1].Token);

        var employee = await dbContext.Employees.SingleAsync(item => item.Email == request.Email);
        Assert.Equal(EmployeeStatus.ACTIVE, employee.Status);
    }

    [Fact]
    public async Task Register_StoresCurrentVerificationJti()
    {
        await using var connection = await OpenConnectionAsync();
        var dbOptions = CreateDatabaseOptions(connection);
        await SeedCashierRole(dbOptions);
        await using var dbContext = new AppDbContext(dbOptions);
        var configuration = CreateAuthenticationConfiguration();
        var tokenStore = CreateTokenStore(configuration, new FakeRedisHandler());
        var emailService = new RecordingEmailService();
        var authService = CreateAuthService(dbContext, configuration, emailService, tokenStore);

        await authService.Register(CreateRegistrationRequest("new@cloud.io"));

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(Assert.Single(emailService.VerificationEmails).Token);
        var employeeId = Guid.Parse(jwt.Subject);
        Assert.True(await tokenStore.IsRegistrationVerificationActiveAsync(employeeId, jwt.Id));
    }

    private static async Task<SqliteConnection> OpenConnectionAsync()
    {
        var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        return connection;
    }

    private static DbContextOptions<AppDbContext> CreateDatabaseOptions(SqliteConnection connection)
    {
        return new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;
    }

    private static RegisterRequest CreateRegistrationRequest(string email) => new()
    {
        Email = email,
        FullName = "New Cashier",
        Password = "TestPassword123!",
        Phone = "0123456789"
    };

    private static AuthService CreateAuthService(
        AppDbContext dbContext,
        ConfigurationManager configuration,
        IEmailService? emailService = null,
        TokenJtiStore? tokenStore = null)
    {
        return new AuthService(
            dbContext,
            new TokenService(configuration),
            new SettingService(configuration),
            emailService ?? new NoOpEmailService(),
            tokenStore ?? CreateTokenStore(configuration, new FakeRedisHandler()),
            configuration);
    }

    private static ConfigurationManager CreateVerifyConfiguration(string secret) => new()
    {
        ["Jwt:VerifyRegisterSecret:Key"] = secret
    };

    private static ConfigurationManager CreateAuthenticationConfiguration() => new()
    {
        ["AppSettings:AllowedEmailDomains"] = "@cloud.io",
        ["Jwt:AccessSecret:Key"] = "test-access-secret-key-at-least-32-characters",
        ["Jwt:RefreshSecret:Key"] = "test-refresh-secret-key-at-least-32-characters",
        ["Jwt:VerifyRegisterSecret:Key"] = VerifyRegisterSecret,
        ["Jwt:ResetPasswordSecret:Key"] = ResetPasswordSecret,
        ["ApiSettings:Issuer"] = "CloudianAPI",
        ["ApiSettings:Audience"] = "CloudianClient"
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

    private sealed class NoOpEmailService : IEmailService
    {
        public Task SendAccountVerificationEmailAsync(string recipientEmail, string recipientName, string token) => Task.CompletedTask;

        public Task SendPasswordResetEmailAsync(string recipientEmail, string recipientName, string token) => Task.CompletedTask;
    }

    private sealed class RecordingEmailService : IEmailService
    {
        public List<EmailRequest> VerificationEmails { get; } = [];
        public List<EmailRequest> PasswordResetEmails { get; } = [];

        public Task SendAccountVerificationEmailAsync(string recipientEmail, string recipientName, string token)
        {
            VerificationEmails.Add(new EmailRequest(recipientEmail, recipientName, token));
            return Task.CompletedTask;
        }

        public Task SendPasswordResetEmailAsync(string recipientEmail, string recipientName, string token)
        {
            PasswordResetEmails.Add(new EmailRequest(recipientEmail, recipientName, token));
            return Task.CompletedTask;
        }
    }

    private sealed class ThrowingEmailService : IEmailService
    {
        public Task SendAccountVerificationEmailAsync(string recipientEmail, string recipientName, string token)
            => throw new InvalidOperationException("SMTP is unavailable");

        public Task SendPasswordResetEmailAsync(string recipientEmail, string recipientName, string token)
            => throw new InvalidOperationException("SMTP is unavailable");
    }

    private sealed record EmailRequest(string RecipientEmail, string RecipientName, string Token);

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
