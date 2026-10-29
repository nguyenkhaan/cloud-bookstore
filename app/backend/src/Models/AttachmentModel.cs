using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;

namespace backend.src.Models;

public class AttachmentModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public AttachmentOwnerType OwnerType { get; set; }
    public Guid OwnerId { get; set; }
    [Required, MaxLength(300)] public string ObjectKey { get; set; } = string.Empty;
    [Required, MaxLength(255)] public string OriginalFileName { get; set; } = string.Empty;
    [Required, MaxLength(100)] public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public Guid UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedBy { get; set; }
}