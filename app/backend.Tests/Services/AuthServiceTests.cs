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
            new SettingService(configuration));
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
            new SettingService(configuration));

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
                new SettingService(configuration));

            await Assert.ThrowsAsync<InvalidOperationException>(() => authService.Register(request));
        }

        await using var verificationContext = new AppDbContext(dbOptions);
        Assert.False(await verificationContext.Employees.AnyAsync(employee => employee.Email == request.Email));
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
}
