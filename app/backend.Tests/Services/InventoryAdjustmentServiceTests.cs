using System.Reflection;
using backend.src.Controllers;
using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.InventoryAdjustmentDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace backend.Tests.Services;

public sealed class InventoryAdjustmentServiceTests
{
    private static readonly DateTime BaseTime = new(2026, 11, 12, 8, 0, 0, DateTimeKind.Utc);

    [Fact]
    public async Task CreateAsync_ByCopyId_CreatesInventoryCheckRequestAndAuditLog_WithoutChangingCopyStatus()
    {
        var dbName = NewDatabaseName();
        await using var context = CreateDbContext(dbName);
        var staffId = Guid.NewGuid();
        var copy = SeedCatalogAndCopy(context, staffId, status: BookCopyStatus.AVAILABLE);
        await context.SaveChangesAsync();

        var service = CreateService(context, new TestTimeProvider(BaseTime));

        var detail = await service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(
                CopyId: copy.Id,
                RequestedStatus: BookCopyStatus.LOST,
                Reason: "Không tìm thấy sách trên kệ A1 khi kiểm tra định kỳ"),
            new AuditLogContext(staffId, null));

        Assert.Equal(InventoryAdjustmentStatus.PENDING_APPROVAL, detail.Status);
        Assert.Equal(BookCopyStatus.AVAILABLE, detail.ExpectedStatus);
        Assert.Equal(BookCopyStatus.LOST, detail.RequestedStatus);
        Assert.Equal(InventoryVarianceType.MISSING, detail.VarianceType);
        Assert.False(detail.IsFound);
        Assert.StartsWith("ADJ-", detail.CheckCode);

        await using var verify = CreateDbContext(dbName);
        var updatedCopy = await verify.BookCopies.SingleAsync(c => c.Id == copy.Id);
        Assert.Equal(BookCopyStatus.AVAILABLE, updatedCopy.Status);

