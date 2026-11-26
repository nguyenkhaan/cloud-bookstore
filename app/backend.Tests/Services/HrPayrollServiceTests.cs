using System.Text.Json;
using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.PayrollDto;
using backend.src.Dto.ReportDto;
using backend.src.Dto.UploadDto;
using backend.src.Exceptions;
using backend.src.Helpers;
using backend.src.Infrastructure;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using backend.src.Services.ReportServices;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Xunit;

namespace backend.Tests.Services;

public sealed class HrPayrollServiceTests
{
    [Fact]
    public async Task Initialize_aggregates_work_records_applies_approved_adjustments_and_rebuilds_cleanly()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var admin = NewEmployee(roles[RoleName.ADMIN], "Admin", "admin@cloud.io", "NV-0001", hourlyRate: 40_000m, phone: "0901000001");
        var cashier = NewEmployee(roles[RoleName.CASHIER], "Trần Hoàng Phong", "phong@cloud.io", "NV-0002", hourlyRate: 30_000m, phone: "0902000002");
        db.Employees.AddRange(admin, cashier);

        // Work records in 10/2026: 480 + 480 = 960 min (16h standard), 60 min (1h OT)
        db.EmployeeWorkRecords.AddRange(
            new EmployeeWorkRecordModel
            {
                EmployeeId = cashier.Id,
                WorkDate = new DateOnly(2026, 10, 5),
                ShiftNo = 1,
                AttendanceStatus = AttendanceStatus.PRESENT,
                WorkedMinutes = 480,
                OvertimeMinutes = 60,
                ShiftSalary = 285_000
            },
            new EmployeeWorkRecordModel
            {
                EmployeeId = cashier.Id,
                WorkDate = new DateOnly(2026, 10, 6),
                ShiftNo = 1,
                AttendanceStatus = AttendanceStatus.PRESENT,
                WorkedMinutes = 480,
                OvertimeMinutes = 0,
                ShiftSalary = 240_000
            });

        var approvedAdj = new PayrollAdjustmentModel
        {
            Id = Guid.NewGuid(),
            AdjustmentCode = "ADJ-202610-0001",
            EmployeeId = cashier.Id,
            SourcePeriodKey = "09/2026",
            TargetPeriodKey = "10/2026",
            Category = "Phụ cấp",
            AdjustmentType = PayrollAdjustmentType.ADD_NEXT_PERIOD,
            Amount = 200_000,
            Reason = "Bù phụ cấp tháng 09",
            Status = PayrollAdjustmentStatus.APPROVED,
            CreatedBy = admin.Id,
            CreatedAt = DateTime.UtcNow
        };
        var draftAdj = new PayrollAdjustmentModel
        {
            Id = Guid.NewGuid(),
            AdjustmentCode = "ADJ-202610-0002",
            EmployeeId = cashier.Id,
            SourcePeriodKey = "09/2026",
            TargetPeriodKey = "10/2026",
            Category = "Khấu trừ",
            AdjustmentType = PayrollAdjustmentType.DEDUCT_NEXT_PERIOD,
            Amount = 50_000,
            Reason = "Chưa duyệt nên không tự áp dụng",
            Status = PayrollAdjustmentStatus.DRAFT,
            CreatedBy = admin.Id,
            CreatedAt = DateTime.UtcNow
        };
        db.PayrollAdjustments.AddRange(approvedAdj, draftAdj);
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var detail = await service.InitializeAsync(admin.Id, "10/2026", new AuditLogContext(admin.Id, null));

        Assert.Equal(PayrollPeriodStatus.DRAFT, detail.Status);
        Assert.True(detail.Exists);
        var row = Assert.Single(detail.Rows, r => r.EmployeeId == cashier.Id);
        Assert.Equal(16m, row.StandardHours);
        Assert.Equal(480_000, row.BaseSalary);
        Assert.Equal(1m, row.OvertimeHours);
        Assert.Equal(45_000, row.OvertimeAmount); // 1 * 30,000 * 1.5
        Assert.Equal(200_000, row.Bonus);
        Assert.Equal(725_000, row.NetPay);
        Assert.Single(detail.PendingAdjustments); // Only the DRAFT one remains pending

        var appliedAdj = await db.PayrollAdjustments.AsNoTracking().SingleAsync(a => a.Id == approvedAdj.Id);
        Assert.Equal(PayrollAdjustmentStatus.APPLIED, appliedAdj.Status);
        Assert.NotNull(appliedAdj.AppliedAt);
        Assert.Equal(DateTimeKind.Utc, appliedAdj.AppliedAt!.Value.Kind);

