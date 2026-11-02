using backend.src.Models.Enums;

namespace backend.src.Dto.BookCopyDto;

public record BookCopyQuery(
    string? CopyBarcode = null,
    string? Isbn = null,
    string? Name = null,
    Guid? TitleId = null,
    Guid? EditionId = null,
    Guid? SeriesId = null,
    string? VolumeLabel = null,
    string? Author = null,
    Guid? CategoryId = null,
    ConditionGrade? ConditionGrade = null,
    BookCopyStatus? Status = null,
    BookChannelAvailability? Availability = null,
    int Page = 1,
    int PageSize = 20
)
{
    public int Page { get; init; } = Page < 1 ? 1 : Page;
    public int PageSize { get; init; } = PageSize < 1 ? 20 : (PageSize > 100 ? 100 : PageSize);
}