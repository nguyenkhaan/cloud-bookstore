using backend.src.Models.Enums;

namespace backend.src.Dto.InventoryAdjustmentDto;

public record InventoryAdjustmentRequestResponse(
    Guid Id,
    Guid InventoryCheckId,
    string CheckCode,
    Guid CopyId,
    string CopyBarcode,
    string TitleName,
    BookCopyStatus CurrentCopyStatus,
    BookCopyStatus ExpectedStatus,
    BookCopyStatus? ObservedStatus,
    BookCopyStatus RequestedStatus,
    InventoryVarianceType? VarianceType,
    bool IsFound,
    string Reason,
    InventoryAdjustmentStatus Status,
    Guid RequestedBy,
    string RequestedByName,
    DateTime RequestedAt,
    Guid? ApprovedBy,
    string? ApprovedByName,
    DateTime? ApprovedAt,
    string? RejectionReason,
    DateTime? AppliedAt);

public record InventoryAdjustmentAuditItem(
    Guid Id,
    DateTime OccurredAt,
    Guid? ActorId,
    string? ActorName,
    string Action,
    string? BeforeData,
    string? AfterData,
    string? Reason);

public record InventoryAdjustmentRequestDetailResponse(
    Guid Id,
    Guid InventoryCheckId,
    string CheckCode,
    string? CheckNote,
    DateTime CheckedAt,
    Guid CheckedBy,
    string CheckedByName,
    Guid CopyId,
    string CopyBarcode,
    Guid EditionId,
    string? Isbn,
    string TitleName,
    BookCopyStatus CurrentCopyStatus,
    BookCopyStatus ExpectedStatus,
    BookCopyStatus? ObservedStatus,
    BookCopyStatus RequestedStatus,
    InventoryVarianceType? VarianceType,
    bool IsFound,
    string Reason,
    InventoryAdjustmentStatus Status,
    Guid RequestedBy,
    string RequestedByName,
    DateTime RequestedAt,
    Guid? ApprovedBy,
    string? ApprovedByName,
    DateTime? ApprovedAt,
    string? RejectionReason,
    DateTime? AppliedAt,
    bool CanDeleteByRetention,
    DateTime RetainUntil,
    IReadOnlyList<InventoryAdjustmentAuditItem> History);

public record InventoryAdjustmentStatsResponse(
    int PendingCount,
    int ApprovedCount,
    int AppliedCount,
    int RejectedCount,
    int CancelledCount,
    int TotalCount);
