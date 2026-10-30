namespace backend.src.Dto.EditionDto;

public record EditionQuery(
    string? Isbn = null,
    Guid? TitleId = null,
    string? Publisher = null,
    short? PublishYear = null,
    bool? IsActive = null,
    int Page = 1,
    int PageSize = 20
)
{
    public int Page { get; init; } = Page < 1 ? 1 : Page;
    public int PageSize { get; init; } = PageSize < 1 ? 20 : (PageSize > 100 ? 100 : PageSize);
}