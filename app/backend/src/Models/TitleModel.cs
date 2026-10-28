using System.ComponentModel.DataAnnotations;

namespace backend.src.Models;

public class TitleModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? SeriesId { get; set; }
    [MaxLength(255)] public string Name { get; set; } = string.Empty;
    [MaxLength(30)] public string? VolumeLabel { get; set; }
    [MaxLength(255)] public string? Author { get; set; }
    public short? OriginalPublishYear { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid? CategoryId { get; set; }
    public bool IsActive { get; set; } = true;
}
