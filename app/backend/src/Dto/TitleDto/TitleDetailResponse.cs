namespace backend.src.Dto.TitleDto;

public record TitleEditionSummary(
    Guid Id,
    string? Isbn,
    string? Publisher,
    short? PublishYear,
    string? EditionStatement,
    string? PrintingStatement,
    string? Format,
    long CoverPrice,
    string? CoverImageUrl,
    bool IsActive
);

public record TitleDetailResponse(
    Guid Id,
    string Name,
    string? VolumeLabel,
    string? Author,
    short? OriginalPublishYear,
    string? Description,
    Guid? SeriesId,
    string? SeriesName,
    Guid? CategoryId,
    string? CategoryName,
    bool IsActive,
    DateTime CreatedAt,
    IReadOnlyList<TitleEditionSummary> Editions
);