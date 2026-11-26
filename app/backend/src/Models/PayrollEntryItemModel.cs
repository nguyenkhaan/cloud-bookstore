using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;

namespace backend.src.Models;

public sealed class PayrollEntryItemModel
{
    public const string ManualSource = "MANUAL";
    public const string AdjustmentSource = "ADJUSTMENT";

    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PayrollEntryId { get; set; }
    public PayrollItemCategory Category { get; set; }
    [Required, MaxLength(255)] public string Label { get; set; } = string.Empty;
    public long Amount { get; set; }
    [MaxLength(40)] public string? VoucherCode { get; set; }
    [MaxLength(30)] public string? SourceType { get; set; }
    public Guid? SourceId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
