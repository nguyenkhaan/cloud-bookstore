using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;
namespace backend.src.Models;
public class ReturnModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(20)] public string ReturnNo { get; set; } = string.Empty;
    public Guid SlipId { get; set; }
    public ReturnStatus Status { get; set; } = ReturnStatus.DRAFT;
    public DateTime ReturnedAt { get; set; } = DateTime.UtcNow;
    public Guid CreatedBy { get; set; }
    public DateTime? SettledAt { get; set; }
}
