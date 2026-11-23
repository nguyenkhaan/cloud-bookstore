using backend.src.Models.Enums;

namespace backend.src.Dto.InventoryAdjustmentDto;

public record UpdateInventoryAdjustmentStatusDto(
    InventoryAdjustmentStatus? Status,
    string? Reason = null);
