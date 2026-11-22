using backend.src.Models.Enums;

namespace backend.src.Dto.StockOutDto;

public record StockOutQuery(
    string? Search = null,
    ApprovalStatus? Status = null,
    int Page = 1,
    int PageSize = 20
)
{
    public int Page { get; init; } = Page < 1 ? 1 : Page;
    public int PageSize { get; init; } = PageSize < 1 ? 20 : (PageSize > 100 ? 100 : PageSize);
}

public record StockOutLineRequest(
    string CopyBarcode,
    string? LineReason = null
);

public record CreateStockOutRequest(
    string StockOutType,
    string Reason,
    string? EvidenceFileName = null,
    IReadOnlyList<StockOutLineRequest>? Lines = null
);

public record StockOutLineResponse(
    Guid CopyId,
    string CopyBarcode,
    string TitleName,
    string ConditionGrade,
    string? ConditionNote,
    long CostPrice,
    string CurrentStatus,
    string TargetStatus,
    string? LineReason
);

public record StockOutHistoryItemResponse(
    Guid Id,
    DateTime OccurredAt,
    Guid? ActorId,
    string ActorName,
    string Action,
    string? Note
);

public record StockOutDetailResponse(
    Guid Id,
    string Code,
    string StockOutType,
    string StockOutTypeLabel,
    ApprovalStatus Status,
    string Reason,
    string? EvidenceFileName,
    int CopyCount,
    long TotalCost,
    Guid CreatedBy,
    string CreatedByName,
    DateTime CreatedAt,
    Guid? ApprovedBy,
    string? ApprovedByName,
    DateTime? ApprovedAt,
    IReadOnlyList<StockOutLineResponse> Lines,
    IReadOnlyList<StockOutHistoryItemResponse> History
);
