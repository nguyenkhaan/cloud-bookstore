using backend.src.Models.Enums;

namespace backend.src.Dto.InventoryAdjustmentDto;

public record CreateInventoryAdjustmentRequestDto(
    Guid? CopyId = null,
    string? CopyBarcode = null,
    Guid? InventoryCheckId = null,
    BookCopyStatus? RequestedStatus = null,
    string? Reason = null,
    InventoryVarianceType? VarianceType = null,
    bool? IsFound = null,
    string? CheckCode = null,
    string? CheckNote = null);
