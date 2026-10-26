using System.Net;
using System.Text.Json;
using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.EmployeeDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Xunit;

namespace backend.Tests.Services;

public class EmployeeServiceTests
{
    [Fact]
    public async Task ChangeRoleAsync_UpdatesRoleAndStoresRequestedAuditValues()
    {
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();
        var data = await SeedEmployeesAsync(dbContext);
        var service = CreateService(dbContext);

        var response = await service.ChangeRoleAsync(
            data.Actor.Id,
            data.Employee.Id,
            new ChangeEmployeeRequest(RoleName.INVENTORY_MANAGER, "Move to warehouse"),
            new AuditLogContext(data.Actor.Id, IPAddress.Loopback));

        var audit = await dbContext.AuditLogs.SingleAsync();
        Assert.Equal(data.InventoryRole.Id, data.Employee.RoleId);
        Assert.Equal(RoleName.CASHIER, response.PreviousRole);
        Assert.Equal(RoleName.INVENTORY_MANAGER, response.CurrentRole);
        Assert.Equal("Move to warehouse", audit.Reason);
        Assert.Equal("CASHIER", JsonSerializer.Deserialize<string>(audit.BeforeData!));
        Assert.Equal("INVENTORY_MANAGER", JsonSerializer.Deserialize<string>(audit.AfterData!));
    }

    [Fact]
    public async Task ChangeRoleAsync_RejectsInactiveRoleWithoutChangingEmployee()
    {
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();
        var data = await SeedEmployeesAsync(dbContext, inventoryRoleIsActive: false);
        var service = CreateService(dbContext);

        await Assert.ThrowsAsync<NotFoundException>(() => service.ChangeRoleAsync(
            data.Actor.Id,
            data.Employee.Id,
            new ChangeEmployeeRequest(RoleName.INVENTORY_MANAGER, "Move to warehouse"),
            new AuditLogContext(data.Actor.Id, IPAddress.Loopback)));

        Assert.Equal(data.CashierRole.Id, data.Employee.RoleId);
        Assert.Empty(dbContext.AuditLogs);
    }

    [Fact]
    public async Task ChangeRoleAsync_DoesNotWriteAuditWhenRoleIsUnchanged()
    {
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();
        var data = await SeedEmployeesAsync(dbContext);
        var service = CreateService(dbContext);

        var response = await service.ChangeRoleAsync(
            data.Actor.Id,
            data.Employee.Id,
            new ChangeEmployeeRequest(RoleName.CASHIER, "No change"),
            new AuditLogContext(data.Actor.Id, IPAddress.Loopback));

        Assert.Equal(RoleName.CASHIER, response.PreviousRole);
        Assert.Equal(RoleName.CASHIER, response.CurrentRole);
        Assert.Empty(dbContext.AuditLogs);
    }

    [Fact]
    public async Task ChangeRoleAsync_RejectsNonAdminActorWithoutChangingEmployee()
    {
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();
        var data = await SeedEmployeesAsync(dbContext, actorRoleName: RoleName.CASHIER);
        var service = CreateService(dbContext);

        await Assert.ThrowsAsync<ForbiddenException>(() => service.ChangeRoleAsync(
            data.Actor.Id,
            data.Employee.Id,
            new ChangeEmployeeRequest(RoleName.INVENTORY_MANAGER, "Unauthorized change"),
            new AuditLogContext(data.Actor.Id, IPAddress.Loopback)));

        Assert.Equal(data.CashierRole.Id, data.Employee.RoleId);
        Assert.Empty(dbContext.AuditLogs);
    }

    [Fact]
    public async Task ChangeRoleAsync_RejectsBlankReasonBeforeChangingEmployee()
    {
        await using var connection = await OpenConnectionAsync();
        await using var dbContext = new AppDbContext(CreateOptions(connection));
        await dbContext.Database.EnsureCreatedAsync();
        var data = await SeedEmployeesAsync(dbContext);
        var service = CreateService(dbContext);

        await Assert.ThrowsAsync<BadRequestException>(() => service.ChangeRoleAsync(
            data.Actor.Id,
            data.Employee.Id,
            new ChangeEmployeeRequest(RoleName.INVENTORY_MANAGER, "   "),
            new AuditLogContext(data.Actor.Id, IPAddress.Loopback)));

        Assert.Equal(data.CashierRole.Id, data.Employee.RoleId);
        Assert.Empty(dbContext.AuditLogs);
    }

    [Fact]
    public async Task ChangeRoleAsync_DoesNotPersistRoleWhenAuditSaveFails()
    {
        await using var connection = await OpenConnectionAsync();
        var options = CreateOptions(connection, new FailAuditSaveInterceptor());
        await using var dbContext = new AppDbContext(options);
        await dbContext.Database.EnsureCreatedAsync();
        var data = await SeedEmployeesAsync(dbContext);
        var service = CreateService(dbContext);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ChangeRoleAsync(
            data.Actor.Id,
            data.Employee.Id,
            new ChangeEmployeeRequest(RoleName.INVENTORY_MANAGER, "Move to warehouse"),
            new AuditLogContext(data.Actor.Id, IPAddress.Loopback)));

