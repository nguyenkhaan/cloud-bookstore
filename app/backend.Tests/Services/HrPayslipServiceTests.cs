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

public sealed class HrPayslipServiceTests
{
    [Fact]
    public async Task GetMyPayslip_excludes_draft_periods_returns_empty_cleanly_and_populates_source_drawers()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var admin = NewEmployee(roles[RoleName.ADMIN], "Admin", "admin@cloud.io", "NV-0001");
        var cashier = NewEmployee(roles[RoleName.CASHIER], "Cashier", "cashier@cloud.io", "NV-0002", phone: "0909111222");
        var other = NewEmployee(roles[RoleName.INVENTORY_MANAGER], "Other", "other@cloud.io", "NV-0003");
        db.Employees.AddRange(admin, cashier, other);

        var draftPeriod = new PayrollPeriodModel
        {
            Id = Guid.NewGuid(),
            PeriodKey = "11/2026",
            Year = 2026,
            Month = 11,
            PayrollCode = "PAY-202611",
            AttendanceSourceCode = "ATT-202611",
            Status = PayrollPeriodStatus.DRAFT
        };
        var approvedPeriod = new PayrollPeriodModel
        {
            Id = Guid.NewGuid(),
            PeriodKey = "10/2026",
            Year = 2026,
            Month = 10,
            PayrollCode = "PAY-202610",
            AttendanceSourceCode = "ATT-202610",
            Status = PayrollPeriodStatus.APPROVED_UNPAID,
            ApprovedBy = admin.Id,
            ApprovedAt = DateTime.UtcNow
        };
        db.PayrollPeriods.AddRange(draftPeriod, approvedPeriod);

        var draftEntry = new PayrollEntryModel
        {
            Id = Guid.NewGuid(),
            PayrollPeriodId = draftPeriod.Id,
            EmployeeId = cashier.Id,
            StandardHours = 8m,
            HourlyRate = 30_000m,
            BaseSalary = 240_000,
            NetPay = 240_000
        };
        var approvedEntry = new PayrollEntryModel
        {
            Id = Guid.NewGuid(),
            PayrollPeriodId = approvedPeriod.Id,
            EmployeeId = cashier.Id,
            StandardHours = 8m,
            HourlyRate = 30_000m,
            BaseSalary = 240_000,
            OvertimeHours = 1m,
            OvertimeAmount = 45_000,
            Deduction = 50_000,
            NetPay = 235_000
        };
        db.PayrollEntries.AddRange(draftEntry, approvedEntry);
        db.PayrollEntryItems.Add(new PayrollEntryItemModel
        {
            PayrollEntryId = approvedEntry.Id,
            Category = PayrollItemCategory.ADVANCE,
            Label = "Tạm ứng giữa tháng",
            VoucherCode = "ADV-1015",
            Amount = 50_000,
            CreatedAt = DateTime.UtcNow
        });
        db.EmployeeWorkRecords.Add(new EmployeeWorkRecordModel
        {
            EmployeeId = cashier.Id,
            WorkDate = new DateOnly(2026, 10, 15),
            ShiftNo = 1,
            CheckInAt = new DateTime(2026, 10, 15, 1, 0, 0, DateTimeKind.Utc),
            CheckOutAt = new DateTime(2026, 10, 15, 10, 0, 0, DateTimeKind.Utc),
            WorkedMinutes = 480,
            OvertimeMinutes = 60
        });
        await db.SaveChangesAsync();

        var service = CreateService(db);

        // Other employee has no approved payslips -> clean empty response
        var empty = await service.GetMyPayslipAsync(other.Id, null);
        Assert.False(empty.HasPayslip);
        Assert.Null(empty.EntryId);
        Assert.Empty(empty.AvailablePeriods);

