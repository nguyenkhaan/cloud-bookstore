using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;
namespace backend.src.Models;
public class PaymentModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(20)] public string PaymentNo { get; set; } = string.Empty;
    [MaxLength(80)] public string IdempotencyKey { get; set; } = string.Empty;
    public PaymentDirection Direction { get; set; }
    public PaymentType PaymentType { get; set; }
    public PaymentMethod Method { get; set; }
    public long Amount { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.PENDING;
    public Guid? CashSessionId { get; set; }
    public Guid? SaleInvoiceId { get; set; }
    public Guid? RentalSlipId { get; set; }
    public Guid? StockReceiptId { get; set; }
    public Guid? ReturnId { get; set; }
    public Guid? WorkRecordId { get; set; }
    public long? CashReceived { get; set; }
    [MaxLength(60)] public string? QrReference { get; set; }
    public DateTime? QrExpiresAt { get; set; }
    [MaxLength(80)] public string? BankReference { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
}
