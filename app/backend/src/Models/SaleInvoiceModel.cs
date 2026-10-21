using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;
namespace backend.src.Models;
public class SaleInvoiceModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(20)] public string? InvoiceNo { get; set; }
    public Guid? CustomerId { get; set; }
    public Guid CashSessionId { get; set; }
    public SaleInvoiceStatus Status { get; set; } = SaleInvoiceStatus.DRAFT;
    public long Subtotal { get; set; }
    public long DiscountTotal { get; set; }
    public long TotalPayable { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
}
