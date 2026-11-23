using backend.src.Data;
using backend.src.Dto.ApprovalDto;
using backend.src.Dto.AuditLogDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using backend.src.Services.ApprovalServices;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Xunit;

namespace backend.Tests.Services;

public sealed class ApprovalServiceTests
{
    private static readonly DateTime BaseTime = new(2026, 11, 19, 10, 0, 0, DateTimeKind.Utc);

    private static AppDbContext CreateDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new AppDbContext(options);
    }

    private static string NewDatabaseName() => $"ApprovalTestDb_{Guid.NewGuid():N}";

    private sealed class TestTimeProvider(DateTime utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(utcNow);
    }

    [Fact]
    public async Task BuybackApprovalService_CreateAndApprove_WorkflowSucceeds()
    {
        var dbName = NewDatabaseName();
        await using var context = CreateDbContext(dbName);

        var adminId = Guid.NewGuid();
        var cashierId = Guid.NewGuid();
        var titleId = Guid.NewGuid();
        var editionId = Guid.NewGuid();

        context.Employees.Add(new EmployeeModel
        {
            Id = adminId,
            FullName = "Admin Quản Lý",
            Email = "admin@bookstore.io",
            Status = EmployeeStatus.ACTIVE,
            RoleId = Guid.NewGuid()
        });
        context.Employees.Add(new EmployeeModel
        {
            Id = cashierId,
            FullName = "Thu Ngân POS",
            Email = "cashier@bookstore.io",
            Status = EmployeeStatus.ACTIVE,
            RoleId = Guid.NewGuid()
        });
        context.Titles.Add(new TitleModel
        {
            Id = titleId,
            Name = "Conan Tập 100",
            CategoryId = Guid.NewGuid()
        });
        context.Editions.Add(new EditionModel
        {
            Id = editionId,
            TitleId = titleId,
            Publisher = "NXB Kim Đồng",
            CoverPrice = 50000,
            IsActive = true
        });
        await context.SaveChangesAsync();

        var auditLogService = new AuditLogService(context);
        var timeProvider = new TestTimeProvider(BaseTime);
        var buybackService = new BuybackApprovalService(context, auditLogService, timeProvider);

        // 1. Create buyback approval request
        var createDto = new CreateBuybackApprovalRequestDto(
            CustomerId: null,
            TotalAmount: 250000,
            Reason: "Sách cũ hiếm bản đặc biệt",
            Lines: new List<CreateBuybackLineDto>
            {
                new(editionId, ConditionGrade.A, 250000, 300000, 1)
            }
        );

        var created = await buybackService.CreateAsync(createDto, new AuditLogContext(cashierId, null));
        Assert.Equal(ApprovalStatus.PENDING_APPROVAL, created.Status);
        Assert.Equal(250000, created.TotalAmount);
        Assert.Single(created.Lines);

        // 2. Query paged list
        var list = await buybackService.GetPagedAsync(new ApprovalQuery());
        Assert.Equal(1, list.TotalCount);
        Assert.Equal(created.Id, list.Items[0].Id);

        // 3. Admin self-approval should be forbidden
        var selfApproveDto = new UpdateApprovalStatusRequestDto(ApprovalStatus.APPROVED, "Tự duyệt");
        await Assert.ThrowsAsync<ForbiddenException>(() =>
            buybackService.UpdateStatusAsync(created.Id, selfApproveDto, isAdmin: true, new AuditLogContext(cashierId, null)));

        // 4. Admin approves
        var approveDto = new UpdateApprovalStatusRequestDto(ApprovalStatus.APPROVED, "Đồng ý giá thu mua");
        var approved = await buybackService.UpdateStatusAsync(created.Id, approveDto, isAdmin: true, new AuditLogContext(adminId, null));

        Assert.Equal(ApprovalStatus.APPROVED, approved.Status);
        Assert.Equal(adminId, approved.ApprovedBy);
    }

    [Fact]
    public async Task DamagePenaltyApprovalService_CreateAndApprove_WorkflowSucceeds()
    {
        var dbName = NewDatabaseName();
        await using var context = CreateDbContext(dbName);

        var adminId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var tierId = Guid.NewGuid();
        var slipId = Guid.NewGuid();
        var copyId = Guid.NewGuid();
        var lineId = Guid.NewGuid();

        context.MembershipTiers.Add(new MembershipTierModel
        {
            Id = tierId,
            Name = MembershipTierName.SILVER,
            RankOrder = 2
        });
        context.Customers.Add(new CustomerModel
        {
            Id = customerId,
            FullName = "Nguyễn Văn A",
            Phone = "0912345678",
            TierId = tierId
        });
        context.RentalSlips.Add(new RentalSlipModel
        {
            Id = slipId,
            SlipNo = "RENT-20261119-001",
            CustomerId = customerId,
            TierId = tierId,
            RentDate = DateOnly.FromDateTime(BaseTime),
            CreatedBy = adminId
        });
        context.RentalLines.Add(new RentalLineModel
        {
            Id = lineId,
            SlipId = slipId,
            CopyId = copyId,
            BookPriceSnapshot = 100000,
            ChargedDamagePenalty = 50000,
            DamageNeedsApproval = true,
            DamageNote = "Ngấm nước 10 trang bìa"
        });
        await context.SaveChangesAsync();

        var auditLogService = new AuditLogService(context);
        var timeProvider = new TestTimeProvider(BaseTime);
        var damageService = new DamagePenaltyApprovalService(context, auditLogService, timeProvider);

        var list = await damageService.GetPagedAsync(new ApprovalQuery());
        Assert.Equal(1, list.TotalCount);
        Assert.Equal(ApprovalStatus.PENDING_APPROVAL, list.Items[0].Status);

        var approveDto = new UpdateApprovalStatusRequestDto(ApprovalStatus.APPROVED, "Chấp thuận phạt 50%");
        var approved = await damageService.UpdateStatusAsync(lineId, approveDto, isAdmin: true, new AuditLogContext(adminId, null));

        Assert.Equal(ApprovalStatus.APPROVED, approved.Status);
        Assert.Equal(adminId, approved.ApprovedBy);
    }

    [Fact]
    public async Task DisposalReversalApprovalService_CreateAndReject_WorkflowSucceeds()
    {
        var dbName = NewDatabaseName();
        await using var context = CreateDbContext(dbName);

        var adminId = Guid.NewGuid();
        var cashierId = Guid.NewGuid();

        context.Employees.Add(new EmployeeModel
        {
            Id = adminId,
            FullName = "Admin",
            Email = "admin@bookstore.io",
            Status = EmployeeStatus.ACTIVE,
            RoleId = Guid.NewGuid()
        });
        context.Employees.Add(new EmployeeModel
        {
            Id = cashierId,
            FullName = "Cashier",
            Email = "cashier@bookstore.io",
            Status = EmployeeStatus.ACTIVE,
            RoleId = Guid.NewGuid()
        });
        await context.SaveChangesAsync();

        var auditLogService = new AuditLogService(context);
        var service = new DisposalReversalApprovalService(context, auditLogService);

        var created = await service.CreateAsync(new CreateDisposalReversalApprovalRequestDto(
            "HỦY_HÓA_ĐƠN_BÁN",
            null,
            "INV-20261119-0099",
            120000,
            "Thu ngân quét nhầm mã",
            "Cần hoàn tiền khách và trả sách lại kệ khả dụng"
        ), new AuditLogContext(cashierId, null));

        Assert.Equal(ApprovalStatus.PENDING_APPROVAL, created.Status);

        // Reject requires reason
        await Assert.ThrowsAsync<BadRequestException>(() =>
            service.UpdateStatusAsync(created.Id, new UpdateApprovalStatusRequestDto(ApprovalStatus.REJECTED, ""), isAdmin: true, new AuditLogContext(adminId, null)));

        var rejected = await service.UpdateStatusAsync(
            created.Id,
            new UpdateApprovalStatusRequestDto(ApprovalStatus.REJECTED, "Hóa đơn quá 24h quy định"),
            isAdmin: true,
            new AuditLogContext(adminId, null));

        Assert.Equal(ApprovalStatus.REJECTED, rejected.Status);
    }

    [Fact]
    public async Task ApprovalsOverviewService_AggregatesCountsCorrectly()
    {
        var dbName = NewDatabaseName();
        await using var context = CreateDbContext(dbName);

        // Add 1 pending buyback
        context.StockReceipts.Add(new StockReceiptModel
        {
            Id = Guid.NewGuid(),
            Code = "PUR-01",
            SourceType = StockReceiptSourceType.CUSTOMER_BUYBACK,
            NeedsApproval = true,
            Status = ApprovalStatus.PENDING_APPROVAL,
            CreatedBy = Guid.NewGuid()
        });

        // Add 1 pending damage penalty
        context.RentalLines.Add(new RentalLineModel
        {
            Id = Guid.NewGuid(),
            SlipId = Guid.NewGuid(),
            CopyId = Guid.NewGuid(),
            DamageNeedsApproval = true,
            DamageApprovedBy = null,
            DamageApprovalReason = null
        });

        // Add 1 pending inventory adjustment
        context.InventoryAdjustmentRequests.Add(new InventoryAdjustmentRequestModel
        {
            Id = Guid.NewGuid(),
            InventoryCheckId = Guid.NewGuid(),
            RequestedStatus = BookCopyStatus.DAMAGED,
            Reason = "Sách rách trang",
            Status = InventoryAdjustmentStatus.PENDING_APPROVAL,
            RequestedBy = Guid.NewGuid()
        });

        await context.SaveChangesAsync();

        var overviewService = new ApprovalsOverviewService(context);
        var stats = await overviewService.GetOverviewStatsAsync();

        Assert.Equal(3, stats.PendingCount);
        Assert.Equal(1, stats.BuybackPending);
        Assert.Equal(1, stats.DamagePenaltyPending);
        Assert.Equal(1, stats.InventoryAdjustmentPending);
        Assert.Equal(0, stats.DisposalReversalPending);
    }
}
