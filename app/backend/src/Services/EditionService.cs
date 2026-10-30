using backend.src.Data;
using backend.src.Dto.Common;
using backend.src.Dto.EditionDto;
using backend.src.Exceptions;
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

    public async Task<EditionDetailResponse> GetEditionByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var edition = await (from e in dbContext.Editions.AsNoTracking()
                             where e.Id == id
                             join t in dbContext.Titles.AsNoTracking() on e.TitleId equals t.Id into titles
                             from t in titles.DefaultIfEmpty()
                             join emp in dbContext.Employees.AsNoTracking() on e.MetadataConfirmedBy equals emp.Id into employees
                             from emp in employees.DefaultIfEmpty()
                             select new
                             {
                                 e.Id,
                                 e.Isbn,
                                 e.TitleId,
                                 TitleName = t != null ? t.Name : null,
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
                                 MetadataConfirmedByName = emp != null ? emp.FullName : null,
                                 e.MetadataConfirmedAt,
                                 e.IsActive
                             }).FirstOrDefaultAsync(cancellationToken);

        if (edition == null)
        {
            throw new NotFoundException($"Edition with ID '{id}' was not found.");
        }

        var copies = await dbContext.BookCopies.AsNoTracking()
            .Where(c => c.EditionId == id)
            .OrderBy(c => c.CopyBarcode)
            .Select(c => new EditionCopySummary(
                c.Id,
                c.CopyBarcode,
                c.ConditionGrade,
                c.Status,
                c.Availability,
                c.SellingPrice,
                c.RentalRate,
                c.ShelfCode,
                c.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        return new EditionDetailResponse(
            edition.Id,
            edition.Isbn,
            edition.TitleId,
            edition.TitleName,
            edition.EditionStatement,
            edition.PrintingStatement,
            edition.Format,
            edition.Publisher,
            edition.PublishYear,
            edition.CoverPrice,
            edition.MinStockSale,
            edition.MinStockRental,
            edition.CoverImageUrl,
            edition.MetadataSource,
            edition.MetadataConfirmedBy,
            edition.MetadataConfirmedByName,
            edition.MetadataConfirmedAt,
            edition.IsActive,
            copies
        );
    }
}