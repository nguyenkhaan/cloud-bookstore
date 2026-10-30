using backend.src.Data;
using backend.src.Dto.BookSeriesDto;
using backend.src.Dto.Common;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

public class BookSeriesService(AppDbContext dbContext)
{
    public async Task<PagedResult<BookSeriesResponse>> GetBookSeriesAsync(
        BookSeriesQuery query,
        CancellationToken cancellationToken = default)
    {
        var baseQuery = dbContext.BookSeries.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Name))
        {
            var trimmedName = query.Name.Trim().ToLower();
            baseQuery = baseQuery.Where(s => s.Name.ToLower().Contains(trimmedName));
        }

        if (query.IsActive.HasValue)
        {
            baseQuery = baseQuery.Where(s => s.IsActive == query.IsActive.Value);
        }

        var totalCount = await baseQuery.CountAsync(cancellationToken);

        var items = await (from s in baseQuery
                           orderby s.Name
                           select new BookSeriesResponse(
                               s.Id,
                               s.Name,
                               s.Description,
                               s.IsActive,
                               s.CreatedAt,
                               dbContext.Titles.Count(t => t.SeriesId == s.Id)
                           ))
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<BookSeriesResponse>(items, totalCount, query.Page, query.PageSize);
    }
}