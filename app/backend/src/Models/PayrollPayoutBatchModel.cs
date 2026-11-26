using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;

namespace backend.src.Models;

public sealed class PayrollPayoutBatchModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PayrollPeriodId { get; set; }
    public int BatchNumber { get; set; }
    public PaymentMethod Method { get; set; }
    [Required, MaxLength(80)] public string TransactionRef { get; set; } = string.Empty;
    public DateTime PayoutAt { get; set; } = DateTime.UtcNow;
    public long Amount { get; set; }
    [MaxLength(1000)] public string? Note { get; set; }
    [MaxLength(255)] public string? ProofPublicId { get; set; }
    public Guid ConfirmedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
