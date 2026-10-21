using System.ComponentModel.DataAnnotations;

namespace backend.src.Models;

public class SystemSettingModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(80)] public string Key { get; set; } = string.Empty;
    public decimal Value { get; set; }
    [MaxLength(20)] public string? Unit { get; set; }
    public string? Description { get; set; }
    public Guid? UpdatedBy { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
