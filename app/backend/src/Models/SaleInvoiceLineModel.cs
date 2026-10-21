using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;
namespace backend.src.Models;
public class SaleInvoiceLineModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public Guid InvoiceId { get; set; }
    public Guid CopyId { get; set; }
    public long ListPrice { get; set; }
    public decimal DiscountPct { get; set; }
    public long DiscountAmount { get; set; }
    public long FinalPrice { get; set; }
    public SaleInvoiceLineStatus Status { get; set; } = SaleInvoiceLineStatus.ACTIVE;
}
