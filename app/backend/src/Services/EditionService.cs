using backend.src.Data;
using backend.src.Dto.Common;
using backend.src.Dto.EditionDto;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

public class EditionService(AppDbContext dbContext)
{
    public async Task<PagedResult<EditionResponse>> GetEditionsAsync(
        EditionQuery query,
        CancellationToken cancellationToken = default)
    {
        var baseQuery = dbContext.Editions.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Isbn))
        {
            var cleanIsbn = query.Isbn.Trim().Replace("-", "");
            baseQuery = baseQuery.Where(e => e.Isbn != null && e.Isbn.Replace("-", "").Contains(cleanIsbn));
        }

        if (query.TitleId.HasValue)
        {
            baseQuery = baseQuery.Where(e => e.TitleId == query.TitleId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Publisher))
        {
            var trimmedPublisher = query.Publisher.Trim().ToLower();
            baseQuery = baseQuery.Where(e => e.Publisher != null && e.Publisher.ToLower().Contains(trimmedPublisher));
        }

        if (query.PublishYear.HasValue)
        {
            baseQuery = baseQuery.Where(e => e.PublishYear == query.PublishYear.Value);
        }

        if (query.IsActive.HasValue)
        {
            baseQuery = baseQuery.Where(e => e.IsActive == query.IsActive.Value);
        }

        var totalCount = await baseQuery.CountAsync(cancellationToken);

        var queryWithJoins = from e in baseQuery
                             join t in dbContext.Titles.AsNoTracking() on e.TitleId equals t.Id into titles
                             from t in titles.DefaultIfEmpty()
                             join emp in dbContext.Employees.AsNoTracking() on e.MetadataConfirmedBy equals emp.Id into employees
                             from emp in employees.DefaultIfEmpty()
                             orderby t != null ? t.Name : "", e.PublishYear descending
                             select new EditionResponse(
                                 e.Id,
                                 e.Isbn,
                                 e.TitleId,
                                 t != null ? t.Name : null,
                                 e.EditionStatement,
                                 e.PrintingStatement,
                                 e.Format,
                                 e.Publisher,
                                 e.PublishYear,
                                 e.CoverPrice,
                                 e.MinStockSale,
                                 e.MinStockRental,
                                 e.CoverImageUrl,
                                 e.MetadataSource,
                                 e.MetadataConfirmedBy,
                                 emp != null ? emp.FullName : null,
                                 e.MetadataConfirmedAt,
                                 e.IsActive,
                                 dbContext.BookCopies.Count(c => c.EditionId == e.Id)
                             );

        var items = await queryWithJoins
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<EditionResponse>(items, totalCount, query.Page, query.PageSize);
    }
}