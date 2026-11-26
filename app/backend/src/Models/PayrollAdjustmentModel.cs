using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;

namespace backend.src.Models;

public sealed class PayrollAdjustmentModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(24)] public string AdjustmentCode { get; set; } = string.Empty;
    public Guid EmployeeId { get; set; }
    [MaxLength(7)] public string? SourcePeriodKey { get; set; }
    [MaxLength(20)] public string? SourcePayrollCode { get; set; }
    [MaxLength(80)] public string? SourceVoucherRef { get; set; }
    [Required, MaxLength(7)] public string TargetPeriodKey { get; set; } = string.Empty;
    [Required, MaxLength(80)] public string Category { get; set; } = string.Empty;
    public PayrollAdjustmentType AdjustmentType { get; set; }
    public long Amount { get; set; }
    [MaxLength(80)] public string? ReferenceCode { get; set; }
    [Required, MaxLength(2000)] public string Reason { get; set; } = string.Empty;
    [MaxLength(255)] public string? ProofPublicId { get; set; }
    public PayrollAdjustmentStatus Status { get; set; } = PayrollAdjustmentStatus.DRAFT;
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AppliedAt { get; set; }
}
