using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.HrRequestDto;
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

public sealed class HrRequestServiceTests
{
    private static readonly DateOnly ApplyDate = new(2026, 11, 20);

    [Fact]
    public async Task ListAsync_scopes_mine_to_actor_and_pending_queue_to_admin ()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var requester = NewEmployee(roles[RoleName.CASHIER], "Requester", "requester@comicpos.vn", "NV-0001");
        var other = NewEmployee(roles[RoleName.CASHIER], "Other", "other@comicpos.vn", "NV-0002");
        var admin = NewEmployee(roles[RoleName.ADMIN], "Admin", "admin@comicpos.vn", "NV-0003");
        db.Employees.AddRange(requester, other, admin);
        db.HrRequests.AddRange(
            NewRequest(requester.Id, HrRequestStatus.PENDING),
            NewRequest(other.Id, HrRequestStatus.PENDING),
            NewRequest(other.Id, HrRequestStatus.APPROVED));
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var mine = await service.ListAsync(requester.Id, new HrRequestQuery("mine"), isAdmin: false);
        Assert.Single(mine.MyRequests);
        Assert.Empty(mine.ApprovalQueue);
        Assert.Equal(1, mine.MyCount);
        Assert.Equal(2, mine.PendingApprovalCount);

        var adminView = await service.ListAsync(admin.Id, new HrRequestQuery("pending"), isAdmin: true);
        Assert.Empty(adminView.MyRequests);
        Assert.Equal(2, adminView.ApprovalQueue.Count);
        Assert.All(adminView.ApprovalQueue, item => Assert.Equal("pending", item.Status.ToString().ToLowerInvariant()));
    }

    [Fact]
    public async Task GetOptionsAsync_lists_active_peers_and_actor_work_records ()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var actor = NewEmployee(roles[RoleName.CASHIER], "Actor", "actor@comicpos.vn", "NV-0001");
        var peer = NewEmployee(roles[RoleName.CASHIER], "Peer", "peer@comicpos.vn", "NV-0002");
        var inactive = NewEmployee(roles[RoleName.CASHIER], "Inactive", "inactive@comicpos.vn", "NV-0003",
            status: EmployeeStatus.LOCKED);
        db.Employees.AddRange(actor, peer, inactive);
        db.EmployeeWorkRecords.Add(new EmployeeWorkRecordModel
        {
            EmployeeId = actor.Id,
            WorkDate = ApplyDate,
            ShiftNo = 2,
            AttendanceStatus = AttendanceStatus.INCOMPLETE
        });
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var options = await service.GetOptionsAsync(actor.Id);

        Assert.Single(options.Employees);
        Assert.Equal(peer.Id.ToString(), options.Employees[0].Value);
        Assert.Contains("NV-0002", options.Employees[0].Label);
        Assert.Single(options.WorkRecords);
        Assert.Equal(ApplyDate, options.WorkRecords[0].ApplyDate);
        Assert.Equal(2, (int)(options.WorkRecords[0].ShiftNo ?? 0));
    }

    [Fact]
    public async Task CreateAsync_derives_requester_from_actor_and_writes_audit ()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var requester = NewEmployee(roles[RoleName.CASHIER], "Requester", "requester@comicpos.vn", "NV-0001");
        var replacement = NewEmployee(roles[RoleName.CASHIER], "Replacement", "replacement@comicpos.vn", "NV-0002");
        db.Employees.AddRange(requester, replacement);
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var created = await service.CreateAsync(requester.Id, new CreateHrRequestRequest(
            HrRequestType.LEAVE, ApplyDate, 1, null, replacement.Id, null, null, "Xin nghỉ phép gia đình."),
            new AuditLogContext(requester.Id, null));

        Assert.Equal(requester.Id, created.RequesterId);
        Assert.Equal(HrRequestStatus.PENDING, created.Status);
        Assert.Equal("Replacement", created.ReplacementName);
        Assert.StartsWith("HR-", created.RequestCode);

        var persisted = await db.HrRequests.SingleAsync();
        Assert.Equal(requester.Id, persisted.RequesterId);
        Assert.Contains(await db.HrRequestHistories.ToListAsync(), history => history.Action == "SUBMITTED");
        var audit = await db.AuditLogs.SingleAsync();
        Assert.Equal("CREATE_HR_REQUEST", audit.Action);
        Assert.Equal("hr_request", audit.EntityType);
    }

    [Fact]
    public async Task CreateAsync_validates_shift_swap_and_reason ()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var requester = NewEmployee(roles[RoleName.CASHIER], "Requester", "requester@comicpos.vn", "NV-0001");
        db.Employees.Add(requester);
        await db.SaveChangesAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(requester.Id,
            new CreateHrRequestRequest(HrRequestType.SHIFT_SWAP, ApplyDate, 1, null, null, null, null, "Đổi ca"),
            new AuditLogContext(requester.Id, null)));

        await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(requester.Id,
            new CreateHrRequestRequest(HrRequestType.LEAVE, ApplyDate, 1, null, null, null, null, "   "),
            new AuditLogContext(requester.Id, null)));
    }

    [Fact]
    public async Task CancelAsync_only_allows_the_requester_to_cancel_a_pending_request ()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var requester = NewEmployee(roles[RoleName.CASHIER], "Requester", "requester@comicpos.vn", "NV-0001");
        var other = NewEmployee(roles[RoleName.CASHIER], "Other", "other@comicpos.vn", "NV-0002");
        db.Employees.AddRange(requester, other);
        var pending = NewRequest(requester.Id, HrRequestStatus.PENDING);
        var approved = NewRequest(requester.Id, HrRequestStatus.APPROVED);
        db.HrRequests.AddRange(pending, approved);
        await db.SaveChangesAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<ForbiddenException>(() => service.CancelAsync(other.Id, pending.Id,
            new AuditLogContext(other.Id, null)));

        await Assert.ThrowsAsync<ConflictException>(() => service.CancelAsync(requester.Id, approved.Id,
            new AuditLogContext(requester.Id, null)));

        var cancelled = await service.CancelAsync(requester.Id, pending.Id, new AuditLogContext(requester.Id, null));
        Assert.Equal(HrRequestStatus.CANCELLED, cancelled.Status);
    }

    [Fact]
    public async Task ReviewAsync_enforces_maker_checker_and_pending_state ()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var requester = NewEmployee(roles[RoleName.CASHIER], "Requester", "requester@comicpos.vn", "NV-0001");
        var admin = NewEmployee(roles[RoleName.ADMIN], "Admin", "admin@comicpos.vn", "NV-0002");
        db.Employees.AddRange(requester, admin);
        var pending = NewRequest(requester.Id, HrRequestStatus.PENDING);
        var approved = NewRequest(requester.Id, HrRequestStatus.APPROVED);
        db.HrRequests.AddRange(pending, approved);
        await db.SaveChangesAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<BadRequestException>(() => service.ReviewAsync(admin.Id, pending.Id,
            new HrRequestReviewRequest(HrRequestStatus.APPROVED, "  "), new AuditLogContext(admin.Id, null)));

        await Assert.ThrowsAsync<ForbiddenException>(() => service.ReviewAsync(requester.Id, pending.Id,
            new HrRequestReviewRequest(HrRequestStatus.APPROVED, "Self approve"), new AuditLogContext(requester.Id, null)));

        await Assert.ThrowsAsync<ConflictException>(() => service.ReviewAsync(admin.Id, approved.Id,
            new HrRequestReviewRequest(HrRequestStatus.APPROVED, "Already done"), new AuditLogContext(admin.Id, null)));
    }

    [Fact]
    public async Task ReviewAsync_approving_attendance_explanation_updates_work_record_atomically_with_audit ()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var requester = NewEmployee(roles[RoleName.CASHIER], "Requester", "requester@comicpos.vn", "NV-0001");
        var admin = NewEmployee(roles[RoleName.ADMIN], "Admin", "admin@comicpos.vn", "NV-0002");
        db.Employees.AddRange(requester, admin);
        var workRecord = new EmployeeWorkRecordModel
        {
            EmployeeId = requester.Id,
            WorkDate = ApplyDate,
            ShiftNo = 1,
            CheckInAt = null,
            CheckOutAt = null,
            AttendanceStatus = AttendanceStatus.INCOMPLETE,
            WorkedMinutes = 0,
            OvertimeMinutes = 0,
            ShiftSalary = 250_000
        };
        db.EmployeeWorkRecords.Add(workRecord);
        var request = new HrRequestModel
        {
            Id = Guid.NewGuid(),
            RequestCode = "HR-20261120-ATT001",
            Type = HrRequestType.ATTENDANCE_EXPLANATION,
            RequesterId = requester.Id,
            ApplyDate = ApplyDate,
            ShiftNo = 1,
            CorrectCheckInAt = ApplyDate.ToDateTime(new TimeOnly(8, 0)),
            CorrectCheckOutAt = ApplyDate.ToDateTime(new TimeOnly(14, 0)),
            Reason = "Máy chấm công mất mạng.",
            Status = HrRequestStatus.PENDING
        };
        db.HrRequests.Add(request);
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var reviewed = await service.ReviewAsync(admin.Id, request.Id,
            new HrRequestReviewRequest(HrRequestStatus.APPROVED, "Đã đối chiếu camera quầy."),
            new AuditLogContext(admin.Id, null));

        Assert.Equal(HrRequestStatus.APPROVED, reviewed.Status);
        Assert.Equal("Admin", reviewed.ReviewedBy);
        Assert.Equal("Đã đối chiếu camera quầy.", reviewed.ReviewNote);
        Assert.Contains(reviewed.History, entry => entry.Action == "APPROVED" && entry.Note == "Đã đối chiếu camera quầy.");

        var updatedRecord = await db.EmployeeWorkRecords.SingleAsync();
        Assert.Equal(ApplyDate.ToDateTime(new TimeOnly(8, 0)), updatedRecord.CheckInAt);
        Assert.Equal(ApplyDate.ToDateTime(new TimeOnly(14, 0)), updatedRecord.CheckOutAt);
        Assert.Equal(360, updatedRecord.WorkedMinutes);
        Assert.Equal(60, updatedRecord.OvertimeMinutes);
        Assert.Equal(AttendanceStatus.PRESENT, updatedRecord.AttendanceStatus);
        Assert.Equal(admin.Id, updatedRecord.ApprovedBy);
        Assert.NotNull(updatedRecord.ApprovedAt);
        Assert.Equal("Đã đối chiếu camera quầy.", updatedRecord.AdjustmentReason);

        var audits = await db.AuditLogs.ToListAsync();
        Assert.Contains(audits, audit => audit.Action == "APPROVE_ATTENDANCE_ADJUSTMENT");
        Assert.Contains(audits, audit => audit.Action == "REVIEW_HR_REQUEST" && audit.EntityType == "hr_request");
    }

    private static AppDbContext CreateDbContext()
        => new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);

    private static HrRequestService CreateService(AppDbContext db)
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
        EmployeeStatus status = EmployeeStatus.ACTIVE)
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
            Status = status
        };

    private static HrRequestModel NewRequest(Guid requesterId, HrRequestStatus status)
        => new()
        {
            Id = Guid.NewGuid(),
            RequestCode = $"HR-20261120-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}",
            Type = HrRequestType.LEAVE,
            RequesterId = requesterId,
            ApplyDate = ApplyDate,
            ShiftNo = 1,
            Reason = "Yêu cầu thử nghiệm.",
            Status = status,
            CreatedAt = DateTime.UtcNow
        };

    private sealed class FakeCloudinaryService : ICloudinaryService
    {
        public CloudinaryUploadPolicy GetPolicy(UploadOwnerType ownerType)
            => new("authenticated", "test-preset", "private/hr/requests");

        public CloudinaryUploadSignature CreateUploadSignature(UploadOwnerType ownerType, Guid intentId)
            => new("test-api-key", "https://api.cloudinary.com/v1_1/test/image/upload",
                $"cloud-bookstore/private/hr/requests/{intentId:N}", "cloud-bookstore/private/hr/requests",
                "test-preset", "authenticated", false, 1_735_689_100, "upload-signature");

        public bool VerifyUploadResponse(string publicImageId, long version, string responseSignature) => true;

        public string BuildImageUrl(string publicImageId, UploadOwnerType ownerType)
            => $"https://res.cloudinary.com/test/image/upload/{publicImageId}";

        public Task DestroyAsync(string publicImageId, UploadOwnerType ownerType, CancellationToken cancellationToken = default)
            => Task.CompletedTask;
    }
}
