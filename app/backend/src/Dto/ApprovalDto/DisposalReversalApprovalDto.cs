using backend.src.Models.Enums;

namespace backend.src.Dto.ApprovalDto;

public record DisposalReversalApprovalItemResponse(
    Guid Id,
    string RequestType,
    string ReferenceCode,
    string TitleName,
    long Amount,
    string Reason,
    ApprovalStatus Status,
    Guid RequestedBy,
    string RequestedByName,
    DateTime RequestedAt,
    Guid? ApprovedBy,
    string? ApprovedByName,
    DateTime? ApprovedAt,
    string? RejectReason);

public record DisposalReversalApprovalDetailResponse(
    Guid Id,
    string RequestType,
    string ReferenceCode,
    string TitleName,
    long Amount,
    string Reason,
    ApprovalStatus Status,
    Guid RequestedBy,
    string RequestedByName,
    DateTime RequestedAt,
    Guid? ApprovedBy,
    string? ApprovedByName,
    DateTime? ApprovedAt,
    string? RejectReason,
    string? Details,
    IReadOnlyList<ApprovalAuditItem> AuditHistory);

public record CreateDisposalReversalApprovalRequestDto(
    string RequestType,
    Guid? ReferenceId,
    string ReferenceCode,
    long Amount,
    string Reason,
    string? Details = null);