        // Re-initialize preserves existing rows and does not duplicate adjustment items
        var reinitialized = await service.InitializeAsync(admin.Id, "10/2026", new AuditLogContext(admin.Id, null));
        var reinitRow = Assert.Single(reinitialized.Rows, r => r.EmployeeId == cashier.Id);
        Assert.Equal(725_000, reinitRow.NetPay);
        Assert.Equal(1, await db.PayrollEntryItems.CountAsync(i => i.SourceType == PayrollEntryItemModel.AdjustmentSource));
    }

    [Fact]
    public async Task Adjust_approve_and_unlock_enforce_draft_only_reason_and_paid_guards()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var admin = NewEmployee(roles[RoleName.ADMIN], "Admin", "admin@cloud.io", "NV-0001", hourlyRate: 40_000m);
        var cashier = NewEmployee(roles[RoleName.CASHIER], "Cashier", "cashier@cloud.io", "NV-0002", hourlyRate: 25_000m);
        db.Employees.AddRange(admin, cashier);
        db.EmployeeWorkRecords.Add(new EmployeeWorkRecordModel
        {
            EmployeeId = cashier.Id,
            WorkDate = new DateOnly(2026, 10, 10),
            ShiftNo = 1,
            WorkedMinutes = 480,
            ShiftSalary = 200_000
        });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var ctx = new AuditLogContext(admin.Id, null);

        // Cannot approve empty/uninitialized period
        await Assert.ThrowsAsync<NotFoundException>(() => service.ApproveAsync(admin.Id, "10/2026", ctx));

        await service.InitializeAsync(admin.Id, "10/2026", ctx);

        // Adjust in DRAFT recomputes NetPay
        var adjusted = await service.AdjustEmployeeAsync(admin.Id, "10/2026", cashier.Id,
            new PatchPayrollEmployeeRequest(Bonus: 100_000, Allowance: 50_000, Deduction: 30_000, Note: "Thưởng tháng 10"), ctx);
        var row = Assert.Single(adjusted.Rows);
        Assert.Equal(320_000, row.NetPay); // 200k + 100k + 50k - 30k

        // Approve transitions DRAFT -> APPROVED_UNPAID
        var approved = await service.ApproveAsync(admin.Id, "10/2026", ctx);
        Assert.Equal(PayrollPeriodStatus.APPROVED_UNPAID, approved.Status);
        Assert.NotNull(approved.ApprovedAt);
        Assert.Equal(DateTimeKind.Utc, approved.ApprovedAt!.Value.Kind);

        // Cannot adjust when APPROVED_UNPAID (409)
        await Assert.ThrowsAsync<ConflictException>(() => service.AdjustEmployeeAsync(admin.Id, "10/2026", cashier.Id,
            new PatchPayrollEmployeeRequest(0, 0, 0), ctx));

        // Cannot unlock with empty reason (400)
        await Assert.ThrowsAsync<BadRequestException>(() => service.UnlockAsync(admin.Id, "10/2026",
            new UnlockPayrollRequest("   "), ctx));

        // Unlock with valid reason returns to DRAFT
        var unlocked = await service.UnlockAsync(admin.Id, "10/2026",
            new UnlockPayrollRequest("Cập nhật lại phụ cấp ca đêm"), ctx);
        Assert.Equal(PayrollPeriodStatus.DRAFT, unlocked.Status);

        // Approve again, payout, and verify unlock is blocked with 409 Conflict
        await service.ApproveAsync(admin.Id, "10/2026", ctx);
        await service.PayoutAsync(admin.Id, "10/2026",
            new BatchPayoutRequest([cashier.Id], PaymentMethod.BANK_TRANSFER, "BANK-202610-001", new DateOnly(2026, 11, 1)), ctx);

        await Assert.ThrowsAsync<ConflictException>(() => service.UnlockAsync(admin.Id, "10/2026",
            new UnlockPayrollRequest("Thử mở khóa sau chi trả"), ctx));
    }

    [Fact]
    public async Task Batch_payout_creates_payments_syncs_work_records_for_reports_and_blocks_double_payout_or_missing_bank_ref()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var admin = NewEmployee(roles[RoleName.ADMIN], "Admin", "admin@cloud.io", "NV-0001", hourlyRate: 40_000m);
        var staff1 = NewEmployee(roles[RoleName.CASHIER], "Staff One", "s1@cloud.io", "NV-0002", hourlyRate: 30_000m);
        var staff2 = NewEmployee(roles[RoleName.INVENTORY_MANAGER], "Staff Two", "s2@cloud.io", "NV-0003", hourlyRate: 25_000m);
        db.Employees.AddRange(admin, staff1, staff2);

        db.EmployeeWorkRecords.AddRange(
            new EmployeeWorkRecordModel
            {
                EmployeeId = staff1.Id,
                WorkDate = new DateOnly(2026, 10, 12),
                ShiftNo = 1,
                WorkedMinutes = 480,
                ShiftSalary = 240_000,
                PaymentStatus = WorkRecordPaymentStatus.UNPAID
            },
            new EmployeeWorkRecordModel
            {
                EmployeeId = staff2.Id,
                WorkDate = new DateOnly(2026, 10, 13),
                ShiftNo = 1,
                WorkedMinutes = 480,
                ShiftSalary = 200_000,
                PaymentStatus = WorkRecordPaymentStatus.UNPAID
            });

        var cashSession = new CashSessionModel
        {
            Id = Guid.NewGuid(),
            OpenedBy = admin.Id,
            OpeningBalance = 2_000_000,
            Status = CashSessionStatus.OPEN
        };
        db.CashSessions.Add(cashSession);

        var intentId = Guid.NewGuid();
        var publicId = $"cloud-bookstore/private/payroll/{intentId:N}";
        db.UploadIntents.Add(new UploadIntentModel
        {
            Id = intentId,
            OwnerType = UploadOwnerType.PAYROLL_PAYOUT_PROOF,
            PublicImageId = publicId,
            Status = UploadIntentStatus.PENDING,
            CreatedBy = admin.Id,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var ctx = new AuditLogContext(admin.Id, null);

        await service.InitializeAsync(admin.Id, "10/2026", ctx);

        // Draft period cannot execute payout (409)
        await Assert.ThrowsAsync<ConflictException>(() => service.PayoutAsync(admin.Id, "10/2026",
            new BatchPayoutRequest([staff1.Id], PaymentMethod.BANK_TRANSFER, "BANK-01", new DateOnly(2026, 11, 2)), ctx));

        await service.ApproveAsync(admin.Id, "10/2026", ctx);

        // Bank transfer missing transactionRef throws 400
        await Assert.ThrowsAsync<BadRequestException>(() => service.PayoutAsync(admin.Id, "10/2026",
            new BatchPayoutRequest([staff1.Id], PaymentMethod.BANK_TRANSFER, "   ", new DateOnly(2026, 11, 2)), ctx));

        // Unknown employee in period throws 404 without persisting
        await Assert.ThrowsAsync<NotFoundException>(() => service.PayoutAsync(admin.Id, "10/2026",
            new BatchPayoutRequest([Guid.NewGuid()], PaymentMethod.BANK_TRANSFER, "BANK-01", new DateOnly(2026, 11, 2)), ctx));

        // Partial payout via BANK_TRANSFER with Cloudinary proof
        var partial = await service.PayoutAsync(admin.Id, "10/2026",
            new BatchPayoutRequest(
                [staff1.Id],
                PaymentMethod.BANK_TRANSFER,
                "BANK-202610-001",
                new DateOnly(2026, 11, 2),
                ProofUpload: new CloudinaryUploadResultRequest(intentId, publicId, 1, "sig", "asset1", "png", 1024)),
            ctx);

        Assert.Equal(PayrollPeriodStatus.PARTIALLY_PAID, partial.Status);
        Assert.Equal(240_000, partial.Kpi.PaidAmount);
        Assert.Equal(200_000, partial.Kpi.RemainingAmount);
        Assert.Single(partial.Batches);
        Assert.Contains(publicId, partial.Batches[0].ProofUrl);

        // Double payout on already-PAID staff1 throws 409
        await Assert.ThrowsAsync<ConflictException>(() => service.PayoutAsync(admin.Id, "10/2026",
            new BatchPayoutRequest([staff1.Id], PaymentMethod.CASH, null, new DateOnly(2026, 11, 3)), ctx));

        // Remaining staff2 via CASH auto-generates PC-YYYYMMDD-001 and links active open CashSession
        var settled = await service.PayoutAsync(admin.Id, "10/2026",
            new BatchPayoutRequest([staff2.Id], PaymentMethod.CASH, null, new DateOnly(2026, 11, 3), "Chi tiền mặt"), ctx);

        Assert.Equal(PayrollPeriodStatus.SETTLED, settled.Status);
        Assert.Equal(440_000, settled.Kpi.PaidAmount);
        Assert.Equal(0, settled.Kpi.RemainingAmount);
        Assert.Equal(2, settled.Batches.Count);
        Assert.StartsWith("PC-20261103-001", settled.Batches[1].TransactionRef);

        var payments = await db.Payments.AsNoTracking().Where(p => p.PaymentType == PaymentType.PAYROLL).ToListAsync();
        Assert.Equal(2, payments.Count);
        Assert.All(payments, p =>
        {
            Assert.Equal(PaymentDirection.OUT, p.Direction);
            Assert.Equal(PaymentStatus.SUCCEEDED, p.Status);
            Assert.Null(p.WorkRecordId);
            Assert.Equal(DateTimeKind.Utc, p.PaidAt!.Value.Kind);
        });
        Assert.Contains(payments, p => p.Method == PaymentMethod.CASH && p.CashSessionId == cashSession.Id && p.Amount == 200_000);

        var syncedRecords = await db.EmployeeWorkRecords.AsNoTracking().ToListAsync();
        Assert.All(syncedRecords, r =>
        {
            Assert.Equal(WorkRecordPaymentStatus.PAID, r.PaymentStatus);
            Assert.Equal(admin.Id, r.ApprovedBy);
            Assert.NotNull(r.ApprovedAt);
            Assert.Equal(DateTimeKind.Utc, r.ApprovedAt!.Value.Kind);
        });

        // ReportsService compatibility: reads synced EmployeeWorkRecords accurately without double-counting
        var reports = new ReportsService(db, new FixedTimeProvider(new DateTime(2026, 10, 20, 5, 0, 0, DateTimeKind.Utc)));
        var revExp = await reports.GetRevenueExpenseAsync(new RevenueExpenseQuery(new DateOnly(2026, 10, 1), new DateOnly(2026, 10, 31)));
        Assert.Equal(440_000, revExp.ExpenseBreakdown.ApprovedPayroll);
        Assert.Equal(440_000, revExp.TotalExpense);
    }

    [Fact]
    public async Task SendZalo_writes_outbox_rows_for_valid_and_invalid_phones_and_blocks_draft()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var admin = NewEmployee(roles[RoleName.ADMIN], "Admin", "admin@cloud.io", "NV-0001", hourlyRate: 40_000m, phone: "0901000001");
        var linkedStaff = NewEmployee(roles[RoleName.CASHIER], "Linked", "linked@cloud.io", "NV-0002", hourlyRate: 25_000m, phone: "0909123456");
        var unlinkedStaff = NewEmployee(roles[RoleName.INVENTORY_MANAGER], "Unlinked", "unlinked@cloud.io", "NV-0003", hourlyRate: 25_000m, phone: "invalid");
        db.Employees.AddRange(admin, linkedStaff, unlinkedStaff);
        db.EmployeeWorkRecords.AddRange(
            new EmployeeWorkRecordModel { EmployeeId = linkedStaff.Id, WorkDate = new DateOnly(2026, 10, 5), ShiftNo = 1, WorkedMinutes = 480 },
            new EmployeeWorkRecordModel { EmployeeId = unlinkedStaff.Id, WorkDate = new DateOnly(2026, 10, 5), ShiftNo = 1, WorkedMinutes = 480 });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var ctx = new AuditLogContext(admin.Id, null);
        await service.InitializeAsync(admin.Id, "10/2026", ctx);

        // Draft period blocked with 409
        await Assert.ThrowsAsync<ConflictException>(() =>
            service.SendZaloAsync(admin.Id, "10/2026", new SendPayrollZaloRequest([linkedStaff.Id, unlinkedStaff.Id]), ctx));

        await service.ApproveAsync(admin.Id, "10/2026", ctx);

        var result = await service.SendZaloAsync(admin.Id, "10/2026",
            new SendPayrollZaloRequest([linkedStaff.Id, unlinkedStaff.Id]), ctx);

        Assert.Equal(1, result.SentCount);
        Assert.Equal(1, result.FailedCount);

        var outboxRows = await db.NotificationOutbox.AsNoTracking().ToListAsync();
        Assert.Equal(2, outboxRows.Count);
        Assert.All(outboxRows, row =>
        {
            Assert.Equal(NotificationChannel.ZALO, row.Channel);
            Assert.Equal(NotificationRecipientType.EMPLOYEE, row.RecipientType);
            Assert.Equal("payroll_entry", row.SourceEntityType);
            Assert.Equal(DateTimeKind.Utc, row.CreatedAt.Kind);
            using var doc = JsonDocument.Parse(row.Content);
            Assert.Equal("10/2026", doc.RootElement.GetProperty("periodKey").GetString());
        });
        Assert.Single(outboxRows, r => r.Status == NotificationStatus.SENT && r.SentAt?.Kind == DateTimeKind.Utc);
        Assert.Single(outboxRows, r => r.Status == NotificationStatus.FAILED && r.SentAt == null && !string.IsNullOrWhiteSpace(r.LastError));
    }

    [Fact]
    public async Task CreateAdjustment_and_GetBreakdown_validate_period_order_and_return_cash_variances()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var admin = NewEmployee(roles[RoleName.ADMIN], "Admin", "admin@cloud.io", "NV-0001", hourlyRate: 40_000m);
        var cashier = NewEmployee(roles[RoleName.CASHIER], "Cashier", "cashier@cloud.io", "NV-0002", hourlyRate: 30_000m);
        db.Employees.AddRange(admin, cashier);
        db.EmployeeWorkRecords.Add(new EmployeeWorkRecordModel
        {
            EmployeeId = cashier.Id,
            WorkDate = new DateOnly(2026, 10, 15),
            ShiftNo = 1,
            WorkedMinutes = 480
        });
        db.CashSessions.Add(new CashSessionModel
        {
            Id = Guid.NewGuid(),
            OpenedBy = cashier.Id,
            OpeningBalance = 1_000_000,
            ClosingExpected = 1_500_000,
            ClosingCounted = 1_450_000,
            VarianceNote = "Thiếu tiền mặt cuối ca",
            VarianceApprovedBy = admin.Id,
            Status = CashSessionStatus.CLOSED,
            OpenedAt = new DateTime(2026, 10, 15, 1, 0, 0, DateTimeKind.Utc),
            ClosedAt = new DateTime(2026, 10, 15, 9, 0, 0, DateTimeKind.Utc)
        });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var ctx = new AuditLogContext(admin.Id, null);
        await service.InitializeAsync(admin.Id, "10/2026", ctx);

        var breakdown = await service.GetBreakdownAsync("10/2026", cashier.Id);
        var variance = Assert.Single(breakdown.CashVariances);
        Assert.Equal(-50_000, variance.Difference);
        Assert.Equal("Admin", variance.ApproverName);

        // Target period must be strictly after source period
        await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAdjustmentAsync(admin.Id,
            new CreatePayrollAdjustmentRequest(
                cashier.Id, "10/2026", null, "10/2026", "Phụ cấp",
                PayrollAdjustmentType.ADD_NEXT_PERIOD, 100_000, "Sai kỳ đích", PayrollAdjustmentStatus.APPROVED),
            ctx));

        var created = await service.CreateAdjustmentAsync(admin.Id,
            new CreatePayrollAdjustmentRequest(
                cashier.Id, "10/2026", "PAY-202610", "11/2026", "Phụ cấp",
                PayrollAdjustmentType.ADD_NEXT_PERIOD, 150_000, "Bù phụ cấp tháng 10", PayrollAdjustmentStatus.APPROVED),
            ctx);

        Assert.StartsWith("ADJ-", created.AdjustmentCode);
        Assert.Equal(PayrollAdjustmentStatus.APPROVED, created.Status);
        Assert.Equal(DateTimeKind.Utc, created.CreatedAt.Kind);

        var list = await service.ListAdjustmentsAsync("11/2026");
        Assert.Single(list);
    }

    [Fact]
    public void NormalizeToUtc_converts_local_and_unspecified_instants_to_utc()
    {
        var utc = new DateTime(2026, 11, 20, 5, 0, 0, DateTimeKind.Utc);
        Assert.Equal(utc, PayrollHelper.NormalizeToUtc(utc));

        var unspecified = new DateTime(2026, 11, 20, 0, 0, 0, DateTimeKind.Unspecified);
        var normalized = PayrollHelper.NormalizeToUtc(unspecified);
        Assert.Equal(DateTimeKind.Utc, normalized.Kind);
        // 2026-11-20 00:00 VN (UTC+7) == 2026-11-19 17:00 UTC
        Assert.Equal(new DateTime(2026, 11, 19, 17, 0, 0, DateTimeKind.Utc), normalized);
    }

    private static AppDbContext CreateDbContext()
        => new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"HrPayrollTests_{Guid.NewGuid():N}")
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);

    private static HrPayrollService CreateService(AppDbContext db)
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

    private static EmployeeModel NewEmployee(
        RoleModel role,
        string fullName,
        string email,
        string code,
        decimal hourlyRate = 30_000m,
        string phone = "0900000000")
        => new()
        {
            Id = Guid.NewGuid(),
            Email = email,
            FullName = fullName,
            Password = "hashed-password",
            Phone = phone,
            EmployeeCode = code,
            RoleId = role.Id,
            Role = role,
            HourlyRate = hourlyRate,
            Status = EmployeeStatus.ACTIVE
        };

    private sealed class FixedTimeProvider(DateTime utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(DateTime.SpecifyKind(utcNow, DateTimeKind.Utc));
    }

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