        await using var verificationContext = new AppDbContext(CreateOptions(connection));
        var persistedEmployee = await verificationContext.Employees
            .AsNoTracking()
            .SingleAsync(employee => employee.Id == data.Employee.Id);
        Assert.Equal(data.CashierRole.Id, persistedEmployee.RoleId);
        Assert.Empty(await verificationContext.AuditLogs.ToListAsync());
    }

    [Fact]
    public async Task ChangeRoleAsync_RejectsAStaleRoleChangeWithoutWritingAnotherAudit()
    {
        await using var connection = await OpenConnectionAsync();
        Guid actorId;
        Guid employeeId;
        Guid inventoryRoleId;
        await using (var setupContext = new AppDbContext(CreateOptions(connection)))
        {
            await setupContext.Database.EnsureCreatedAsync();
            var data = await SeedEmployeesAsync(setupContext);
            actorId = data.Actor.Id;
            employeeId = data.Employee.Id;
            inventoryRoleId = data.InventoryRole.Id;
        }

        await using var staleContext = new AppDbContext(CreateOptions(connection));
        await staleContext.Employees
            .Include(employee => employee.Role)
            .Where(employee => employee.Id == actorId || employee.Id == employeeId)
            .LoadAsync();

        await using (var winnerContext = new AppDbContext(CreateOptions(connection)))
        {
            await CreateService(winnerContext).ChangeRoleAsync(
                actorId,
                employeeId,
                new ChangeEmployeeRequest(RoleName.INVENTORY_MANAGER, "Move to warehouse"),
                new AuditLogContext(actorId, IPAddress.Loopback));
        }

        await Assert.ThrowsAsync<ConflictException>(() => CreateService(staleContext).ChangeRoleAsync(
            actorId,
            employeeId,
            new ChangeEmployeeRequest(RoleName.ADMIN, "Stale promotion"),
            new AuditLogContext(actorId, IPAddress.Loopback)));

        await using var verificationContext = new AppDbContext(CreateOptions(connection));
        var persistedEmployee = await verificationContext.Employees
            .AsNoTracking()
            .SingleAsync(employee => employee.Id == employeeId);
        Assert.Equal(inventoryRoleId, persistedEmployee.RoleId);
        Assert.Single(await verificationContext.AuditLogs.ToListAsync());
    }

    private static EmployeeService CreateService(AppDbContext dbContext)
        => new(dbContext, new AuditLogService(dbContext));

    private static async Task<SqliteConnection> OpenConnectionAsync()
    {
        var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        return connection;
    }

    private static DbContextOptions<AppDbContext> CreateOptions(
        SqliteConnection connection,
        SaveChangesInterceptor? interceptor = null)
    {
        var builder = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection);
        if (interceptor is not null)
            builder.AddInterceptors(interceptor);
        return builder.Options;
    }

    private static async Task<TestData> SeedEmployeesAsync(
        AppDbContext dbContext,
        bool inventoryRoleIsActive = true,
        RoleName actorRoleName = RoleName.ADMIN)
    {
        var adminRole = new RoleModel { RoleName = RoleName.ADMIN, IsActive = true };
        var cashierRole = new RoleModel { RoleName = RoleName.CASHIER, IsActive = true };
        var inventoryRole = new RoleModel
        {
            RoleName = RoleName.INVENTORY_MANAGER,
            IsActive = inventoryRoleIsActive
        };
        var actorRole = actorRoleName == RoleName.ADMIN ? adminRole : cashierRole;
        var actor = CreateEmployee("admin@cloud.io", actorRole);
        var employee = CreateEmployee("cashier@cloud.io", cashierRole);

        dbContext.AddRange(adminRole, cashierRole, inventoryRole, actor, employee);
        await dbContext.SaveChangesAsync();
        return new TestData(actor, employee, cashierRole, inventoryRole);
    }

    private static EmployeeModel CreateEmployee(string email, RoleModel role) => new()
    {
        Email = email,
        FullName = email,
        Password = "hash",
        Phone = "0900000000",
        Role = role,
        Status = EmployeeStatus.ACTIVE
    };

    private sealed record TestData(
        EmployeeModel Actor,
        EmployeeModel Employee,
        RoleModel CashierRole,
        RoleModel InventoryRole);

    private sealed class FailAuditSaveInterceptor : SaveChangesInterceptor
    {
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            if (eventData.Context!.ChangeTracker.Entries<AuditLogModel>()
                .Any(entry => entry.State == EntityState.Added))
            {
                throw new InvalidOperationException("Audit persistence failed.");
            }

            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }
    }
}
