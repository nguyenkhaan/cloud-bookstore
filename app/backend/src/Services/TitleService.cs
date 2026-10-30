using backend.src.Data;
using backend.src.Dto.Common;
using backend.src.Dto.TitleDto;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

public class TitleService(AppDbContext dbContext)
{
    public async Task<PagedResult<TitleResponse>> GetTitlesAsync(
        TitleQuery query,
        CancellationToken cancellationToken = default)
    {
        var baseQuery = dbContext.Titles.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Name))
        {
            var trimmedName = query.Name.Trim().ToLower();
            baseQuery = baseQuery.Where(t => t.Name.ToLower().Contains(trimmedName));
        }

        if (!string.IsNullOrWhiteSpace(query.Author))
        {
            var trimmedAuthor = query.Author.Trim().ToLower();
            baseQuery = baseQuery.Where(t => t.Author != null && t.Author.ToLower().Contains(trimmedAuthor));
        }

        if (query.SeriesId.HasValue)
        {
            baseQuery = baseQuery.Where(t => t.SeriesId == query.SeriesId.Value);
        }

        if (query.CategoryId.HasValue)
        {
            baseQuery = baseQuery.Where(t => t.CategoryId == query.CategoryId.Value);
        }

        if (query.IsActive.HasValue)
        {
            baseQuery = baseQuery.Where(t => t.IsActive == query.IsActive.Value);
        }

        var totalCount = await baseQuery.CountAsync(cancellationToken);

        var queryWithJoins = from t in baseQuery
                             join s in dbContext.BookSeries.AsNoTracking() on t.SeriesId equals s.Id into series
                             from s in series.DefaultIfEmpty()
                             join c in dbContext.Categories.AsNoTracking() on t.CategoryId equals c.Id into categories
                             from c in categories.DefaultIfEmpty()
                             orderby t.Name
                             select new TitleResponse(
                                 t.Id,
                                 t.Name,
                                 t.VolumeLabel,
                                 t.Author,
                                 t.OriginalPublishYear,
                                 t.Description,
                                 t.SeriesId,
                                 s != null ? s.Name : null,
                                 t.CategoryId,
                                 c != null ? c.Name : null,
                                 t.IsActive,
                                 t.CreatedAt,
                                 dbContext.Editions.Count(e => e.TitleId == t.Id)
                             );

        var items = await queryWithJoins
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<TitleResponse>(items, totalCount, query.Page, query.PageSize);
    }
}
