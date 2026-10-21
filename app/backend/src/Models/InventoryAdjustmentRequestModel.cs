using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;
namespace backend.src.Models;
public class InventoryAdjustmentRequestModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public Guid InventoryCheckId { get; set; }
    public BookCopyStatus RequestedStatus { get; set; }
    public string Reason { get; set; } = string.Empty;
    public InventoryAdjustmentStatus Status { get; set; } = InventoryAdjustmentStatus.PENDING_APPROVAL;
    public Guid RequestedBy { get; set; }
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime? AppliedAt { get; set; }
}
