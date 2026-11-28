using System.ComponentModel.DataAnnotations;
using backend.src.Dto.UploadDto;
using backend.src.Models.Enums;

namespace backend.src.Dto.HrRequestDto;

public sealed record CreateHrRequestRequest(
    HrRequestType Type,
    DateOnly ApplyDate,
    short ShiftNo,
    short? TargetShiftNo,
    Guid? ReplacementEmployeeId,
    DateTime? CorrectCheckInAt,
    DateTime? CorrectCheckOutAt,
    [Required, MaxLength(2000)] string Reason,
    CloudinaryUploadResultRequest? ProofUpload = null);

public sealed record HrRequestReviewRequest(
    HrRequestStatus Status,
    [Required, MaxLength(1000)] string Note);

public sealed record HrRequestQuery(
    string Scope = "mine",
    string? Search = null,
    string? Month = null,
    HrRequestStatus? Status = null,
    int Page = 1,
    int PageSize = 10);

public sealed record HrRequestHistoryDto(Guid Id, string Action, string? Note, DateTime OccurredAt, string ActorName);

public sealed record HrRequestDto(
    Guid Id,
    string RequestCode,
    HrRequestType Type,
    Guid RequesterId,
    string RequesterCode,
    string RequesterName,
    DateOnly ApplyDate,
    short ShiftNo,
    short? TargetShiftNo,
    Guid? ReplacementEmployeeId,
    string ReplacementName,
    DateTime? CorrectCheckInAt,
    DateTime? CorrectCheckOutAt,
    string? ProofUrl,
    string Reason,
    HrRequestStatus Status,
    bool IsOwnedByCurrentUser,
    bool IsRequestedByCurrentUser,
    string? ReviewNote,
    string? ReviewedBy,
    DateTime? ReviewedAt,
    IReadOnlyList<HrRequestHistoryDto> History);

public sealed record HrRequestListDto(
    IReadOnlyList<HrRequestDto> MyRequests,
    IReadOnlyList<HrRequestDto> ApprovalQueue,
    int MyCount,
    int PendingApprovalCount);

public sealed record HrRequestPageDto(
    IReadOnlyList<HrRequestDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages);

public sealed record HrRequestOptionsDto(
    IReadOnlyList<HrRequestOptionDto> Employees,
    IReadOnlyList<HrRequestOptionDto> WorkRecords);

public sealed record HrRequestOptionDto(string Value, string Label, DateOnly? ApplyDate = null, short? ShiftNo = null);
