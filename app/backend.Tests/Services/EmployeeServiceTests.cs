
using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.EmployeeDto;
using backend.src.Exceptions;
using backend.src.Helpers;
using backend.src.Infrastructure;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace backend.Tests.Services;

public sealed class EmployeeServiceTests
{
    [Fact]
    public async Task ListAsync_reports_directory_counts_and_filters ()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var admin = NewEmployee(roles[RoleName.ADMIN], "Nguyễn Minh Anh", "admin@comicpos.vn", "NV-0001",
            isProtected: true, status: EmployeeStatus.ACTIVE);
        var cashier = NewEmployee(roles[RoleName.CASHIER], "Trần Hoàng Phong", "nv.phong@comicpos.vn", "NV-0002",
            status: EmployeeStatus.ACTIVE);
        var invited = NewEmployee(roles[RoleName.CASHIER], "Nguyễn Hoài An", "nv.an@comicpos.vn", "NV-0003",
            status: EmployeeStatus.INVITED);
        var pendingOtp = NewEmployee(roles[RoleName.INVENTORY_MANAGER], "Lê Minh Khoa", "nv.khoa@comicpos.vn", "NV-0004",
            status: EmployeeStatus.PENDING_OTP);
        db.Employees.AddRange(admin, cashier, invited, pendingOtp);
        db.EmployeeWorkRecords.Add(new EmployeeWorkRecordModel
        {
            EmployeeId = cashier.Id,
            WorkDate = VietnamTimeHelper.TodayVietnam(DateTime.UtcNow),
            ShiftNo = 1,
            CheckInAt = DateTime.UtcNow.AddHours(-1),
            CheckOutAt = null,
            AttendanceStatus = AttendanceStatus.PRESENT
        });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var result = await service.ListAsync(new EmployeeListQuery());

        Assert.Equal(4, result.TotalCount);
        Assert.Equal(2, result.Kpi.ActiveCount);
        Assert.Equal(2, result.Kpi.NewAccountsCount);
        Assert.Equal(1, result.Kpi.InShiftCount);
        Assert.Equal(1, result.Kpi.RootAdminCount);

        var byRole = await service.ListAsync(new EmployeeListQuery(RoleName: RoleName.CASHIER));
        Assert.Equal(2, byRole.TotalCount);
        Assert.All(byRole.Items, item => Assert.Equal(RoleName.CASHIER, item.RoleName));

        var byStatus = await service.ListAsync(new EmployeeListQuery(Status: EmployeeStatus.INVITED));
        Assert.Single(byStatus.Items);
        Assert.Equal("NV-0003", byStatus.Items[0].EmployeeCode);

