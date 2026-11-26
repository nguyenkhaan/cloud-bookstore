using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;

namespace backend.src.Models;

public sealed class PayslipDisputeModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(24)] public string DisputeCode { get; set; } = string.Empty;
    public Guid PayrollEntryId { get; set; }
    public Guid EmployeeId { get; set; }
    public PayslipDisputeCategory Category { get; set; }
    [Required, MaxLength(2000)] public string Content { get; set; } = string.Empty;
    [MaxLength(255)] public string? ProofPublicId { get; set; }
    public PayslipDisputeStatus Status { get; set; } = PayslipDisputeStatus.PENDING_RESPONSE;
    public Guid? RespondedBy { get; set; }
    public DateTime? RespondedAt { get; set; }
    [MaxLength(2000)] public string? AdminResponse { get; set; }
    [MaxLength(1000)] public string? CalculationNote { get; set; }
    [MaxLength(1000)] public string? AdjustmentNote { get; set; }
    public Guid? LinkedAdjustmentId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
