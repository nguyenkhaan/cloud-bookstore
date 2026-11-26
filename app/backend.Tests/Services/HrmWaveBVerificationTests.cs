using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.PayrollDto;
using backend.src.Dto.UploadDto;
using backend.src.Exceptions;
using backend.src.Infrastructure;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Xunit;

namespace backend.Tests.Services;

public sealed class HrmWaveBVerificationTests
{
    [Fact]
    public async Task PayoutAsync_rejects_empty_employeeIds_with_BadRequestException()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var admin = NewEmployee(roles[RoleName.ADMIN], "Admin", "admin@cloud.io", "NV-0001");
        var cashier = NewEmployee(roles[RoleName.CASHIER], "Cashier", "cashier@cloud.io", "NV-0002");
        db.Employees.AddRange(admin, cashier);
        db.EmployeeWorkRecords.Add(new EmployeeWorkRecordModel
        {
            EmployeeId = cashier.Id,
            WorkDate = new DateOnly(2026, 10, 5),
            ShiftNo = 1,
            WorkedMinutes = 480,
            ShiftSalary = 240_000
        });
        await db.SaveChangesAsync();

        var service = CreatePayrollService(db);
        var ctx = new AuditLogContext(admin.Id, null);
        await service.InitializeAsync(admin.Id, "10/2026", ctx);
        await service.ApproveAsync(admin.Id, "10/2026", ctx);

