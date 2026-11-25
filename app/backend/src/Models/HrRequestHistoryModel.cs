using System.ComponentModel.DataAnnotations;

namespace backend.src.Models;

public sealed class HrRequestHistoryModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RequestId { get; set; }
    public Guid ActorId { get; set; }
    [Required, MaxLength(40)] public string Action { get; set; } = string.Empty;
    [MaxLength(1000)] public string? Note { get; set; }
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}
