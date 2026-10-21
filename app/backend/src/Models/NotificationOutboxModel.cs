using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;
namespace backend.src.Models;
public class NotificationOutboxModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public NotificationChannel Channel { get; set; }
    public NotificationRecipientType RecipientType { get; set; }
    [MaxLength(255)] public string RecipientAddress { get; set; } = string.Empty;
    [MaxLength(80)] public string? TemplateCode { get; set; }
    public string Content { get; set; } = "{}";
    [MaxLength(60)] public string SourceEntityType { get; set; } = string.Empty;
    public Guid SourceEntityId { get; set; }
    public NotificationStatus Status { get; set; } = NotificationStatus.PENDING;
    public short AttemptCount { get; set; }
    public DateTime? NextRetryAt { get; set; }
    [MaxLength(120)] public string? ProviderMessageId { get; set; }
    public string? LastError { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SentAt { get; set; }
}
