using backend.src.Models.Enums;

namespace backend.src.Dto.ApprovalDto;

public record ApprovalAuditItem(
    Guid Id,
    DateTime OccurredAt,
    Guid? ActorId,
    string? ActorName,
    string Action,
    string? BeforeData,
    string? AfterData,
    string? Reason);

public record ApprovalQuery(
    int Page = 1,
    int PageSize = 10,
    ApprovalStatus? Status = null,
    string? Search = null);

public record UpdateApprovalStatusRequestDto(
    ApprovalStatus Status,
    string? Reason);

public record ApprovalsOverviewStatsResponse(
    int TotalCount,
    int PendingCount,
    int ApprovedCount,
    int RejectedCount,
    int BuybackPending,
    int DamagePenaltyPending,
    int InventoryAdjustmentPending,
    int DisposalReversalPending);
