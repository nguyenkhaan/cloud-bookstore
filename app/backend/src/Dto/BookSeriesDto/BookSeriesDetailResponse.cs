namespace backend.src.Dto.BookSeriesDto;

public record BookSeriesTitleSummary(
    Guid Id,
    string Name,
    string? VolumeLabel,
    string? Author,
    short? OriginalPublishYear,
    bool IsActive,
    string? ImageUrl
);

public record BookSeriesDetailResponse(
    Guid Id,
    string Name,
    string? Description,
    bool IsActive,
    DateTime CreatedAt,
    string? ImageUrl,
    IReadOnlyList<BookSeriesTitleSummary> Titles
);