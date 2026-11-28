using System.ComponentModel.DataAnnotations;
using backend.src.Dto.UploadDto;
using backend.src.Models.Enums;

namespace backend.src.Dto.PayrollDto;

// ---------------------------------------------------------------- Requests

public sealed record PayrollPeriodQuery(
    string? Search = null,
    PayrollPeriodStatus? Status = null,
    string? PayoutFilter = null,
    int Page = 1,
    int PageSize = 10);

public sealed record PatchPayrollEmployeeRequest(
    [Range(0, long.MaxValue)] long Bonus,
    [Range(0, long.MaxValue)] long Allowance,
    [Range(0, long.MaxValue)] long Deduction,
    [MaxLength(255)] string? Note = null);

public sealed record UnlockPayrollRequest([Required, MaxLength(1000)] string Reason);

public sealed record BatchPayoutRequest(
    [Required] IReadOnlyList<Guid> EmployeeIds,
    PaymentMethod Method,
    [MaxLength(80)] string? TransactionRef,
    DateOnly PayoutDate,
    [MaxLength(1000)] string? Note = null,
    CloudinaryUploadResultRequest? ProofUpload = null);

public sealed record SendPayrollZaloRequest(IReadOnlyList<Guid>? EmployeeIds = null);

public sealed record CreatePayrollAdjustmentRequest(
    Guid EmployeeId,
    [MaxLength(7)] string? SourcePeriodKey,
    [MaxLength(80)] string? SourceVoucherRef,
    [Required, MaxLength(7)] string TargetPeriodKey,
    [Required, MaxLength(80)] string Category,
    PayrollAdjustmentType AdjustmentType,
    [Range(1, long.MaxValue)] long Amount,
    [Required, MaxLength(2000)] string Reason,
    PayrollAdjustmentStatus Mode = PayrollAdjustmentStatus.DRAFT,
    [MaxLength(80)] string? ReferenceCode = null,
    CloudinaryUploadResultRequest? ProofUpload = null);

public sealed record CreatePayslipDisputeRequest(
    PayslipDisputeCategory Category,
    [Required, MaxLength(2000)] string Content,
    CloudinaryUploadResultRequest? ProofUpload = null);

public sealed record RespondPayslipDisputeRequest(
    PayslipDisputeStatus Status,
    [Required, MaxLength(2000)] string AdminResponse,
    [MaxLength(1000)] string? CalculationNote = null,
    [MaxLength(1000)] string? AdjustmentNote = null,
    [Range(1, long.MaxValue)] long? AdjustmentAmount = null,
    PayrollAdjustmentType? AdjustmentType = null);

// ---------------------------------------------------------------- Payroll responses

public sealed record PayrollLineDto(string Label, long Amount, string? VoucherCode);

public sealed record PayrollEmployeeRowDto(
    Guid EmployeeId,
    Guid EntryId,
    string EmployeeCode,
    string FullName,
    string RoleLabel,
    decimal StandardHours,
    decimal HourlyRate,
    long BaseSalary,
    decimal OvertimeHours,
    long OvertimeAmount,
    long Bonus,
    long Allowance,
    long Deduction,
    long MandatoryContribution,
    long TaxAmount,
    long NetPay,
    WorkRecordPaymentStatus PayoutStatus,
    ZaloDeliveryStatus ZaloStatus,
    DateTime? ZaloSentAt,
    string? ZaloErrorReason,
    bool ZaloLinked,
    string BankAccount,
    DateTime? PayoutAt,
    PaymentMethod? PayoutMethod,
    string? TransactionRef,
    string? ContributionNote,
    IReadOnlyList<PayrollLineDto> BonusItems,
    IReadOnlyList<PayrollLineDto> AllowanceItems,
    IReadOnlyList<PayrollLineDto> DeductionItems);

public sealed record PayrollKpiDto(
    long TotalNetPay,
    long PaidAmount,
    long RemainingAmount,
    decimal ApprovedOtHours,
    int TotalEmployees,
    int ZaloSentCount,
    int ZaloUnsentCount,
    int ZaloFailedCount);

public sealed record PayrollAuditHistoryDto(
    Guid Id,
    DateTime OccurredAt,
    string ActorName,
    string Event,
    string? Result);

public sealed record PayrollBatchDto(
    Guid Id,
    int BatchNumber,
    PaymentMethod Method,
    string TransactionRef,
    DateTime PayoutAt,
    long Amount,
    IReadOnlyList<string> EmployeeNames,
    string? Note,
    string? ProofUrl,
    string ConfirmedByName);

public sealed record PayrollAdjustmentDto(
    Guid Id,
    string AdjustmentCode,
    string? SourcePayrollCode,
    string? SourcePeriodKey,
    string? SourceVoucherRef,
    Guid EmployeeId,
    string EmployeeLabel,
    string TargetPeriodKey,
    string Category,
    PayrollAdjustmentType AdjustmentType,
    long Amount,
    string? ReferenceCode,
    string Reason,
    string? ProofUrl,
    PayrollAdjustmentStatus Status,
    DateTime CreatedAt);

