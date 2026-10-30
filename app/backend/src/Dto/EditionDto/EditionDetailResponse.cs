using backend.src.Models.Enums;

namespace backend.src.Dto.EditionDto;

public record EditionCopySummary(
    Guid Id,
    string CopyBarcode,
    ConditionGrade? ConditionGrade,
    BookCopyStatus Status,
    BookChannelAvailability Availability,
    long? SellingPrice,
    long? RentalRate,
    string? ShelfCode,
    DateTime CreatedAt
);

public record EditionDetailResponse(
    Guid Id,
    string? Isbn,
    Guid TitleId,
    string? TitleName,
    string? EditionStatement,
    string? PrintingStatement,
    string? Format,
    string? Publisher,
    short? PublishYear,
    long CoverPrice,
    int MinStockSale,
    int MinStockRental,
    string? CoverImageUrl,
    MetadataSource? MetadataSource,
    Guid? MetadataConfirmedBy,
    string? MetadataConfirmedByName,
    DateTime? MetadataConfirmedAt,
    bool IsActive,
    IReadOnlyList<EditionCopySummary> Copies
);
