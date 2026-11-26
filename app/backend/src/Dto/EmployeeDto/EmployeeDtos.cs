using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;

namespace backend.src.Dto.EmployeeDto;

public sealed record EmployeeListQuery(
    string? Search = null,
    RoleName? RoleName = null,
    EmployeeStatus? Status = null,
    bool? InShiftOnly = null,
    int Page = 1,
    int PageSize = 10);

public sealed record CreateEmployeeRequest(
    [Required, EmailAddress, MaxLength(200)] string Email,
    [Required, MaxLength(200)] string FullName,
    [Required, MaxLength(12)] string Phone,
    RoleName RoleName,
    [MaxLength(120)] string? JobTitle = null,
    decimal? HourlyRate = null,
    [MaxLength(100)] string? BankName = null,
    [MaxLength(50)] string? BankAccountNumber = null);

public sealed record UpdateEmployeeRequest(
    [Required, EmailAddress, MaxLength(200)] string Email,
    [Required, MaxLength(200)] string FullName,
    [Required, MaxLength(12)] string Phone,
    [MaxLength(120)] string? JobTitle,
    EmployeeStatus Status,
    string? Reason = null,
    decimal? HourlyRate = null,
    [MaxLength(100)] string? BankName = null,
    [MaxLength(50)] string? BankAccountNumber = null);

public sealed record EmployeeDto(
    Guid Id,
    string EmployeeCode,
    string Email,
    string FullName,
    string Phone,
    RoleName RoleName,
    EmployeeStatus Status,
    string? JobTitle,
    string? BranchName,
    bool IsProtected,
    string? AvatarUrl,
    DateTime CreatedAt,
    decimal HourlyRate,
    string? BankName,
    string? BankAccountNumber);

public sealed record EmployeeListKpiDto(int ActiveCount, int NewAccountsCount, int InShiftCount, int RootAdminCount);

public sealed record EmployeeListResultDto(
    IReadOnlyList<EmployeeDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages,
    EmployeeListKpiDto Kpi);

public sealed record EmployeeShiftDto(
    Guid Id,
    DateOnly WorkDate,
    short ShiftNo,
    DateTime? CheckInAt,
    DateTime? CheckOutAt,
    string AttendanceStatus,
    int WorkedMinutes,
    int OvertimeMinutes);

public sealed record EmployeeShiftListDto(
    IReadOnlyList<EmployeeShiftDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages);
