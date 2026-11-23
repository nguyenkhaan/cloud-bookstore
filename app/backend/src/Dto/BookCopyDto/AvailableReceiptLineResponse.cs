using backend.src.Models.Enums;

namespace backend.src.Dto.BookCopyDto;

public record AvailableReceiptLineResponse(
    Guid Id,
    string ReceiptCode,
    int RemainingQuantity,
    ConditionGrade ConditionGrade,
    BookChannelAvailability Availability);
