namespace backend.src.Dto.BookSeriesDto;

public record BookSeriesQuery(
    string? Name = null,
    bool? IsActive = null,
    int Page = 1,
    int PageSize = 20
)
{
    public int Page { get; init; } = Page < 1 ? 1 : Page;
    public int PageSize { get; init; } = PageSize < 1 ? 20 : (PageSize > 100 ? 100 : PageSize);
}