using System.Net;
using System.Text.Json;
using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Models;
using backend.src.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace backend.Tests.Services;

public class AuditLogServiceTests
{
    [Fact]
    public async Task SearchAsync_ReturnsBeforeAndAfterData()
    {
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();
        var service = new AuditLogService(dbContext);
        var actorId = Guid.NewGuid();
        var employeeId = Guid.NewGuid();
        await service.CreateAuditLogEntryAsync(new CreateAuditLogEntry(
            "CHANGE_ROLE",
            "EmployeeModel",
            employeeId,
            "CASHIER",
            "INVENTORY_MANAGER",
            "Move to warehouse",
            new AuditLogContext(actorId, IPAddress.Loopback)));

        var response = Assert.Single(await service.SearchAsync(new AuditLogQuery(
            actorId,
            "CHANGE_ROLE",
            "EmployeeModel",
            employeeId,
            null,
            null)));
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(response));

        Assert.Equal("\"CASHIER\"", json.RootElement.GetProperty("BeforeData").GetString());
        Assert.Equal("\"INVENTORY_MANAGER\"", json.RootElement.GetProperty("AfterData").GetString());
    }

    [Fact]
    public async Task SaveChangesAsync_RejectsUpdatingAnAuditLog()
    {
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();
        var audit = await CreateAuditAsync(dbContext);
        audit.Reason = "Changed reason";

        await Assert.ThrowsAsync<InvalidOperationException>(() => dbContext.SaveChangesAsync());
    }

    [Fact]
    public async Task SaveChangesAsync_RejectsDeletingAnAuditLog()
    {
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();
        var audit = await CreateAuditAsync(dbContext);
        dbContext.AuditLogs.Remove(audit);

        await Assert.ThrowsAsync<InvalidOperationException>(() => dbContext.SaveChangesAsync());
    }

    private static async Task<AuditLogModel> CreateAuditAsync(AppDbContext dbContext)
    {
        var service = new AuditLogService(dbContext);
        return await service.CreateAuditLogEntryAsync(new CreateAuditLogEntry(
            "CHANGE_ROLE",
            "EmployeeModel",
            Guid.NewGuid(),
            "CASHIER",
            "ADMIN",
            "Promotion",
            new AuditLogContext(Guid.NewGuid(), IPAddress.Loopback)));
    }

    private static async Task<SqliteConnection> OpenConnectionAsync()
    {
        var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        return connection;
    }

    private static DbContextOptions<AppDbContext> CreateOptions(SqliteConnection connection)
        => new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;
}
