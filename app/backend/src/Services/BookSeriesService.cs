using backend.src.Data;
using backend.src.Dto.BookSeriesDto;
using backend.src.Dto.Common;
using backend.src.Exceptions;
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

    public async Task<BookSeriesDetailResponse> GetBookSeriesByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var series = await dbContext.BookSeries.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (series == null)
        {
            throw new NotFoundException($"Book series with ID '{id}' was not found.");
        }

        var titles = await dbContext.Titles.AsNoTracking()
            .Where(t => t.SeriesId == id)
            .OrderBy(t => t.VolumeLabel)
            .ThenBy(t => t.Name)
            .Select(t => new BookSeriesTitleSummary(
                t.Id,
                t.Name,
                t.VolumeLabel,
                t.Author,
                t.OriginalPublishYear,
                t.IsActive
            ))
            .ToListAsync(cancellationToken);

        return new BookSeriesDetailResponse(
            series.Id,
            series.Name,
            series.Description,
            series.IsActive,
            series.CreatedAt,
            titles
        );
    }
}