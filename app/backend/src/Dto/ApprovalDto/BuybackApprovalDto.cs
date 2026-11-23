using backend.src.Models.Enums;

namespace backend.src.Dto.ApprovalDto;

public record BuybackApprovalLineDto(
    Guid Id,
    string TitleName,
    string? EditionName,
    string? Isbn,
    ConditionGrade? ConditionGrade,
    long CoverPrice,
    long ProposedPrice,
    int Quantity,
    string? ImageUrl);

public record BuybackApprovalItemResponse(
    Guid Id,
    string ReceiptCode,
    string? CustomerName,
    string? CustomerPhone,
    ApprovalStatus Status,
    long TotalAmount,
    int ItemCount,
    string TitleSummary,
    string? Reason,
    Guid RequestedBy,
    string RequestedByName,
    DateTime RequestedAt,
    Guid? ApprovedBy,
    string? ApprovedByName,
    DateTime? ApprovedAt,
    string? RejectReason);

public record BuybackApprovalDetailResponse(
    Guid Id,
    string ReceiptCode,
    string? CustomerName,
    string? CustomerPhone,
    ApprovalStatus Status,
    long TotalAmount,
    int ItemCount,
    string TitleSummary,
    string? Reason,
    Guid RequestedBy,
    string RequestedByName,
    DateTime RequestedAt,
    Guid? ApprovedBy,
    string? ApprovedByName,
    DateTime? ApprovedAt,
    string? RejectReason,
    IReadOnlyList<BuybackApprovalLineDto> Lines,
    IReadOnlyList<string> ImageUrls,
    IReadOnlyList<ApprovalAuditItem> AuditHistory);

public record CreateBuybackLineDto(
    Guid EditionId,
    ConditionGrade ConditionGrade,
    long ProposedPrice,
    long? SellingPriceSuggestion = null,
    int Quantity = 1);

public record CreateBuybackApprovalRequestDto(
    Guid? CustomerId,
    long TotalAmount,
    string Reason,
    List<CreateBuybackLineDto> Lines,
    List<string>? ImageUrls = null);