        var audit = Assert.Single(await verify.AuditLogs.ToListAsync());
        Assert.Equal(InventoryAdjustmentService.ActionCreate, audit.Action);
        Assert.Equal(InventoryAdjustmentService.AuditEntityType, audit.EntityType);
        Assert.Equal(detail.Id, audit.EntityId);
        Assert.Equal(staffId, audit.ActorId);
        Assert.Null(audit.BeforeData);
        Assert.NotNull(audit.AfterData);
    }

    [Fact]
    public async Task CreateAsync_ByCopyBarcode_NormalizesAndLinksCopy()
    {
        await using var context = CreateDbContext(NewDatabaseName());
        var staffId = Guid.NewGuid();
        var copy = SeedCatalogAndCopy(context, staffId, barcode: "BC000042");
        await context.SaveChangesAsync();

        var service = CreateService(context, new TestTimeProvider(BaseTime));

        var detail = await service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(
                CopyBarcode: " bc000042 ",
                RequestedStatus: BookCopyStatus.DAMAGED,
                Reason: "Sách bị rách gáy"),
            new AuditLogContext(staffId, null));

        Assert.Equal(copy.Id, detail.CopyId);
        Assert.Equal("BC000042", detail.CopyBarcode);
        Assert.Equal(InventoryVarianceType.DAMAGED, detail.VarianceType);
    }

    [Fact]
    public async Task CreateAsync_ValidationGuards_RejectInvalidInputsAndDuplicates()
    {
        await using var context = CreateDbContext(NewDatabaseName());
        var staffId = Guid.NewGuid();
        var copy = SeedCatalogAndCopy(context, staffId, status: BookCopyStatus.AVAILABLE);
        var rentedCopy = SeedCatalogAndCopy(context, staffId, barcode: "BC000002", status: BookCopyStatus.RENTED);
        var unpricedCopy = SeedCatalogAndCopy(context, staffId, barcode: "BC000003", status: BookCopyStatus.PENDING_RECEIPT, sellingPrice: null);
        await context.SaveChangesAsync();

        var service = CreateService(context, new TestTimeProvider(BaseTime));
        var actor = new AuditLogContext(staffId, null);

        await Assert.ThrowsAsync<UnauthorizedException>(() => service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: copy.Id, RequestedStatus: BookCopyStatus.LOST, Reason: "Missing"),
            new AuditLogContext(null, null)));

        await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(RequestedStatus: BookCopyStatus.LOST, Reason: "Missing"),
            actor));

        await Assert.ThrowsAsync<NotFoundException>(() => service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: Guid.NewGuid(), RequestedStatus: BookCopyStatus.LOST, Reason: "Missing"),
            actor));

        await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: copy.Id, RequestedStatus: BookCopyStatus.LOST, Reason: "   "),
            actor));

        await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: copy.Id, RequestedStatus: BookCopyStatus.LOST, Reason: new string('a', 501)),
            actor));

        await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: copy.Id, RequestedStatus: BookCopyStatus.LOST, Reason: "Missing", CheckCode: new string('X', 21)),
            actor));

        await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: copy.Id, RequestedStatus: BookCopyStatus.AVAILABLE, Reason: "Same status"),
            actor));

        await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: copy.Id, RequestedStatus: BookCopyStatus.SOLD, Reason: "Manual sold forbidden"),
            actor));

        await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: rentedCopy.Id, RequestedStatus: BookCopyStatus.LOST, Reason: "Locked source"),
            actor));

        await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: unpricedCopy.Id, RequestedStatus: BookCopyStatus.AVAILABLE, Reason: "Missing price"),
            actor));

        await service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: copy.Id, RequestedStatus: BookCopyStatus.LOST, Reason: "Valid first request"),
            actor);

        await Assert.ThrowsAsync<ConflictException>(() => service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: copy.Id, RequestedStatus: BookCopyStatus.DAMAGED, Reason: "Duplicate pending"),
            actor));
    }

    [Fact]
    public async Task UpdateStatusAsync_EnforcesAdminOnlyAndPreventsSelfApproval()
    {
        await using var context = CreateDbContext(NewDatabaseName());
        var requesterId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        context.Employees.Add(NewEmployee(adminId, "Admin", "admin@cloud.io"));
        var copy = SeedCatalogAndCopy(context, requesterId, status: BookCopyStatus.AVAILABLE);
        await context.SaveChangesAsync();

        var service = CreateService(context, new TestTimeProvider(BaseTime));

        var created = await service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: copy.Id, RequestedStatus: BookCopyStatus.DAMAGED, Reason: "Bìa rách"),
            new AuditLogContext(requesterId, null));

        await Assert.ThrowsAsync<ForbiddenException>(() => service.UpdateStatusAsync(
            created.Id,
            new UpdateInventoryAdjustmentStatusDto(InventoryAdjustmentStatus.APPLIED, "Inventory manager tries self apply"),
            isAdmin: false,
            new AuditLogContext(Guid.NewGuid(), null)));

        var adminRequestCopy = SeedCatalogAndCopy(context, adminId, barcode: "BC000099", status: BookCopyStatus.AVAILABLE, addEmployee: false);
        await context.SaveChangesAsync();

        var adminCreated = await service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: adminRequestCopy.Id, RequestedStatus: BookCopyStatus.LOST, Reason: "Admin created"),
            new AuditLogContext(adminId, null));

        await Assert.ThrowsAsync<ForbiddenException>(() => service.UpdateStatusAsync(
            adminCreated.Id,
            new UpdateInventoryAdjustmentStatusDto(InventoryAdjustmentStatus.APPROVED, "Self approve"),
            isAdmin: true,
            new AuditLogContext(adminId, null)));
    }

    [Fact]
    public async Task UpdateStatusAsync_TwoStepApproveAndApply_UpdatesBookCopyAndWritesBothAuditLogs()
    {
        var dbName = NewDatabaseName();
        await using var context = CreateDbContext(dbName);
        var requesterId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        context.Employees.Add(NewEmployee(adminId, "Admin", "admin@cloud.io"));
        var copy = SeedCatalogAndCopy(context, requesterId, status: BookCopyStatus.AVAILABLE);
        await context.SaveChangesAsync();

        var time = new TestTimeProvider(BaseTime);
        var service = CreateService(context, time);

        var created = await service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: copy.Id, RequestedStatus: BookCopyStatus.DAMAGED, Reason: "Thấm nước khi kiểm kê"),
            new AuditLogContext(requesterId, null));

        time.Advance(TimeSpan.FromHours(1));
        var approved = await service.UpdateStatusAsync(
            created.Id,
            new UpdateInventoryAdjustmentStatusDto(InventoryAdjustmentStatus.APPROVED, "Đã kiểm tra biên bản"),
            isAdmin: true,
            new AuditLogContext(adminId, null));

        Assert.Equal(InventoryAdjustmentStatus.APPROVED, approved.Status);
        Assert.Equal(adminId, approved.ApprovedBy);
        Assert.Equal(BookCopyStatus.AVAILABLE, approved.CurrentCopyStatus);
        Assert.Null(approved.AppliedAt);

        time.Advance(TimeSpan.FromHours(1));
        var applied = await service.UpdateStatusAsync(
            created.Id,
            new UpdateInventoryAdjustmentStatusDto(InventoryAdjustmentStatus.APPLIED, "Xác nhận chuyển DAMAGED"),
            isAdmin: true,
            new AuditLogContext(adminId, null));

        Assert.Equal(InventoryAdjustmentStatus.APPLIED, applied.Status);
        Assert.Equal(BookCopyStatus.DAMAGED, applied.CurrentCopyStatus);
        Assert.NotNull(applied.AppliedAt);
        Assert.Equal(3, applied.History.Count);

        await using var verify = CreateDbContext(dbName);
        Assert.Equal(BookCopyStatus.DAMAGED, (await verify.BookCopies.SingleAsync(c => c.Id == copy.Id)).Status);
        Assert.Contains(await verify.AuditLogs.ToListAsync(), a =>
            a.EntityType == InventoryAdjustmentService.BookCopyAuditEntityType &&
            a.EntityId == copy.Id &&
            a.Action == InventoryAdjustmentService.BookCopyStatusAction);

        await Assert.ThrowsAsync<BadRequestException>(() => service.UpdateStatusAsync(
            created.Id,
            new UpdateInventoryAdjustmentStatusDto(InventoryAdjustmentStatus.APPLIED, "Re-apply"),
            isAdmin: true,
            new AuditLogContext(adminId, null)));

        await Assert.ThrowsAsync<ConflictException>(() => service.UpdateStatusAsync(
            created.Id,
            new UpdateInventoryAdjustmentStatusDto(InventoryAdjustmentStatus.REJECTED, "Reject after apply"),
            isAdmin: true,
            new AuditLogContext(adminId, null)));
    }

    [Fact]
    public async Task UpdateStatusAsync_RejectAndCancelFlows_EnforceReasonAndTerminalStates()
    {
        await using var context = CreateDbContext(NewDatabaseName());
        var requesterId = Guid.NewGuid();
        var otherStaffId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        context.Employees.AddRange(
            NewEmployee(otherStaffId, "Other", "other@cloud.io"),
            NewEmployee(adminId, "Admin", "admin@cloud.io"));
        var copy1 = SeedCatalogAndCopy(context, requesterId, barcode: "BC000011", status: BookCopyStatus.AVAILABLE);
        var copy2 = SeedCatalogAndCopy(context, requesterId, barcode: "BC000012", status: BookCopyStatus.AVAILABLE, addEmployee: false);
        await context.SaveChangesAsync();

        var service = CreateService(context, new TestTimeProvider(BaseTime));

        var req1 = await service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: copy1.Id, RequestedStatus: BookCopyStatus.LOST, Reason: "Nghi mất"),
            new AuditLogContext(requesterId, null));

        await Assert.ThrowsAsync<BadRequestException>(() => service.UpdateStatusAsync(
            req1.Id,
            new UpdateInventoryAdjustmentStatusDto(InventoryAdjustmentStatus.REJECTED, "  "),
            isAdmin: true,
            new AuditLogContext(adminId, null)));

        var rejected = await service.UpdateStatusAsync(
            req1.Id,
            new UpdateInventoryAdjustmentStatusDto(InventoryAdjustmentStatus.REJECTED, "Đã tìm thấy sách tại quầy"),
            isAdmin: true,
            new AuditLogContext(adminId, null));

        Assert.Equal(InventoryAdjustmentStatus.REJECTED, rejected.Status);
        Assert.Equal("Đã tìm thấy sách tại quầy", rejected.RejectionReason);
        Assert.Equal(BookCopyStatus.AVAILABLE, rejected.CurrentCopyStatus);

        var req2 = await service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: copy2.Id, RequestedStatus: BookCopyStatus.LOST, Reason: "Ghi nhầm"),
            new AuditLogContext(requesterId, null));

        await Assert.ThrowsAsync<ForbiddenException>(() => service.CancelAsync(
            req2.Id,
            new CancelInventoryAdjustmentRequestDto("Cancel by another staff"),
            isAdmin: false,
            new AuditLogContext(otherStaffId, null)));

        var cancelled = await service.CancelAsync(
            req2.Id,
            new CancelInventoryAdjustmentRequestDto("Nhập nhầm bản sách"),
            isAdmin: false,
            new AuditLogContext(requesterId, null));

        Assert.Equal(InventoryAdjustmentStatus.CANCELLED, cancelled.Status);
        await Assert.ThrowsAsync<ConflictException>(() => service.UpdateStatusAsync(
            req2.Id,
            new UpdateInventoryAdjustmentStatusDto(InventoryAdjustmentStatus.APPROVED, "Approve cancelled"),
            isAdmin: true,
            new AuditLogContext(adminId, null)));
    }

    [Fact]
    public async Task DeleteByRetentionAsync_EnforcesRetentionWindowAndPreservesAuditLogs()
    {
        var dbName = NewDatabaseName();
        await using var context = CreateDbContext(dbName);
        var requesterId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        context.Employees.Add(NewEmployee(adminId, "Admin", "admin@cloud.io"));
        var copy = SeedCatalogAndCopy(context, requesterId, status: BookCopyStatus.AVAILABLE);
        await context.SaveChangesAsync();

        var time = new TestTimeProvider(BaseTime);
        var service = CreateService(context, time);

        var created = await service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: copy.Id, RequestedStatus: BookCopyStatus.DAMAGED, Reason: "Hỏng gáy"),
            new AuditLogContext(requesterId, null));

        await Assert.ThrowsAsync<ConflictException>(() =>
            service.DeleteByRetentionAsync(created.Id, isAdmin: true, new AuditLogContext(adminId, null)));

        var applied = await service.UpdateStatusAsync(
            created.Id,
            new UpdateInventoryAdjustmentStatusDto(InventoryAdjustmentStatus.APPLIED, "Đã xử lý xong"),
            isAdmin: true,
            new AuditLogContext(adminId, null));

        Assert.False(applied.CanDeleteByRetention);

        time.Advance(TimeSpan.FromDays(364));
        await Assert.ThrowsAsync<ConflictException>(() =>
            service.DeleteByRetentionAsync(created.Id, isAdmin: true, new AuditLogContext(adminId, null)));

        time.Advance(TimeSpan.FromDays(1));
        var readyDetail = await service.GetByIdAsync(created.Id);
        Assert.True(readyDetail.CanDeleteByRetention);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            service.DeleteByRetentionAsync(created.Id, isAdmin: false, new AuditLogContext(requesterId, null)));

        await service.DeleteByRetentionAsync(created.Id, isAdmin: true, new AuditLogContext(adminId, null));

        await using var verify = CreateDbContext(dbName);
        Assert.Empty(await verify.InventoryAdjustmentRequests.ToListAsync());
        Assert.Single(await verify.InventoryChecks.ToListAsync());
        Assert.Contains(await verify.AuditLogs.ToListAsync(), a =>
            a.EntityId == created.Id && a.Action == InventoryAdjustmentService.ActionRetentionDelete);
        Assert.True((await verify.AuditLogs.CountAsync(a => a.EntityId == created.Id)) >= 3);
    }

    [Fact]
    public async Task GetRequestsAsync_SupportsFilteringPaginationAndStats()
    {
        await using var context = CreateDbContext(NewDatabaseName());
        var requesterId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        context.Employees.Add(NewEmployee(adminId, "Admin", "admin@cloud.io"));
        var copy1 = SeedCatalogAndCopy(context, requesterId, barcode: "BC000101", status: BookCopyStatus.AVAILABLE);
        var copy2 = SeedCatalogAndCopy(context, requesterId, barcode: "BC000102", status: BookCopyStatus.AVAILABLE, addEmployee: false);
        var copy3 = SeedCatalogAndCopy(context, requesterId, barcode: "BC000103", status: BookCopyStatus.AVAILABLE, addEmployee: false);
        await context.SaveChangesAsync();

        var time = new TestTimeProvider(BaseTime);
        var service = CreateService(context, time);

        var r1 = await service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: copy1.Id, RequestedStatus: BookCopyStatus.LOST, Reason: "Thiếu ở kệ A", CheckCode: "CHK-01"),
            new AuditLogContext(requesterId, null));

        time.Advance(TimeSpan.FromMinutes(1));
        var r2 = await service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: copy2.Id, RequestedStatus: BookCopyStatus.DAMAGED, Reason: "Ẩm mốc", CheckCode: "CHK-02"),
            new AuditLogContext(requesterId, null));

        time.Advance(TimeSpan.FromMinutes(1));
        await service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: copy3.Id, RequestedStatus: BookCopyStatus.DISCONTINUED, Reason: "Ngừng lưu hành", CheckCode: "CHK-03"),
            new AuditLogContext(requesterId, null));

        await service.UpdateStatusAsync(
            r1.Id,
            new UpdateInventoryAdjustmentStatusDto(InventoryAdjustmentStatus.APPLIED, "Áp dụng"),
            isAdmin: true,
            new AuditLogContext(adminId, null));

        await service.UpdateStatusAsync(
            r2.Id,
            new UpdateInventoryAdjustmentStatusDto(InventoryAdjustmentStatus.REJECTED, "Còn dùng được"),
            isAdmin: true,
            new AuditLogContext(adminId, null));

        var pendingPage = await service.GetRequestsAsync(new InventoryAdjustmentQuery
        {
            Status = InventoryAdjustmentStatus.PENDING_APPROVAL,
            Page = 1,
            PageSize = 10
        });
        Assert.Equal(1, pendingPage.TotalCount);
        Assert.Equal("CHK-03", Assert.Single(pendingPage.Items).CheckCode);

        var searchPage = await service.GetRequestsAsync(new InventoryAdjustmentQuery
        {
            Search = "BC000102",
            Page = 1,
            PageSize = 10
        });
        Assert.Equal(1, searchPage.TotalCount);
        Assert.Equal(r2.Id, Assert.Single(searchPage.Items).Id);

        var paged = await service.GetRequestsAsync(new InventoryAdjustmentQuery { Page = 1, PageSize = 2 });
        Assert.Equal(3, paged.TotalCount);
        Assert.Equal(2, paged.TotalPages);
        Assert.Equal(2, paged.Items.Count);
        Assert.True(paged.HasNextPage);

        var stats = await service.GetStatsAsync();
        Assert.Equal(1, stats.PendingCount);
        Assert.Equal(1, stats.AppliedCount);
        Assert.Equal(1, stats.RejectedCount);
        Assert.Equal(3, stats.TotalCount);

        await Assert.ThrowsAsync<BadRequestException>(() => service.GetRequestsAsync(new InventoryAdjustmentQuery { Page = 0 }));
        await Assert.ThrowsAsync<BadRequestException>(() => service.GetRequestsAsync(new InventoryAdjustmentQuery { PageSize = 101 }));
    }

    [Fact]
    public void ControllerActions_EnforceStrictRoleAttributes()
    {
        var controllerType = typeof(InventoryAdjustmentRequestsController);

        AssertRoles(controllerType, nameof(InventoryAdjustmentRequestsController.GetRequests), "ADMIN,INVENTORY_MANAGER");
        AssertRoles(controllerType, nameof(InventoryAdjustmentRequestsController.GetStats), "ADMIN,INVENTORY_MANAGER");
        AssertRoles(controllerType, nameof(InventoryAdjustmentRequestsController.GetRequestById), "ADMIN,INVENTORY_MANAGER");
        AssertRoles(controllerType, nameof(InventoryAdjustmentRequestsController.CreateRequest), "ADMIN,INVENTORY_MANAGER");
        AssertRoles(controllerType, nameof(InventoryAdjustmentRequestsController.CancelRequest), "ADMIN,INVENTORY_MANAGER");
        AssertRoles(controllerType, nameof(InventoryAdjustmentRequestsController.UpdateRequestStatus), "ADMIN");
        AssertRoles(controllerType, nameof(InventoryAdjustmentRequestsController.DeleteExpiredRequest), "ADMIN");
    }

    [Fact]
    public async Task UpdateStatusAsync_DirectApplyAndConcurrentRentalGuard_BehaveSafely()
    {
        await using var context = CreateDbContext(NewDatabaseName());
        var requesterId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        context.Employees.Add(NewEmployee(adminId, "Admin", "admin@cloud.io"));
        var copy1 = SeedCatalogAndCopy(context, requesterId, barcode: "BC000201", status: BookCopyStatus.AVAILABLE);
        var copy2 = SeedCatalogAndCopy(context, requesterId, barcode: "BC000202", status: BookCopyStatus.AVAILABLE, addEmployee: false);
        await context.SaveChangesAsync();

        var service = CreateService(context, new TestTimeProvider(BaseTime));

        var directReq = await service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: copy1.Id, RequestedStatus: BookCopyStatus.DISCONTINUED, Reason: "Sách cũ ngừng lưu hành"),
            new AuditLogContext(requesterId, null));

        var directApplied = await service.UpdateStatusAsync(
            directReq.Id,
            new UpdateInventoryAdjustmentStatusDto(InventoryAdjustmentStatus.APPLIED, "Duyệt và áp dụng ngay"),
            isAdmin: true,
            new AuditLogContext(adminId, null));

        Assert.Equal(InventoryAdjustmentStatus.APPLIED, directApplied.Status);
        Assert.Equal(BookCopyStatus.DISCONTINUED, directApplied.CurrentCopyStatus);
        Assert.Equal(adminId, directApplied.ApprovedBy);

        var guardedReq = await service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: copy2.Id, RequestedStatus: BookCopyStatus.DAMAGED, Reason: "Phát hiện rách"),
            new AuditLogContext(requesterId, null));

        copy2.Status = BookCopyStatus.RENTED;
        await context.SaveChangesAsync();

        await Assert.ThrowsAsync<BadRequestException>(() => service.UpdateStatusAsync(
            guardedReq.Id,
            new UpdateInventoryAdjustmentStatusDto(InventoryAdjustmentStatus.APPLIED, "Cố áp dụng khi sách đã cho thuê"),
            isAdmin: true,
            new AuditLogContext(adminId, null)));
    }

    [Fact]
    public async Task DeleteByRetentionAsync_UsesConfiguredSystemSettingDays()
    {
        await using var context = CreateDbContext(NewDatabaseName());
        var requesterId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        context.Employees.Add(NewEmployee(adminId, "Admin", "admin@cloud.io"));
        context.SystemSettings.Add(new SystemSettingModel
        {
            Key = InventoryAdjustmentService.RetentionSettingKey,
            Value = 30m,
            Unit = "days"
        });
        var copy = SeedCatalogAndCopy(context, requesterId, barcode: "BC000203", status: BookCopyStatus.AVAILABLE);
        await context.SaveChangesAsync();

        var time = new TestTimeProvider(BaseTime);
        var service = CreateService(context, time);

        var created = await service.CreateAsync(
            new CreateInventoryAdjustmentRequestDto(CopyId: copy.Id, RequestedStatus: BookCopyStatus.LOST, Reason: "Mất"),
            new AuditLogContext(requesterId, null));

        await service.UpdateStatusAsync(
            created.Id,
            new UpdateInventoryAdjustmentStatusDto(InventoryAdjustmentStatus.REJECTED, "Đã tìm thấy"),
            isAdmin: true,
            new AuditLogContext(adminId, null));

        time.Advance(TimeSpan.FromDays(29));
        await Assert.ThrowsAsync<ConflictException>(() =>
            service.DeleteByRetentionAsync(created.Id, isAdmin: true, new AuditLogContext(adminId, null)));

        time.Advance(TimeSpan.FromDays(1));
        await service.DeleteByRetentionAsync(created.Id, isAdmin: true, new AuditLogContext(adminId, null));
        Assert.Empty(await context.InventoryAdjustmentRequests.ToListAsync());
    }

    private static void AssertRoles(Type controllerType, string methodName, string expectedRoles)
    {
        var method = controllerType.GetMethod(methodName, BindingFlags.Public | BindingFlags.Instance);
        Assert.NotNull(method);
        var authorize = method!.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(authorize);
        Assert.Equal(expectedRoles, authorize!.Roles);
    }

    private static string NewDatabaseName() => Guid.NewGuid().ToString("N");

    private static AppDbContext CreateDbContext(string databaseName)
        => new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName)
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);

    private static InventoryAdjustmentService CreateService(AppDbContext dbContext, TimeProvider timeProvider)
        => new(
            dbContext,
            new AuditLogService(dbContext),
            NullLogger<InventoryAdjustmentService>.Instance,
            timeProvider);

    private static EmployeeModel NewEmployee(Guid id, string fullName = "Inventory Staff", string email = "inventory@cloud.io")
        => new()
        {
            Id = id,
            Email = email,
            FullName = fullName,
            Password = "hash",
            Phone = "0900000001"
        };

    private static BookCopyModel SeedCatalogAndCopy(
        AppDbContext dbContext,
        Guid staffId,
        string barcode = "BC000001",
        BookCopyStatus status = BookCopyStatus.AVAILABLE,
        long? sellingPrice = 100_000,
        bool addEmployee = true)
    {
        if (addEmployee && !dbContext.Employees.Local.Any(e => e.Id == staffId))
        {
            dbContext.Employees.Add(NewEmployee(staffId));
        }

        var title = new TitleModel { Name = $"Title {barcode}" };
        var edition = new EditionModel { TitleId = title.Id, Isbn = "9780000000001", CoverPrice = 120_000 };
        var receipt = new StockReceiptModel { Code = $"PN-{Guid.NewGuid().ToString("N")[..6]}", SourceType = StockReceiptSourceType.SUPPLIER, CreatedBy = staffId };
        var line = new StockReceiptLineModel { ReceiptId = receipt.Id, EditionId = edition.Id, Quantity = 1, UnitCost = 50_000 };
        var copy = new BookCopyModel
        {
            CopyBarcode = barcode,
            EditionId = edition.Id,
            ReceiptLineId = line.Id,
            ConditionGrade = ConditionGrade.A,
            Availability = BookChannelAvailability.BOTH,
            Status = status,
            CostPrice = 50_000,
            SellingPrice = sellingPrice,
            RentalRate = sellingPrice.HasValue ? 5_000 : null
        };

        dbContext.Titles.Add(title);
        dbContext.Editions.Add(edition);
        dbContext.StockReceipts.Add(receipt);
        dbContext.StockReceiptLines.Add(line);
        dbContext.BookCopies.Add(copy);
        return copy;
    }

    private sealed class TestTimeProvider(DateTime initialUtc) : TimeProvider
    {
        private DateTimeOffset _current = new(DateTime.SpecifyKind(initialUtc, DateTimeKind.Utc));

        public override DateTimeOffset GetUtcNow() => _current;

        public void Advance(TimeSpan delta) => _current = _current.Add(delta);
    }
}
