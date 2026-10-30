namespace backend.src.Dto.BookSeriesDto;

public record BookSeriesResponse(
    Guid Id,
    string Name,
    string? Description,
    bool IsActive,
    DateTime CreatedAt,
    int TitlesCount
);