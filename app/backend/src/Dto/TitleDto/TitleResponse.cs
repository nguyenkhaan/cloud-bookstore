namespace backend.src.Dto.TitleDto;

public record TitleResponse(
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
    int EditionsCount
);
