using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;

namespace backend.src.Models;

public class StockReceiptLineModel
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ReceiptId { get; set; }
    public Guid EditionId { get; set; }
    public BookChannelAvailability Availability { get; set; } = BookChannelAvailability.BOTH;
    public ConditionGrade ConditionGrade { get; set; }
    public string? ConditionNote { get; set; }
    public int Quantity { get; set; } = 1;
    public long UnitCost { get; set; }
}