public sealed record PayrollPeriodListItemDto(
    string PeriodKey,
    string PayrollCode,
    string PeriodRangeLabel,
    PayrollPeriodStatus Status,
    bool Exists,
    int EmployeeCount,
    long TotalNetPay,
    long PaidAmount);

public sealed record PayrollPeriodDetailDto(
    string PeriodKey,
    string PayrollCode,
    string PeriodRangeLabel,
    string AttendanceSourceCode,
    PayrollPeriodStatus Status,
    bool Exists,
    DateTime? ApprovedAt,
    string? ApprovedByName,
    DateTime? PayoutAt,
    PaymentMethod? PayoutMethod,
    string? TransactionRef,
    string? PayoutConfirmedByName,
    PayrollKpiDto Kpi,
    IReadOnlyList<PayrollEmployeeRowDto> Rows,
    int Page,
    int PageSize,
    int FilteredRowsCount,
    int AllRowsCount,
    int PaidRowsCount,
    IReadOnlyList<PayrollBatchDto> Batches,
    IReadOnlyList<PayrollAuditHistoryDto> History,
    IReadOnlyList<PayrollAdjustmentDto> PendingAdjustments);

public sealed record CashVarianceDto(
    Guid CashSessionId,
    string VoucherCode,
    DateTime OpenedAt,
    DateTime? ClosedAt,
    long? ExpectedAmount,
    long? CountedAmount,
    long Difference,
    string? VarianceNote,
    string? ApproverName);

public sealed record PayrollBreakdownDto(
    Guid EntryId,
    Guid EmployeeId,
    IReadOnlyList<PayrollLineDto> BonusItems,
    IReadOnlyList<PayrollLineDto> AllowanceItems,
    IReadOnlyList<PayrollLineDto> DeductionItems,
    IReadOnlyList<CashVarianceDto> CashVariances);

public sealed record ZaloSendResultDto(
    Guid EntryId,
    ZaloDeliveryStatus Status,
    DateTime? SentAt,
    string? ErrorReason);

public sealed record SendPayrollZaloResultDto(
    int SentCount,
    int FailedCount,
    IReadOnlyList<ZaloSendResultDto> Results);

// ---------------------------------------------------------------- Payslip responses

public sealed record PayslipPeriodOptionDto(string PeriodKey, bool Paid);

public sealed record PayslipAttendanceDayDto(
    DateOnly WorkDate,
    short ShiftNo,
    DateTime? CheckInAt,
    DateTime? CheckOutAt,
    decimal StandardHours,
    decimal OvertimeHours);

public sealed record PayslipOvertimeEntryDto(
    DateOnly WorkDate,
    DateTime? StartAt,
    DateTime? EndAt,
    decimal Hours,
    long Amount);

public sealed record PayslipAdvanceVoucherDto(
    string VoucherCode,
    string Content,
    long Amount,
    DateTime CreatedAt);

public sealed record PayslipDisputeDto(
    Guid Id,
    string DisputeCode,
    string PayslipCode,
    Guid EmployeeId,
    string EmployeeName,
    PayslipDisputeCategory Category,
    PayslipDisputeStatus Status,
    string Content,
    string? ProofUrl,
    DateTime SubmittedAt,
    string? AdminName,
    DateTime? RespondedAt,
    string? AdminResponse,
    string? CalculationNote,
    string? AdjustmentNote,
    string? LinkedAdjustmentCode,
    bool OwnedByActor);

public sealed record PayslipDetailDto(
    bool HasPayslip,
    Guid? EntryId,
    string PayslipCode,
    string PeriodKey,
    string PeriodRange,
    string PayrollCode,
    string AttendanceSourceCode,
    PayrollPeriodStatus? PayrollStatus,
    bool Paid,
    DateTime? PayoutAt,
    string ApprovedByName,
    DateTime? ApprovedAt,
    Guid EmployeeId,
    string EmployeeCode,
    string EmployeeName,
    string EmployeeRoleLabel,
    string StoreName,
    string BankAccount,
    string? TransactionRef,
    decimal StandardHours,
    decimal HourlyRate,
    long BaseSalary,
    decimal OvertimeHours,
    long OvertimeAmount,
    long Bonus,
    string BonusNote,
    long Allowance,
    string AllowanceNote,
    long MandatoryContribution,
    string MandatoryContributionNote,
    long TaxAmount,
    long Deduction,
    long TotalIncome,
    long TotalDeduction,
    long NetPay,
    ZaloDeliveryStatus ZaloStatus,
    DateTime? ZaloSentAt,
    bool ZaloLinked,
    IReadOnlyList<PayslipPeriodOptionDto> AvailablePeriods,
    IReadOnlyList<PayslipAttendanceDayDto> AttendanceDays,
    IReadOnlyList<PayslipOvertimeEntryDto> OvertimeEntries,
    IReadOnlyList<PayslipAdvanceVoucherDto> AdvanceVouchers,
    IReadOnlyList<PayslipDisputeDto> Disputes);