        await Assert.ThrowsAsync<BadRequestException>(() => service.PayoutAsync(
            admin.Id,
            "10/2026",
            new BatchPayoutRequest([], PaymentMethod.BANK_TRANSFER, "BANK-001", new DateOnly(2026, 11, 2)),
            ctx));
    }

    [Fact]
    public async Task AdjustEmployeeAsync_rejects_unknown_employee_with_NotFoundException()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var admin = NewEmployee(roles[RoleName.ADMIN], "Admin", "admin@cloud.io", "NV-0001");
        var cashier = NewEmployee(roles[RoleName.CASHIER], "Cashier", "cashier@cloud.io", "NV-0002");
        db.Employees.AddRange(admin, cashier);
        db.EmployeeWorkRecords.Add(new EmployeeWorkRecordModel
        {
            EmployeeId = cashier.Id,
            WorkDate = new DateOnly(2026, 10, 5),
            ShiftNo = 1,
            WorkedMinutes = 480
        });
        await db.SaveChangesAsync();

        var service = CreatePayrollService(db);
        var ctx = new AuditLogContext(admin.Id, null);
        await service.InitializeAsync(admin.Id, "10/2026", ctx);

        await Assert.ThrowsAsync<NotFoundException>(() => service.AdjustEmployeeAsync(
            admin.Id,
            "10/2026",
            Guid.NewGuid(),
            new PatchPayrollEmployeeRequest(10_000, 0, 0),
            ctx));
    }

    [Fact]
    public async Task CreateAdjustmentAsync_isolates_invalid_amount_blank_reason_and_unknown_employee()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var admin = NewEmployee(roles[RoleName.ADMIN], "Admin", "admin@cloud.io", "NV-0001");
        var cashier = NewEmployee(roles[RoleName.CASHIER], "Cashier", "cashier@cloud.io", "NV-0002");
        db.Employees.AddRange(admin, cashier);
        await db.SaveChangesAsync();

        var service = CreatePayrollService(db);
        var ctx = new AuditLogContext(admin.Id, null);

        // Single fault 1: amount <= 0
        await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAdjustmentAsync(
            admin.Id,
            new CreatePayrollAdjustmentRequest(
                cashier.Id, "10/2026", null, "11/2026", "Phụ cấp",
                PayrollAdjustmentType.ADD_NEXT_PERIOD, 0, "Lý do hợp lệ", PayrollAdjustmentStatus.DRAFT),
            ctx));

        // Single fault 2: blank reason
        await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAdjustmentAsync(
            admin.Id,
            new CreatePayrollAdjustmentRequest(
                cashier.Id, "10/2026", null, "11/2026", "Phụ cấp",
                PayrollAdjustmentType.ADD_NEXT_PERIOD, 50_000, "   ", PayrollAdjustmentStatus.DRAFT),
            ctx));

        // Single fault 3: unknown employee
        await Assert.ThrowsAsync<NotFoundException>(() => service.CreateAdjustmentAsync(
            admin.Id,
            new CreatePayrollAdjustmentRequest(
                Guid.NewGuid(), "10/2026", null, "11/2026", "Phụ cấp",
                PayrollAdjustmentType.ADD_NEXT_PERIOD, 50_000, "Lý do hợp lệ", PayrollAdjustmentStatus.DRAFT),
            ctx));
    }

    [Fact]
    public async Task RespondDisputeAsync_isolates_invalid_status_missing_adjustment_amount_and_unknown_dispute()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var admin = NewEmployee(roles[RoleName.ADMIN], "Admin", "admin@cloud.io", "NV-0001");
        var cashier = NewEmployee(roles[RoleName.CASHIER], "Cashier", "cashier@cloud.io", "NV-0002");
        db.Employees.AddRange(admin, cashier);

        var period = new PayrollPeriodModel
        {
            Id = Guid.NewGuid(),
            PeriodKey = "10/2026",
            Year = 2026,
            Month = 10,
            PayrollCode = "PAY-202610",
            AttendanceSourceCode = "ATT-202610",
            Status = PayrollPeriodStatus.SETTLED
        };
        var entry = new PayrollEntryModel
        {
            Id = Guid.NewGuid(),
            PayrollPeriodId = period.Id,
            EmployeeId = cashier.Id,
            NetPay = 500_000
        };
        var dispute = new PayslipDisputeModel
        {
            Id = Guid.NewGuid(),
            DisputeCode = "DC-202610-0099",
            PayrollEntryId = entry.Id,
            EmployeeId = cashier.Id,
            Category = PayslipDisputeCategory.ALLOWANCE,
            Content = "Thiếu phụ cấp ca tối",
            Status = PayslipDisputeStatus.PENDING_RESPONSE,
            CreatedAt = DateTime.UtcNow
        };
        db.PayrollPeriods.Add(period);
        db.PayrollEntries.Add(entry);
        db.PayslipDisputes.Add(dispute);
        await db.SaveChangesAsync();

        var service = CreatePayslipService(db);
        var ctx = new AuditLogContext(admin.Id, null);

        // Single fault 1: invalid status (PENDING_RESPONSE)
        await Assert.ThrowsAsync<BadRequestException>(() => service.RespondDisputeAsync(
            admin.Id,
            dispute.Id,
            new RespondPayslipDisputeRequest(PayslipDisputeStatus.PENDING_RESPONSE, "Phản hồi hợp lệ"),
            ctx));

        // Single fault 2: APPROVED_NEXT_PERIOD_ADJUSTMENT without positive AdjustmentAmount
        await Assert.ThrowsAsync<BadRequestException>(() => service.RespondDisputeAsync(
            admin.Id,
            dispute.Id,
            new RespondPayslipDisputeRequest(
                PayslipDisputeStatus.APPROVED_NEXT_PERIOD_ADJUSTMENT,
                "Duyệt bù kỳ sau",
                AdjustmentAmount: null,
                AdjustmentType: PayrollAdjustmentType.ADD_NEXT_PERIOD),
            ctx));

        // Single fault 3: unknown disputeId
        await Assert.ThrowsAsync<NotFoundException>(() => service.RespondDisputeAsync(
            admin.Id,
            Guid.NewGuid(),
            new RespondPayslipDisputeRequest(PayslipDisputeStatus.EXPLAINED, "Không tồn tại"),
            ctx));

        // Admin reading employee payslip sees OwnedByActor == false on cashier's dispute
        var adminView = await service.GetPayslipAsync(cashier.Id, "10/2026", admin.Id);
        Assert.True(adminView.HasPayslip);
        var viewedDispute = Assert.Single(adminView.Disputes);
        Assert.False(viewedDispute.OwnedByActor);
    }

    private static AppDbContext CreateDbContext()
        => new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"HrmWaveBVerify_{Guid.NewGuid():N}")
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);

    private static HrPayrollService CreatePayrollService(AppDbContext db)
        => new(db, new UploadIntentService(db, new FakeCloudinaryService(), new AuditLogService(db)), new FakeCloudinaryService());

    private static HrPayslipService CreatePayslipService(AppDbContext db)
        => new(db, new UploadIntentService(db, new FakeCloudinaryService(), new AuditLogService(db)), new FakeCloudinaryService());

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

    private static EmployeeModel NewEmployee(RoleModel role, string fullName, string email, string code)
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
            HourlyRate = 30_000m,
            Status = EmployeeStatus.ACTIVE
        };

    private sealed class FakeCloudinaryService : ICloudinaryService
    {
        public CloudinaryUploadPolicy GetPolicy(UploadOwnerType ownerType)
            => new("authenticated", "test-preset", "private/payroll");

        public CloudinaryUploadSignature CreateUploadSignature(UploadOwnerType ownerType, Guid intentId)
            => new("test-api-key", "https://api.cloudinary.com/v1_1/test/image/upload",
                $"cloud-bookstore/private/payroll/{intentId:N}", "cloud-bookstore/private/payroll",
                "test-preset", "authenticated", false, 1_735_689_100, "upload-signature");

        public bool VerifyUploadResponse(string publicImageId, long version, string responseSignature) => true;

        public string BuildImageUrl(string publicImageId, UploadOwnerType ownerType)
            => $"https://res.cloudinary.com/test/image/upload/{publicImageId}";

        public Task DestroyAsync(string publicImageId, UploadOwnerType ownerType, CancellationToken cancellationToken = default)
            => Task.CompletedTask;
    }
}
