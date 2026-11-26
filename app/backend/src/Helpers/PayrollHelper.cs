using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.PayrollDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;

namespace backend.src.Helpers;

/// <summary>Shared payroll rules used by the payroll and payslip services.</summary>
public static partial class PayrollHelper
{
    public const decimal OvertimeMultiplier = 1.5m;
    public const string PeriodEntityType = "payroll_period";
    public const string AdjustmentEntityType = "payroll_adjustment";
    public const string DisputeEntityType = "payslip_dispute";
    public const string ZaloTemplateCode = "PAYSLIP_READY";
    public const string ZaloUnlinkedReason = "Nhân viên chưa liên kết Zalo hoặc số điện thoại không hợp lệ.";

    [GeneratedRegex(@"^(0[1-9]|1[0-2])/(20\d{2})$")]
    private static partial Regex PeriodKeyRegex();

    public static (int Year, int Month, string Key) ParsePeriodKey(string? periodKey)
    {
        var trimmed = periodKey?.Trim() ?? string.Empty;
        var match = PeriodKeyRegex().Match(trimmed);
        if (!match.Success) throw new BadRequestException("Kỳ lương phải có định dạng MM/YYYY.");
        return (int.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture),
            int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture), trimmed);
    }

    public static string BuildPeriodKey(int year, int month) => $"{month:00}/{year}";
    public static string BuildPayrollCode(int year, int month) => $"PAY-{year}{month:00}";
    public static string BuildAttendanceCode(int year, int month) => $"ATT-{year}{month:00}";

    public static string BuildRangeLabel(int year, int month)
        => $"01/{month:00}–{DateTime.DaysInMonth(year, month):00}/{month:00}/{year}";

    public static string NextPeriodKey(int year, int month)
        => month == 12 ? BuildPeriodKey(year + 1, 1) : BuildPeriodKey(year, month + 1);

    public static string BuildPayslipCode(string payrollCode, string? employeeCode, Guid employeeId)
    {
        var suffix = string.IsNullOrWhiteSpace(employeeCode)
            ? employeeId.ToString("N")[..6].ToUpperInvariant()
            : employeeCode.Replace("-", string.Empty, StringComparison.Ordinal);
        return $"{payrollCode}-{suffix}";
    }

    public static string RoleLabel(EmployeeModel employee)
    {
        if (!string.IsNullOrWhiteSpace(employee.JobTitle)) return employee.JobTitle!;
        return employee.Role?.RoleName switch
        {
            RoleName.ADMIN => "Quản trị viên",
            RoleName.CASHIER => "Thu ngân",
            RoleName.INVENTORY_MANAGER => "Quản lý kho",
            _ => "Nhân viên"
        };
    }

    public static string BankAccountLabel(EmployeeModel employee)
        => string.IsNullOrWhiteSpace(employee.BankAccountNumber)
            ? string.Empty
            : string.IsNullOrWhiteSpace(employee.BankName)
                ? employee.BankAccountNumber!
                : $"{employee.BankName} · {employee.BankAccountNumber}";

    public static long RoundMoney(decimal value) => (long)Math.Round(value, 0, MidpointRounding.AwayFromZero);

    public static decimal ToHours(int minutes) => Math.Round(minutes / 60m, 2, MidpointRounding.AwayFromZero);

    public static long ComputeNetPay(PayrollEntryModel entry)
        => Math.Max(0, entry.BaseSalary + entry.OvertimeAmount + entry.Bonus + entry.Allowance
            - entry.Deduction - entry.MandatoryContribution - entry.Tax);

    /// <summary>Recomputes Bonus/Allowance/Deduction totals from items and refreshes the net pay.</summary>
    public static void Recompute(PayrollEntryModel entry, IEnumerable<PayrollEntryItemModel> items)
    {
        var list = items as IReadOnlyCollection<PayrollEntryItemModel> ?? items.ToArray();
        entry.Bonus = list.Where(i => i.Category == PayrollItemCategory.BONUS).Sum(i => i.Amount);
        entry.Allowance = list.Where(i => i.Category == PayrollItemCategory.ALLOWANCE).Sum(i => i.Amount);
        entry.Deduction = list.Where(i => i.Category is PayrollItemCategory.DEDUCTION or PayrollItemCategory.ADVANCE).Sum(i => i.Amount);
        entry.NetPay = ComputeNetPay(entry);
        entry.UpdatedAt = DateTime.UtcNow;
    }

    public static IReadOnlyList<PayrollLineDto> Lines(IEnumerable<PayrollEntryItemModel> items, params PayrollItemCategory[] categories)
        => items.Where(i => categories.Contains(i.Category)).OrderBy(i => i.CreatedAt)
            .Select(i => new PayrollLineDto(i.Label, i.Amount, i.VoucherCode)).ToArray();

    public static bool HasZaloContact(EmployeeModel employee)
        => PhoneHelper.IsValidVietnamesePhoneNumber(PhoneHelper.Normalize(employee.Phone));

    /// <summary>Normalises any incoming instant to UTC. Unspecified values are Vietnam store time.</summary>
    public static DateTime NormalizeToUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => VietnamTimeHelper.ConvertVnStartOfDayToUtc(value)
    };

    public static void AddAudit(
        AppDbContext dbContext, string action, string entityType, Guid entityId,
        object? before, object? after, string reason, AuditLogContext context)
        => dbContext.AuditLogs.Add(new AuditLogModel
        {
            ActorId = context.ActorId, IpAddress = context.IpAddress, UserAgent = context.UserAgent,
            CorrelationId = context.CorrelationId, Action = action, EntityType = entityType, EntityId = entityId,
            BeforeData = before is null ? null : JsonSerializer.Serialize(before),
            AfterData = after is null ? null : JsonSerializer.Serialize(after),
            Reason = reason, OccurredAt = DateTime.UtcNow
        });

    /// <summary>
    /// Queues a payslip notification. A missing or invalid phone produces a FAILED outbox row and entry state,
    /// and never throws, so notification problems cannot roll back payroll changes (NOTIFY-005).
    /// </summary>
    public static ZaloSendResultDto QueueZaloPayslip(
        AppDbContext dbContext, PayrollEntryModel entry, PayrollPeriodModel period, EmployeeModel employee, DateTime now)
    {
        var phone = PhoneHelper.Normalize(employee.Phone);
        var linked = PhoneHelper.IsValidVietnamesePhoneNumber(phone);
        var payslipCode = BuildPayslipCode(period.PayrollCode, employee.EmployeeCode, employee.Id);
        dbContext.NotificationOutbox.Add(new NotificationOutboxModel
        {
            Channel = NotificationChannel.ZALO,
            RecipientType = NotificationRecipientType.EMPLOYEE,
            RecipientAddress = linked ? phone : (employee.Phone ?? string.Empty),
            TemplateCode = ZaloTemplateCode,
            Content = JsonSerializer.Serialize(new
            {
                payslipCode, periodKey = period.PeriodKey, payrollCode = period.PayrollCode,
                employeeName = employee.FullName, netPay = entry.NetPay
            }),
            SourceEntityType = "payroll_entry",
            SourceEntityId = entry.Id,
            Status = linked ? NotificationStatus.SENT : NotificationStatus.FAILED,
            AttemptCount = 1,
            LastError = linked ? null : ZaloUnlinkedReason,
            CreatedAt = now,
            SentAt = linked ? now : null
        });
        entry.ZaloStatus = linked ? ZaloDeliveryStatus.SENT : ZaloDeliveryStatus.FAILED;
        entry.ZaloSentAt = linked ? now : entry.ZaloSentAt;
        entry.ZaloErrorReason = linked ? null : ZaloUnlinkedReason;
        entry.UpdatedAt = now;
        return new ZaloSendResultDto(entry.Id, entry.ZaloStatus, linked ? now : null, entry.ZaloErrorReason);
    }

    /// <summary>Next sequential code such as ADJ-202611-0001 or DC-202611-0001 for the current Vietnam month.</summary>
    public static async Task<string> NextMonthlyCodeAsync(
        IQueryable<string> existingCodes, string prefixLabel, DateTime now, CancellationToken cancellationToken)
    {
        var today = VietnamTimeHelper.TodayVietnam(now);
        var prefix = $"{prefixLabel}-{today.Year}{today.Month:00}-";
        var codes = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .ToListAsync(existingCodes.Where(code => code.StartsWith(prefix)), cancellationToken);
        var next = codes.Select(code => int.TryParse(code[prefix.Length..], NumberStyles.None, CultureInfo.InvariantCulture, out var number) ? number : 0)
            .DefaultIfEmpty(0).Max() + 1;
        return $"{prefix}{next:0000}";
    }
}
