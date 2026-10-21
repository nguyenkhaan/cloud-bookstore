using System.ComponentModel.DataAnnotations;
using System.Net;
namespace backend.src.Models;
public class AuditLogModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public Guid? ActorId { get; set; }
    public IPAddress? IpAddress { get; set; }
    [MaxLength(60)] public string Action { get; set; } = string.Empty;
    [MaxLength(60)] public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string? BeforeData { get; set; }
    public string? AfterData { get; set; }
    public string? Reason { get; set; }
}
