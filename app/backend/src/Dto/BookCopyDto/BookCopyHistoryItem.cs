namespace backend.src.Dto.BookCopyDto;

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
    string? Reason
);