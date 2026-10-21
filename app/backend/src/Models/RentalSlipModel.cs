using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;
namespace backend.src.Models;
public class RentalSlipModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(20)] public string SlipNo { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public Guid TierId { get; set; }
    public DateOnly RentDate { get; set; }
    public RentalSlipStatus Status { get; set; } = RentalSlipStatus.DRAFT;
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ActivatedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
}
