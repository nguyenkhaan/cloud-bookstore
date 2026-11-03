using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;

namespace backend.src.Models;

public class UploadIntentModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public UploadOwnerType OwnerType { get; set; }
    [Required, MaxLength(255)] public string PublicImageId { get; set; } = string.Empty;
    public UploadIntentStatus Status { get; set; } = UploadIntentStatus.PENDING;
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    [MaxLength(64)] public string? AssetId { get; set; }
    [MaxLength(20)] public string? Format { get; set; }
    public long? Bytes { get; set; }
}
