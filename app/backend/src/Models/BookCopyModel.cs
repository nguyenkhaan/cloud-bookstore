using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;

namespace backend.src.Models;

public class BookCopyModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(30)] public string CopyBarcode { get; set; } = string.Empty;
    public Guid EditionId { get; set; }
    public BookChannelAvailability Availability { get; set; } = BookChannelAvailability.BOTH;
    public BookCopyStatus Status { get; set; } = BookCopyStatus.PENDING_RECEIPT;
    public ConditionGrade ConditionGrade { get; set; }
    public string? ConditionNote { get; set; }
    public long CostPrice { get; set; }
    public long? SellingPrice { get; set; }
    public long? RentalRate { get; set; }
    [MaxLength(30)] public string? ShelfCode { get; set; }
    public Guid ReceiptLineId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
