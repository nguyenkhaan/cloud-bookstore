using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;

namespace backend.src.Models;

public class InventoryCheckModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(20)] public string CheckCode { get; set; } = string.Empty;
    public Guid CopyId { get; set; }
    public BookCopyStatus ExpectedStatus { get; set; }
    public BookCopyStatus? ObservedStatus { get; set; }
    public bool IsFound { get; set; }
    public InventoryVarianceType? VarianceType { get; set; }
    public string? Note { get; set; }
    public Guid CheckedBy { get; set; }
    public DateTime CheckedAt { get; set; } = DateTime.UtcNow;
}
