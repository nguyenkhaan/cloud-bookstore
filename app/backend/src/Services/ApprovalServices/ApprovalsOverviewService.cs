using backend.src.Data;
using backend.src.Dto.ApprovalDto;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services.ApprovalServices;

public class ApprovalsOverviewService(AppDbContext dbContext)
{
    public async Task<ApprovalsOverviewStatsResponse> GetOverviewStatsAsync(CancellationToken cancellationToken = default)
    {
        var buybackPending = await dbContext.StockReceipts
            .AsNoTracking()
            .CountAsync(r => r.SourceType == StockReceiptSourceType.CUSTOMER_BUYBACK &&
                             r.NeedsApproval &&
                             r.Status == ApprovalStatus.PENDING_APPROVAL, cancellationToken);

        var buybackTotal = await dbContext.StockReceipts
            .AsNoTracking()
            .CountAsync(r => r.SourceType == StockReceiptSourceType.CUSTOMER_BUYBACK && r.NeedsApproval, cancellationToken);

        var buybackApproved = await dbContext.StockReceipts
            .AsNoTracking()
            .CountAsync(r => r.SourceType == StockReceiptSourceType.CUSTOMER_BUYBACK &&
                             r.NeedsApproval &&
                             r.Status == ApprovalStatus.APPROVED, cancellationToken);

        var buybackRejected = await dbContext.StockReceipts
            .AsNoTracking()
            .CountAsync(r => r.SourceType == StockReceiptSourceType.CUSTOMER_BUYBACK &&
                             r.NeedsApproval &&
                             (r.Status == ApprovalStatus.REJECTED || r.Status == ApprovalStatus.CANCELLED), cancellationToken);

        var damagePending = await dbContext.RentalLines
            .AsNoTracking()
            .CountAsync(r => r.DamageNeedsApproval && r.DamageApprovedBy == null && r.DamageApprovalReason == null, cancellationToken);

        var damageTotal = await dbContext.RentalLines
            .AsNoTracking()
            .CountAsync(r => r.DamageNeedsApproval, cancellationToken);

        var damageApproved = await dbContext.RentalLines
            .AsNoTracking()
            .CountAsync(r => r.DamageNeedsApproval && r.DamageApprovedBy != null, cancellationToken);

        var damageRejected = await dbContext.RentalLines
            .AsNoTracking()
            .CountAsync(r => r.DamageNeedsApproval && r.DamageApprovedBy == null && r.DamageApprovalReason != null, cancellationToken);

        var inventoryPending = await dbContext.InventoryAdjustmentRequests
            .AsNoTracking()
            .CountAsync(r => r.Status == InventoryAdjustmentStatus.PENDING_APPROVAL, cancellationToken);

        var inventoryTotal = await dbContext.InventoryAdjustmentRequests
            .AsNoTracking()
            .CountAsync(cancellationToken);

        var inventoryApproved = await dbContext.InventoryAdjustmentRequests
            .AsNoTracking()
            .CountAsync(r => r.Status == InventoryAdjustmentStatus.APPROVED || r.Status == InventoryAdjustmentStatus.APPLIED, cancellationToken);

        var inventoryRejected = await dbContext.InventoryAdjustmentRequests
            .AsNoTracking()
            .CountAsync(r => r.Status == InventoryAdjustmentStatus.REJECTED || r.Status == InventoryAdjustmentStatus.CANCELLED, cancellationToken);

        var disposalReversalLogs = await dbContext.AuditLogs
            .AsNoTracking()
            .Where(a => a.EntityType == DisposalReversalApprovalService.AuditEntityType)
            .Select(a => a.Action)
            .ToListAsync(cancellationToken);

        var reversalPending = disposalReversalLogs.Count(a => a == "REVERSAL_CREATED");
        var reversalTotal = disposalReversalLogs.Count;
        var reversalApproved = disposalReversalLogs.Count(a => a == "REVERSAL_APPROVED");
        var reversalRejected = disposalReversalLogs.Count(a => a == "REVERSAL_REJECTED");

        var totalPending = buybackPending + damagePending + inventoryPending + reversalPending;
        var totalAll = buybackTotal + damageTotal + inventoryTotal + reversalTotal;
        var totalApproved = buybackApproved + damageApproved + inventoryApproved + reversalApproved;
        var totalRejected = buybackRejected + damageRejected + inventoryRejected + reversalRejected;

        return new ApprovalsOverviewStatsResponse(
            totalAll,
            totalPending,
            totalApproved,
            totalRejected,
            buybackPending,
            damagePending,
            inventoryPending,
            reversalPending
        );
    }
}
