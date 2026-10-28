using System.ComponentModel.DataAnnotations;

namespace backend.src.Models;

public class BookSeriesModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(255)] public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