        var bySearch = await service.ListAsync(new EmployeeListQuery(Search: "NV-0002"));
        Assert.Single(bySearch.Items);
        Assert.Equal("Trần Hoàng Phong", bySearch.Items[0].FullName);
    }

    [Fact]
    public async Task ListAsync_with_in_shift_only_returns_only_active_employees_with_open_shift_today ()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var today = VietnamTimeHelper.TodayVietnam(DateTime.UtcNow);
        var inShiftActive = NewEmployee(roles[RoleName.CASHIER], "Đang Trong Ca", "inshift@comicpos.vn", "NV-0010", status: EmployeeStatus.ACTIVE);
        var checkedOutActive = NewEmployee(roles[RoleName.CASHIER], "Đã Tan Ca", "checkedout@comicpos.vn", "NV-0011", status: EmployeeStatus.ACTIVE);
        var yesterdayOpen = NewEmployee(roles[RoleName.CASHIER], "Ca Hôm Qua", "yesterday@comicpos.vn", "NV-0012", status: EmployeeStatus.ACTIVE);
        var lockedOpen = NewEmployee(roles[RoleName.CASHIER], "Tài Khoản Khóa", "locked@comicpos.vn", "NV-0013", status: EmployeeStatus.LOCKED);
        db.Employees.AddRange(inShiftActive, checkedOutActive, yesterdayOpen, lockedOpen);
        db.EmployeeWorkRecords.AddRange(
            new EmployeeWorkRecordModel
            {
                EmployeeId = inShiftActive.Id,
                WorkDate = today,
                ShiftNo = 1,
                CheckInAt = DateTime.UtcNow.AddHours(-2),
                CheckOutAt = null,
                AttendanceStatus = AttendanceStatus.PRESENT
            },
            new EmployeeWorkRecordModel
            {
                EmployeeId = checkedOutActive.Id,
                WorkDate = today,
                ShiftNo = 1,
                CheckInAt = DateTime.UtcNow.AddHours(-5),
                CheckOutAt = DateTime.UtcNow.AddHours(-1),
                AttendanceStatus = AttendanceStatus.PRESENT
            },
            new EmployeeWorkRecordModel
            {
                EmployeeId = yesterdayOpen.Id,
                WorkDate = today.AddDays(-1),
                ShiftNo = 1,
                CheckInAt = DateTime.UtcNow.AddDays(-1),
                CheckOutAt = null,
                AttendanceStatus = AttendanceStatus.PRESENT
            },
            new EmployeeWorkRecordModel
            {
                EmployeeId = lockedOpen.Id,
                WorkDate = today,
                ShiftNo = 2,
                CheckInAt = DateTime.UtcNow.AddHours(-1),
                CheckOutAt = null,
                AttendanceStatus = AttendanceStatus.PRESENT
            });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var result = await service.ListAsync(new EmployeeListQuery(Status: EmployeeStatus.ACTIVE, InShiftOnly: true));

        Assert.Equal(1, result.TotalCount);
        var item = Assert.Single(result.Items);
        Assert.Equal(inShiftActive.Id, item.Id);
        Assert.Equal("NV-0010", item.EmployeeCode);
    }

    [Fact]
    public async Task CreateAsync_persists_invited_account_with_code_email_audit_and_hashed_secret ()
    {
        await using var db = CreateDbContext();
        SeedRoles(db);
        await db.SaveChangesAsync();
        var emailService = new RecordingEmailService();
        var service = CreateService(db, emailService);
        var actorId = Guid.NewGuid();

        var created = await service.CreateAsync(actorId, new CreateEmployeeRequest(
            "New.Staff@ComicPos.vn", "Nhân Viên Mới", "0908123456", RoleName.CASHIER, "Thu ngân"),
            new AuditLogContext(actorId, null));

        Assert.Equal("NV-0001", created.EmployeeCode);
        Assert.Equal(EmployeeStatus.INVITED, created.Status);
        Assert.Equal("New.Staff@ComicPos.vn", created.Email);
        Assert.Equal("Thu ngân", created.JobTitle);

        var persisted = await db.Employees.SingleAsync();
        Assert.NotEqual("", persisted.Password);
        Assert.NotNull(persisted.PasswordResetTokenHash);
        Assert.DoesNotContain("PasswordResetTokenHash", typeof(EmployeeDto).GetProperties().Select(p => p.Name));

        var audit = await db.AuditLogs.SingleAsync();
        Assert.Equal("CREATE_EMPLOYEE", audit.Action);
        Assert.Equal("employee", audit.EntityType);

        Assert.Single(emailService.SetupEmails);
        Assert.Equal("New.Staff@ComicPos.vn", emailService.SetupEmails[0].Email);
    }

    [Fact]
    public async Task CreateAsync_rejects_duplicate_email_case_insensitively ()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        db.Employees.Add(NewEmployee(roles[RoleName.CASHIER], "Existing", "existing@comicpos.vn", "NV-0001",
            status: EmployeeStatus.ACTIVE));
        await db.SaveChangesAsync();

        var service = CreateService(db);

        await Assert.ThrowsAsync<ConflictException>(() => service.CreateAsync(Guid.NewGuid(),
            new CreateEmployeeRequest("EXISTING@comicpos.vn", "Duplicate", "0908000000", RoleName.CASHIER),
            new AuditLogContext(Guid.NewGuid(), null)));
    }

    [Fact]
    public async Task UpdateAsync_protects_root_admin_and_blocks_self_lock_and_self_demotion ()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var admin = NewEmployee(roles[RoleName.ADMIN], "Root Admin", "root@comicpos.vn", "NV-0001",
            isProtected: true, status: EmployeeStatus.ACTIVE);
        var other = NewEmployee(roles[RoleName.ADMIN], "Second Admin", "second@comicpos.vn", "NV-0002",
            status: EmployeeStatus.ACTIVE);
        db.Employees.AddRange(admin, other);
        await db.SaveChangesAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<ForbiddenException>(() => service.UpdateAsync(other.Id, admin.Id,
            new UpdateEmployeeRequest(admin.Email, admin.FullName, admin.Phone, null, EmployeeStatus.LOCKED, "Lock root"),
            new AuditLogContext(other.Id, null)));

        await Assert.ThrowsAsync<ForbiddenException>(() => service.UpdateAsync(other.Id, other.Id,
            new UpdateEmployeeRequest(other.Email, other.FullName, other.Phone, null, EmployeeStatus.LOCKED, "Self lock"),
            new AuditLogContext(other.Id, null)));

        await Assert.ThrowsAsync<ForbiddenException>(() => service.ChangeRoleAsync(other.Id, other.Id,
            new ChangeEmployeeRequest(RoleName.CASHIER, "Self demote"),
            new AuditLogContext(other.Id, null)));

        await Assert.ThrowsAsync<ForbiddenException>(() => service.ChangeRoleAsync(other.Id, admin.Id,
            new ChangeEmployeeRequest(RoleName.CASHIER, "Demote root"),
            new AuditLogContext(other.Id, null)));
    }

    [Fact]
    public async Task UpdateAsync_writes_update_audit_with_employee_entity_type ()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var target = NewEmployee(roles[RoleName.CASHIER], "Target", "target@comicpos.vn", "NV-0001",
            status: EmployeeStatus.ACTIVE);
        var actor = NewEmployee(roles[RoleName.ADMIN], "Actor", "actor@comicpos.vn", "NV-0002",
            status: EmployeeStatus.ACTIVE);
        db.Employees.AddRange(target, actor);
        await db.SaveChangesAsync();
        var service = CreateService(db);

        await service.UpdateAsync(actor.Id, target.Id,
            new UpdateEmployeeRequest(target.Email, "Target Updated", target.Phone, "Thu ngân ca tối", EmployeeStatus.ACTIVE, "Cập nhật hồ sơ"),
            new AuditLogContext(actor.Id, null));

        var audit = await db.AuditLogs.SingleAsync();
        Assert.Equal("UPDATE_EMPLOYEE", audit.Action);
        Assert.Equal("employee", audit.EntityType);
    }

    [Fact]
    public async Task ResendSetupEmailAsync_only_succeeds_for_invited_accounts ()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var invited = NewEmployee(roles[RoleName.CASHIER], "Invited", "invited@comicpos.vn", "NV-0001",
            status: EmployeeStatus.INVITED);
        var active = NewEmployee(roles[RoleName.CASHIER], "Active", "active@comicpos.vn", "NV-0002",
            status: EmployeeStatus.ACTIVE);
        db.Employees.AddRange(invited, active);
        await db.SaveChangesAsync();
        var emailService = new RecordingEmailService();
        var service = CreateService(db, emailService);

        await service.ResendSetupEmailAsync(invited.Id);
        Assert.Single(emailService.SetupEmails);

        await Assert.ThrowsAsync<ConflictException>(() => service.ResendSetupEmailAsync(active.Id));
    }

    [Fact]
    public async Task ChangeRoleAsync_switches_role_and_audits_with_admin_actor ()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var actor = NewEmployee(roles[RoleName.ADMIN], "Actor", "actor@comicpos.vn", "NV-0001",
            status: EmployeeStatus.ACTIVE);
        var target = NewEmployee(roles[RoleName.CASHIER], "Target", "target@comicpos.vn", "NV-0002",
            status: EmployeeStatus.ACTIVE);
        db.Employees.AddRange(actor, target);
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var response = await service.ChangeRoleAsync(actor.Id, target.Id,
            new ChangeEmployeeRequest(RoleName.INVENTORY_MANAGER, "Điều chuyển sang quản lý kho"),
            new AuditLogContext(actor.Id, null));

        Assert.Equal(RoleName.CASHIER, response.PreviousRole);
        Assert.Equal(RoleName.INVENTORY_MANAGER, response.CurrentRole);

        var audit = await db.AuditLogs.SingleAsync();
        Assert.Equal("CHANGE_ROLE", audit.Action);
        Assert.Equal("employee", audit.EntityType);
    }

    private static string NewDatabaseName() => Guid.NewGuid().ToString("N");

    private static AppDbContext CreateDbContext()
        => new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(NewDatabaseName())
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);

    private static EmployeeService CreateService(AppDbContext db, RecordingEmailService? emailService = null)
    {
        var configuration = BuildConfiguration();
        return new EmployeeService(
            db,
            new AuditLogService(db),
            emailService ?? new RecordingEmailService(),
            new TokenService(configuration));
    }

    private static IConfiguration BuildConfiguration()
        => new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:AccessSecret:Key"] = "test-access-secret-key-that-is-long-enough-0001",
            ["Jwt:RefreshSecret:Key"] = "test-refresh-secret-key-that-is-long-enough-0002",
            ["Jwt:VerifyRegisterSecret:Key"] = "test-verify-secret-key-that-is-long-enough-0003",
            ["Jwt:ResetPasswordSecret:Key"] = "test-reset-secret-key-that-is-long-enough-0004"
        }).Build();

    private static Dictionary<RoleName, RoleModel> SeedRoles(AppDbContext db)
    {
        var roles = new Dictionary<RoleName, RoleModel>();
        foreach (var roleName in Enum.GetValues<RoleName>())
        {
            var role = new RoleModel { RoleName = roleName, IsActive = true };
            roles[roleName] = role;
            db.Roles.Add(role);
        }

        return roles;
    }

    private static EmployeeModel NewEmployee(
        RoleModel role,
        string fullName,
        string email,
        string code,
        EmployeeStatus status = EmployeeStatus.ACTIVE,
        bool isProtected = false)
        => new()
        {
            Id = Guid.NewGuid(),
            Email = email,
            FullName = fullName,
            Password = "hashed-password",
            Phone = "0900000000",
            EmployeeCode = code,
            RoleId = role.Id,
            Role = role,
            Status = status,
            IsProtected = isProtected,
            BranchName = "Nhà sách Mây · Cơ sở 01"
        };

    private sealed class RecordingEmailService()
        : EmailService(Options.Create(new backend.src.Configurations.EmailSettings
        {
            FromAddress = "no-reply@test.local",
            FromName = "Test",
            SmtpHost = "localhost",
            SmtpPort = 1025,
            FrontendBaseUrl = "http://localhost:5173"
        }), NullLogger<EmailService>.Instance)
    {
        public List<(string Email, string Name, string Token)> SetupEmails { get; } = [];

        public override Task SendAccountSetupEmailAsync(
            string recipientEmail,
            string recipientName,
            string token,
            CancellationToken cancellationToken = default)
        {
            SetupEmails.Add((recipientEmail, recipientName, token));
            return Task.CompletedTask;
        }
    }
}
