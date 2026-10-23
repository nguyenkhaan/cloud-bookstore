using System.Security.Claims;
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
using System.Text.Json;
using Xunit;

namespace backend.Tests.Services;

public class AuthServiceTests
{
    private const string VerifyRegisterSecret = "test-verify-register-secret-key-32-characters";
    private const string ResetPasswordSecret = "test-reset-password-secret-key-32-characters";

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
            ["AppSettings:AllowedEmailDomains"] = "@cloud.io"
        };
        var authService = new AuthService(
            dbContext,
            new TokenService(configuration),
            new SettingService(configuration),
            new NoOpEmailService());
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
    public async Task Login_ReturnsGenericUnauthorizedError_WhenCredentialsAreInvalid()
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
            new NoOpEmailService());

        await Assert.ThrowsAsync<UnauthorizedException>(() =>
            authService.Login(new LoginRequest("missing@example.com", "TestPassword123!")));
    }

    [Fact]
    public async Task Login_FindsAnActiveAccount_WhenEmailHasDifferentCasingOrWhitespace()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;
        await using var dbContext = new AppDbContext(dbOptions);
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.ACTIVE);
        const string password = "TestPassword123!";
        employee.Password = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
        await dbContext.SaveChangesAsync();
        var configuration = CreateAuthenticationConfiguration();
        var authService = new AuthService(
            dbContext,
            new TokenService(configuration),
            new SettingService(configuration),
            new NoOpEmailService());

        var response = await authService.Login(new LoginRequest("  CASHIER@CLOUD.IO  ", password));

        Assert.False(string.IsNullOrWhiteSpace(response.AccessToken));
    }

    [Fact]
    public async Task Login_RejectsAnAccountThatHasNotBeenVerified()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;
        await using var dbContext = new AppDbContext(dbOptions);
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.PENDING_OTP);
        const string password = "TestPassword123!";
        employee.Password = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
        await dbContext.SaveChangesAsync();
        var configuration = CreateAuthenticationConfiguration();
        var authService = new AuthService(
            dbContext,
            new TokenService(configuration),
            new SettingService(configuration),
            new NoOpEmailService());

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            authService.Login(new LoginRequest(employee.Email, password)));
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
            ["AppSettings:AllowedEmailDomains"] = "@example.com"
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
                new NoOpEmailService());

            await Assert.ThrowsAsync<InvalidOperationException>(() => authService.Register(request));
        }

        await using var verificationContext = new AppDbContext(dbOptions);
        Assert.False(await verificationContext.Employees.AnyAsync(employee => employee.Email == request.Email));
    }

    [Fact]
    public async Task Register_PersistsPendingEmployee_WhenEmailDeliveryFails_SoItCanBeRetried()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;
        await SeedCashierRole(dbOptions);
        var configuration = CreateAuthenticationConfiguration();
        var request = new RegisterRequest
        {
            Email = "retry@cloud.io",
            FullName = "Retry Cashier",
            Password = "TestPassword123!",
            Phone = "0123456789"
        };

        await using (var dbContext = new AppDbContext(dbOptions))
        {
            var authService = new AuthService(
                dbContext,
                new TokenService(configuration),
                new SettingService(configuration),
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
            dbContext,
            tokenService,
            new SettingService(configuration),
            new NoOpEmailService());
        var token = tokenService.GenerateToken(
            employee.Id,
            TokenType.VERIFY_REGISTER,
            [new Claim("email", employee.Email)]);

        await authService.Verify(token);

        Assert.Equal(EmployeeStatus.ACTIVE, employee.Status);
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
            new NoOpEmailService());
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
        var authService = new AuthService(
            dbContext,
            tokenService,
            new SettingService(configuration),
            new NoOpEmailService());
        var token = tokenService.GenerateToken(
            employee.Id,
            TokenType.VERIFY_REGISTER,
            [new Claim("email", employee.Email)]);

        await Assert.ThrowsAsync<ForbiddenException>(() => authService.Verify(token));

        Assert.Equal(EmployeeStatus.LOCKED, employee.Status);
    }

    [Fact]
    public async Task Register_SendsVerificationEmail_WithoutExposingTheTokenInTheResponse()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;
        await SeedCashierRole(dbOptions);

        await using var dbContext = new AppDbContext(dbOptions);
        var configuration = CreateAuthenticationConfiguration();
        var emailService = new RecordingEmailService();
        var authService = new AuthService(
            dbContext,
            new TokenService(configuration),
            new SettingService(configuration),
            emailService);
        var request = new RegisterRequest
        {
            Email = "new.cashier@cloud.io",
            FullName = "New Cashier",
            Password = "TestPassword123!",
            Phone = "0123456789"
        };

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
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;
        await SeedCashierRole(dbOptions);
        await using var dbContext = new AppDbContext(dbOptions);
        var configuration = CreateAuthenticationConfiguration();
        var emailService = new RecordingEmailService();
        var authService = new AuthService(
            dbContext,
            new TokenService(configuration),
            new SettingService(configuration),
            emailService);
        var request = new RegisterRequest
        {
            Email = "login.after.verify@cloud.io",
            FullName = "Verified Cashier",
            Password = "TestPassword123!",
            Phone = "0123456789"
        };

        await authService.Register(request);
        await authService.Verify(Assert.Single(emailService.VerificationEmails).Token);
        var response = await authService.Login(new LoginRequest(request.Email, request.Password));

        Assert.False(string.IsNullOrWhiteSpace(response.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(response.RefreshToken));
    }

    [Fact]
    public async Task RequestPasswordReset_DoesNotDiscloseUnknownEmail_AndSendsForAnActiveAccount()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;
        await using var dbContext = new AppDbContext(dbOptions);
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.ACTIVE);
        var configuration = CreateAuthenticationConfiguration();
        var emailService = new RecordingEmailService();
        var authService = new AuthService(
            dbContext,
            new TokenService(configuration),
            new SettingService(configuration),
            emailService);

        await authService.RequestPasswordReset(new ForgotPasswordRequest { Email = "missing@cloud.io" });
        await authService.RequestPasswordReset(new ForgotPasswordRequest { Email = employee.Email });

        var email = Assert.Single(emailService.PasswordResetEmails);
        Assert.Equal(employee.Email, email.RecipientEmail);
        Assert.False(string.IsNullOrWhiteSpace(email.Token));
    }

    [Fact]
    public async Task ResetPassword_ChangesPassword_AndCannotReuseTheLink()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;
        await using var dbContext = new AppDbContext(dbOptions);
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.ACTIVE);
        var configuration = CreateAuthenticationConfiguration();
        var emailService = new RecordingEmailService();
        var authService = new AuthService(
            dbContext,
            new TokenService(configuration),
            new SettingService(configuration),
            emailService);
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
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;
        await using var dbContext = new AppDbContext(dbOptions);
        await dbContext.Database.EnsureCreatedAsync();
        var employee = await SeedEmployee(dbContext, EmployeeStatus.ACTIVE);
        var configuration = CreateAuthenticationConfiguration();
        var tokenService = new TokenService(configuration);
        var authService = new AuthService(
            dbContext,
            tokenService,
            new SettingService(configuration),
            new NoOpEmailService());
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
        ["Jwt:ResetPasswordSecret:Key"] = ResetPasswordSecret
    };

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
        {
            throw new InvalidOperationException("SMTP is unavailable");
        }

        public Task SendPasswordResetEmailAsync(string recipientEmail, string recipientName, string token)
        {
            throw new InvalidOperationException("SMTP is unavailable");
        }
    }

    private sealed record EmailRequest(string RecipientEmail, string RecipientName, string Token);
}
