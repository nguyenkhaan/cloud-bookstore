using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;

namespace backend.src.Models;

public sealed class PayrollEntryModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PayrollPeriodId { get; set; }
    public Guid EmployeeId { get; set; }
    public decimal StandardHours { get; set; }
    public decimal HourlyRate { get; set; }
    public long BaseSalary { get; set; }
    public decimal OvertimeHours { get; set; }
    public long OvertimeAmount { get; set; }
    public long Bonus { get; set; }
    public long Allowance { get; set; }
    public long Deduction { get; set; }
    public long MandatoryContribution { get; set; }
    public long Tax { get; set; }
    public long NetPay { get; set; }
    [MaxLength(255)] public string? ContributionNote { get; set; }
    public WorkRecordPaymentStatus PayoutStatus { get; set; } = WorkRecordPaymentStatus.UNPAID;
    public Guid? PayoutBatchId { get; set; }
    public Guid? PaymentId { get; set; }
    public DateTime? PaidAt { get; set; }
    public ZaloDeliveryStatus ZaloStatus { get; set; } = ZaloDeliveryStatus.UNSENT;
    public DateTime? ZaloSentAt { get; set; }
    [MaxLength(255)] public string? ZaloErrorReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
