using backend.src.Models.Enums;

namespace backend.src.Dto.InventoryAdjustmentDto;

public class InventoryAdjustmentQuery
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public InventoryAdjustmentStatus? Status { get; set; }
    public BookCopyStatus? RequestedStatus { get; set; }
    public InventoryVarianceType? VarianceType { get; set; }
    public Guid? CopyId { get; set; }
    public Guid? RequestedBy { get; set; }
    public string? Search { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
}
