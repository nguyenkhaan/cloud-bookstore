using backend.src.Models.Enums;

namespace backend.src.Dto.ApprovalDto;

public record DamagePenaltyApprovalItemResponse(
    Guid Id,
    Guid SlipId,
    string SlipCode,
    Guid CopyId,
    string CopyBarcode,
    string TitleName,
    string? CustomerName,
    string? CustomerPhone,
    string? CustomerTier,
    long DepositAmount,
    string DamageDescription,
    decimal PenaltyPercentage,
    long PenaltyAmount,
    long RefundAmount,
    ApprovalStatus Status,
    Guid RequestedBy,
    string RequestedByName,
    DateTime RequestedAt,
    Guid? ApprovedBy,
    string? ApprovedByName,
    DateTime? ApprovedAt,
    string? RejectReason);

public record DamagePenaltyApprovalDetailResponse(
    Guid Id,
    Guid SlipId,
    string SlipCode,
    Guid CopyId,
    string CopyBarcode,
    string TitleName,
    string? CustomerName,
    string? CustomerPhone,
    string? CustomerTier,
    long DepositAmount,
    string DamageDescription,
    decimal PenaltyPercentage,
    long PenaltyAmount,
    long RefundAmount,
    ApprovalStatus Status,
    Guid RequestedBy,
    string RequestedByName,
    DateTime RequestedAt,
    Guid? ApprovedBy,
    string? ApprovedByName,
    DateTime? ApprovedAt,
    string? RejectReason,
    IReadOnlyList<string> ImageUrls,
    IReadOnlyList<ApprovalAuditItem> AuditHistory);

public record CreateDamagePenaltyApprovalRequestDto(
    Guid RentalLineId,
    string DamageDescription,
    decimal PenaltyPercentage,
    long PenaltyAmount,
    string Reason,
    List<string>? ImageUrls = null);
