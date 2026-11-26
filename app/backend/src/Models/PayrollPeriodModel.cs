using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;

namespace backend.src.Models;

public sealed class PayrollPeriodModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    /// <summary>Canonical key formatted as MM/YYYY.</summary>
    [Required, MaxLength(7)] public string PeriodKey { get; set; } = string.Empty;
    public int Year { get; set; }
    public int Month { get; set; }
    [Required, MaxLength(20)] public string PayrollCode { get; set; } = string.Empty;
    [Required, MaxLength(20)] public string AttendanceSourceCode { get; set; } = string.Empty;
    public PayrollPeriodStatus Status { get; set; } = PayrollPeriodStatus.DRAFT;
    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
