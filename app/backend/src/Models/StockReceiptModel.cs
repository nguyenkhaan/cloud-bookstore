using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;

namespace backend.src.Models;

public class StockReceiptModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(20)] public string Code { get; set; } = string.Empty;
    public StockReceiptSourceType SourceType { get; set; }
    public Guid? SupplierId { get; set; }
    public Guid? SellerId { get; set; }
    public ApprovalStatus Status { get; set; } = ApprovalStatus.DRAFT;
    public long TotalAmount { get; set; }
    public bool NeedsApproval { get; set; }
    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? RejectReason { get; set; }
    public string? Note { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
}
