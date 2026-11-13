using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.BookCopyDto;
using backend.src.Models;
using backend.src.Services;

namespace backend.src.Helpers;

/// <summary>
/// Builds audit snapshots and persists inventory adjustment transactions atomically with audit logs.
/// </summary>
public static class InventoryAdjustmentAuditHelper
{
    public const string AuditEntityType = "INVENTORY_ADJUSTMENT_REQUEST";
    public const string BookCopyAuditEntityType = "BookCopy";
    public const string ActionCreate = "INVENTORY_ADJUSTMENT_CREATE";
    public const string ActionApprove = "INVENTORY_ADJUSTMENT_APPROVE";
    public const string ActionReject = "INVENTORY_ADJUSTMENT_REJECT";
    public const string ActionApply = "INVENTORY_ADJUSTMENT_APPLY";
    public const string ActionCancel = "INVENTORY_ADJUSTMENT_CANCEL";
    public const string ActionRetentionDelete = "INVENTORY_ADJUSTMENT_RETENTION_DELETE";
    public const string BookCopyStatusAction = "BOOK_COPY_STATUS_CHANGE";

    public static object ToAuditSnapshot(InventoryAdjustmentRequestModel request) => new
    {
        request.Id,
        request.InventoryCheckId,
        RequestedStatus = request.RequestedStatus.ToString(),
        Status = request.Status.ToString(),
        request.Reason,
        request.RequestedBy,
        request.RequestedAt,
        request.ApprovedBy,
        request.ApprovedAt,
        request.RejectionReason,
        request.AppliedAt
    };

    public static CreateAuditLogEntry BuildRequestAudit(
        string action,
        Guid requestId,
        object? before,
        InventoryAdjustmentRequestModel? afterRequest,
        string reason,
        AuditLogContext context)
        => new(
            action,
            AuditEntityType,
            requestId,
            before,
            afterRequest is null ? null : ToAuditSnapshot(afterRequest),
            reason,
            context);

    public static CreateAuditLogEntry BuildCopyStatusAudit(
        BookCopyModel copy,
        object copyBefore,
        string checkCode,
        string note,
        AuditLogContext context)
        => new(
            BookCopyStatusAction,
            BookCopyAuditEntityType,
            copy.Id,
            copyBefore,
            copy.ToAuditSnapshot(),
            $"Áp dụng yêu cầu điều chỉnh kho ({checkCode}): {note}",
            context);

    public static async Task SaveWithAuditsAsync(
        AppDbContext dbContext,
        AuditLogService auditLogService,
        IReadOnlyList<CreateAuditLogEntry> audits,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        foreach (var audit in audits)
        {
            await auditLogService.CreateAuditLogEntryAsync(audit, cancellationToken);
        }
        await transaction.CommitAsync(cancellationToken);
    }
}