        // Cashier sees only approved 10/2026 (not draft 11/2026) and real source drawers
        var mine = await service.GetMyPayslipAsync(cashier.Id, null);
        Assert.True(mine.HasPayslip);
        Assert.Equal("10/2026", mine.PeriodKey);
        Assert.Single(mine.AvailablePeriods);
        Assert.Single(mine.AttendanceDays);
        Assert.Single(mine.OvertimeEntries);
        var adv = Assert.Single(mine.AdvanceVouchers);
        Assert.Equal("ADV-1015", adv.VoucherCode);
    }

    [Fact]
    public async Task CreateDispute_enforces_self_ownership_draft_guard_and_consumes_cloudinary_proof()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var owner = NewEmployee(roles[RoleName.CASHIER], "Owner", "owner@cloud.io", "NV-0002");
        var intruder = NewEmployee(roles[RoleName.INVENTORY_MANAGER], "Intruder", "intruder@cloud.io", "NV-0003");
        db.Employees.AddRange(owner, intruder);

        var draftPeriod = new PayrollPeriodModel
        {
            Id = Guid.NewGuid(),
            PeriodKey = "11/2026",
            Year = 2026,
            Month = 11,
            PayrollCode = "PAY-202611",
            AttendanceSourceCode = "ATT-202611",
            Status = PayrollPeriodStatus.DRAFT
        };
        var settledPeriod = new PayrollPeriodModel
        {
            Id = Guid.NewGuid(),
            PeriodKey = "10/2026",
            Year = 2026,
            Month = 10,
            PayrollCode = "PAY-202610",
            AttendanceSourceCode = "ATT-202610",
            Status = PayrollPeriodStatus.SETTLED
        };
        db.PayrollPeriods.AddRange(draftPeriod, settledPeriod);

        var draftEntry = new PayrollEntryModel { Id = Guid.NewGuid(), PayrollPeriodId = draftPeriod.Id, EmployeeId = owner.Id };
        var settledEntry = new PayrollEntryModel { Id = Guid.NewGuid(), PayrollPeriodId = settledPeriod.Id, EmployeeId = owner.Id };
        db.PayrollEntries.AddRange(draftEntry, settledEntry);

        var intentId = Guid.NewGuid();
        var publicId = $"cloud-bookstore/private/disputes/{intentId:N}";
        db.UploadIntents.Add(new UploadIntentModel
        {
            Id = intentId,
            OwnerType = UploadOwnerType.PAYSLIP_DISPUTE_PROOF,
            PublicImageId = publicId,
            Status = UploadIntentStatus.PENDING,
            CreatedBy = owner.Id,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var service = CreateService(db);

        // Intruder cannot create dispute on owner's entry (403)
        await Assert.ThrowsAsync<ForbiddenException>(() => service.CreateDisputeAsync(
            intruder.Id, settledEntry.Id,
            new CreatePayslipDisputeRequest(PayslipDisputeCategory.ALLOWANCE, "Đối chiếu trái phép"),
            new AuditLogContext(intruder.Id, null)));

        // Draft payslip cannot receive dispute (409)
        await Assert.ThrowsAsync<ConflictException>(() => service.CreateDisputeAsync(
            owner.Id, draftEntry.Id,
            new CreatePayslipDisputeRequest(PayslipDisputeCategory.ALLOWANCE, "Kỳ chưa công bố"),
            new AuditLogContext(owner.Id, null)));

        // Blank content rejected (400)
        await Assert.ThrowsAsync<BadRequestException>(() => service.CreateDisputeAsync(
            owner.Id, settledEntry.Id,
            new CreatePayslipDisputeRequest(PayslipDisputeCategory.ALLOWANCE, "   "),
            new AuditLogContext(owner.Id, null)));

        var dispute = await service.CreateDisputeAsync(
            owner.Id, settledEntry.Id,
            new CreatePayslipDisputeRequest(
                PayslipDisputeCategory.ALLOWANCE,
                "Thiếu phụ cấp ca tối ngày 20/10.",
                new CloudinaryUploadResultRequest(intentId, publicId, 1, "sig", "asset1", "png", 512)),
            new AuditLogContext(owner.Id, null));

        Assert.StartsWith("DC-", dispute.DisputeCode);
        Assert.Equal(PayslipDisputeStatus.PENDING_RESPONSE, dispute.Status);
        Assert.Contains(publicId, dispute.ProofUrl);
        Assert.True(dispute.OwnedByActor);
        Assert.Equal(DateTimeKind.Utc, dispute.SubmittedAt.Kind);

        var audit = await db.AuditLogs.SingleAsync(a => a.Action == "CREATE_PAYSLIP_DISPUTE");
        Assert.Equal("payslip_dispute", audit.EntityType);
        Assert.Contains("\"Category\":\"ALLOWANCE\"", audit.AfterData);
    }

    [Fact]
    public async Task RespondDispute_enforces_maker_checker_and_creates_approved_next_period_adjustment()
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
        db.PayrollPeriods.Add(period);

        var adminEntry = new PayrollEntryModel { Id = Guid.NewGuid(), PayrollPeriodId = period.Id, EmployeeId = admin.Id };
        var cashierEntry = new PayrollEntryModel { Id = Guid.NewGuid(), PayrollPeriodId = period.Id, EmployeeId = cashier.Id };
        db.PayrollEntries.AddRange(adminEntry, cashierEntry);

        var ownDispute = new PayslipDisputeModel
        {
            Id = Guid.NewGuid(),
            DisputeCode = "DC-202610-0001",
            PayrollEntryId = adminEntry.Id,
            EmployeeId = admin.Id,
            Category = PayslipDisputeCategory.BONUS,
            Content = "Khiếu nại của chính Admin",
            Status = PayslipDisputeStatus.PENDING_RESPONSE,
            CreatedAt = DateTime.UtcNow
        };
        var cashierDispute = new PayslipDisputeModel
        {
            Id = Guid.NewGuid(),
            DisputeCode = "DC-202610-0002",
            PayrollEntryId = cashierEntry.Id,
            EmployeeId = cashier.Id,
            Category = PayslipDisputeCategory.OVERTIME,
            Content = "Thiếu 2 giờ OT ngày 22/10",
            Status = PayslipDisputeStatus.PENDING_RESPONSE,
            CreatedAt = DateTime.UtcNow
        };
        db.PayslipDisputes.AddRange(ownDispute, cashierDispute);
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var ctx = new AuditLogContext(admin.Id, null);

        // Maker-checker: Admin cannot respond to own dispute (403)
        await Assert.ThrowsAsync<ForbiddenException>(() => service.RespondDisputeAsync(
            admin.Id, ownDispute.Id,
            new RespondPayslipDisputeRequest(PayslipDisputeStatus.EXPLAINED, "Tự phản hồi"),
            ctx));

        // Blank response rejected (400)
        await Assert.ThrowsAsync<BadRequestException>(() => service.RespondDisputeAsync(
            admin.Id, cashierDispute.Id,
            new RespondPayslipDisputeRequest(PayslipDisputeStatus.EXPLAINED, "   "),
            ctx));

        // Approved next-period adjustment auto-creates APPROVED ADJ-* targeting 11/2026
        var resolved = await service.RespondDisputeAsync(
            admin.Id, cashierDispute.Id,
            new RespondPayslipDisputeRequest(
                PayslipDisputeStatus.APPROVED_NEXT_PERIOD_ADJUSTMENT,
                "Xác nhận thiếu 2 giờ OT, bù vào kỳ 11/2026.",
                CalculationNote: "2h × 30.000đ × 1.5 = 90.000đ",
                AdjustmentNote: "Bù vào kỳ 11/2026",
                AdjustmentAmount: 90_000,
                AdjustmentType: PayrollAdjustmentType.ADD_NEXT_PERIOD),
            ctx);

        Assert.Equal(PayslipDisputeStatus.APPROVED_NEXT_PERIOD_ADJUSTMENT, resolved.Status);
        Assert.False(string.IsNullOrWhiteSpace(resolved.LinkedAdjustmentCode));
        Assert.NotNull(resolved.RespondedAt);
        Assert.Equal(DateTimeKind.Utc, resolved.RespondedAt!.Value.Kind);

        var adj = await db.PayrollAdjustments.AsNoTracking().SingleAsync();
        Assert.Equal("11/2026", adj.TargetPeriodKey);
        Assert.Equal(PayrollAdjustmentStatus.APPROVED, adj.Status);
        Assert.Equal(90_000, adj.Amount);

        var respondAudit = await db.AuditLogs.AsNoTracking().SingleAsync(a => a.Action == "RESPOND_PAYSLIP_DISPUTE");
        Assert.Contains("\"Status\":\"PENDING_RESPONSE\"", respondAudit.BeforeData);
        Assert.Contains("\"Status\":\"APPROVED_NEXT_PERIOD_ADJUSTMENT\"", respondAudit.AfterData);

        var adjAudit = await db.AuditLogs.AsNoTracking().SingleAsync(a => a.Action == "CREATE_PAYROLL_ADJUSTMENT");
        Assert.Contains("\"AdjustmentType\":\"ADD_NEXT_PERIOD\"", adjAudit.AfterData);

        // Second response fails with 409 Conflict
        await Assert.ThrowsAsync<ConflictException>(() => service.RespondDisputeAsync(
            admin.Id, cashierDispute.Id,
            new RespondPayslipDisputeRequest(PayslipDisputeStatus.EXPLAINED, "Phản hồi lại"),
            ctx));
    }

    [Fact]
    public async Task ResendZalo_blocks_draft_and_queues_notification_with_audit()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var admin = NewEmployee(roles[RoleName.ADMIN], "Admin", "admin@cloud.io", "NV-0001");
        var cashier = NewEmployee(roles[RoleName.CASHIER], "Cashier", "cashier@cloud.io", "NV-0002", phone: "0908123456");
        db.Employees.AddRange(admin, cashier);

        var draftPeriod = new PayrollPeriodModel
        {
            Id = Guid.NewGuid(),
            PeriodKey = "11/2026",
            Year = 2026,
            Month = 11,
            PayrollCode = "PAY-202611",
            AttendanceSourceCode = "ATT-202611",
            Status = PayrollPeriodStatus.DRAFT
        };
        var settledPeriod = new PayrollPeriodModel
        {
            Id = Guid.NewGuid(),
            PeriodKey = "10/2026",
            Year = 2026,
            Month = 10,
            PayrollCode = "PAY-202610",
            AttendanceSourceCode = "ATT-202610",
            Status = PayrollPeriodStatus.SETTLED
        };
        db.PayrollPeriods.AddRange(draftPeriod, settledPeriod);

        var draftEntry = new PayrollEntryModel { Id = Guid.NewGuid(), PayrollPeriodId = draftPeriod.Id, EmployeeId = cashier.Id };
        var settledEntry = new PayrollEntryModel { Id = Guid.NewGuid(), PayrollPeriodId = settledPeriod.Id, EmployeeId = cashier.Id, NetPay = 500_000 };
        db.PayrollEntries.AddRange(draftEntry, settledEntry);
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var ctx = new AuditLogContext(admin.Id, null);

        await Assert.ThrowsAsync<ConflictException>(() => service.ResendZaloAsync(admin.Id, draftEntry.Id, ctx));

        var sent = await service.ResendZaloAsync(admin.Id, settledEntry.Id, ctx);
        Assert.Equal(ZaloDeliveryStatus.SENT, sent.Status);
        Assert.NotNull(sent.SentAt);
        Assert.Equal(DateTimeKind.Utc, sent.SentAt!.Value.Kind);
        Assert.Single(await db.NotificationOutbox.ToListAsync());
        Assert.Single(await db.AuditLogs.Where(a => a.Action == "RESEND_PAYSLIP_ZALO").ToListAsync());
    }

    private static AppDbContext CreateDbContext()
        => new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"HrPayslipTests_{Guid.NewGuid():N}")
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);

    private static HrPayslipService CreateService(AppDbContext db)
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
            Status = EmployeeStatus.ACTIVE
        };

    private sealed class FakeCloudinaryService : ICloudinaryService
    {
        public CloudinaryUploadPolicy GetPolicy(UploadOwnerType ownerType)
            => new("authenticated", "test-preset", "private/disputes");

        public CloudinaryUploadSignature CreateUploadSignature(UploadOwnerType ownerType, Guid intentId)
            => new("test-api-key", "https://api.cloudinary.com/v1_1/test/image/upload",
                $"cloud-bookstore/private/disputes/{intentId:N}", "cloud-bookstore/private/disputes",
                "test-preset", "authenticated", false, 1_735_689_100, "upload-signature");

        public bool VerifyUploadResponse(string publicImageId, long version, string responseSignature) => true;

        public string BuildImageUrl(string publicImageId, UploadOwnerType ownerType)
            => $"https://res.cloudinary.com/test/image/upload/{publicImageId}";

        public Task DestroyAsync(string publicImageId, UploadOwnerType ownerType, CancellationToken cancellationToken = default)
            => Task.CompletedTask;
    }
}
