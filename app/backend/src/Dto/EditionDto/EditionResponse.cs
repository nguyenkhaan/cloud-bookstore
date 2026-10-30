using backend.src.Models.Enums;

namespace backend.src.Dto.EditionDto;

public record EditionResponse(
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
    int CopiesCount
);