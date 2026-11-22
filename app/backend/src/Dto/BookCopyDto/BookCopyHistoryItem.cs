using backend.src.Models.Enums;

namespace backend.src.Dto.BookCopyDto;

public record BookCopyHistoryMetadata(
    long? CostPrice = null,
    string? SupplierName = null,
    string? CustomerName = null,
    long? DepositAmount = null,
    CopyCondition? CopyCondition = null,
    long? RefundAmount = null,
    long? AdditionalAmountDue = null,
    string? ShelfCode = null,
    long? SellingPrice = null,
    string? ReturnStatus = null
);

public record BookCopyHistoryItem(
    DateTime OccurredAt,
    string Source,
    string EventType,
    string Summary,
    Guid? ReferenceId,
    string? ReferenceCode,
    Guid? ActorId,
    string? ActorName,
    string? BeforeData,
    string? AfterData,
    string? Reason,
    BookCopyHistoryMetadata? Metadata = null
);