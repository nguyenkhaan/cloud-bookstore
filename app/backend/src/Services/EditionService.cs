using backend.src.Data;
using backend.src.Dto.Common;
using backend.src.Dto.EditionDto;
using backend.src.Exceptions;
using backend.src.Helpers;
using backend.src.Models;
using backend.src.Models.Enums;
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

    public async Task<EditionResponse> CreateEditionAsync(
        CreateEditionRequest request,
        Guid? actorId = null,
        CancellationToken cancellationToken = default)
    {
        var title = await EditionValidator.EnsureTitleValidForEditionAsync(
            dbContext, request.TitleId, request.IsActive, cancellationToken);

        var meta = EditionValidator.NormalizeAndValidate(
            request.Isbn, request.EditionStatement, request.PrintingStatement,
            request.Format, request.Publisher, request.CoverImageUrl,
            request.CoverPrice, request.MinStockSale, request.MinStockRental);

        await EditionValidator.EnsureNoDuplicateAsync(
            dbContext, request.TitleId, meta, request.PublishYear, cancellationToken: cancellationToken);

        var (confirmedBy, confirmedByName, confirmedAt) = await EditionValidator.ResolveConfirmationAsync(
            dbContext, request.MetadataConfirmedBy ?? actorId, cancellationToken: cancellationToken);

        var edition = new EditionModel
        {
            Id = Guid.NewGuid(),
            TitleId = request.TitleId,
            Isbn = meta.Isbn,
            EditionStatement = meta.EditionStatement,
            PrintingStatement = meta.PrintingStatement,
            Format = meta.Format,
            Publisher = meta.Publisher,
            PublishYear = request.PublishYear,
            CoverPrice = meta.CoverPrice,
            MinStockSale = meta.MinStockSale,
            MinStockRental = meta.MinStockRental,
            CoverImageUrl = meta.CoverImageUrl,
            MetadataSource = request.MetadataSource ?? MetadataSource.MANUAL,
            MetadataConfirmedBy = confirmedBy,
            MetadataConfirmedAt = confirmedAt,
            IsActive = request.IsActive
        };

        dbContext.Editions.Add(edition);
        await dbContext.SaveChangesAsync(cancellationToken);

        return edition.ToResponse(title.Name, confirmedByName, copiesCount: 0);
    }

    public async Task<EditionResponse> UpdateEditionAsync(
        Guid id,
        UpdateEditionRequest request,
        Guid? actorId = null,
        CancellationToken cancellationToken = default)
    {
        var edition = await dbContext.Editions.FirstOrDefaultAsync(e => e.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Edition with ID '{id}' was not found.");

        var targetTitleId = request.TitleId ?? edition.TitleId;
        var nextActive = request.IsActive ?? edition.IsActive;

        var title = await EditionValidator.EnsureTitleValidForEditionAsync(
            dbContext, targetTitleId, nextActive, cancellationToken);

        var meta = EditionValidator.NormalizeAndValidate(
            request.Isbn, request.EditionStatement, request.PrintingStatement,
            request.Format, request.Publisher, request.CoverImageUrl,
            request.CoverPrice, request.MinStockSale, request.MinStockRental);

        await EditionValidator.EnsureNoDuplicateAsync(
            dbContext, targetTitleId, meta, request.PublishYear, excludeEditionId: id, cancellationToken: cancellationToken);

        var targetConfirmedBy = request.MetadataConfirmedBy ?? actorId ?? edition.MetadataConfirmedBy;
        var (confirmedBy, confirmedByName, confirmedAt) = await EditionValidator.ResolveConfirmationAsync(
            dbContext, targetConfirmedBy, existingConfirmedAt: (request.MetadataConfirmedBy == null && actorId == null) ? edition.MetadataConfirmedAt : DateTime.UtcNow, cancellationToken: cancellationToken);

        edition.TitleId = targetTitleId;
        edition.Isbn = meta.Isbn;
        edition.EditionStatement = meta.EditionStatement;
        edition.PrintingStatement = meta.PrintingStatement;
        edition.Format = meta.Format;
        edition.Publisher = meta.Publisher;
        edition.PublishYear = request.PublishYear;
        edition.CoverPrice = meta.CoverPrice;
        edition.MinStockSale = meta.MinStockSale;
        edition.MinStockRental = meta.MinStockRental;
        edition.CoverImageUrl = meta.CoverImageUrl;
        if (request.MetadataSource.HasValue)
        {
            edition.MetadataSource = request.MetadataSource.Value;
        }
        edition.MetadataConfirmedBy = confirmedBy;
        edition.MetadataConfirmedAt = confirmedAt;
        if (request.IsActive.HasValue)
        {
            edition.IsActive = request.IsActive.Value;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        var copiesCount = await dbContext.BookCopies.CountAsync(c => c.EditionId == id, cancellationToken);
        return edition.ToResponse(title.Name, confirmedByName, copiesCount);
    }

    public async Task<EditionResponse> UpdateEditionStatusAsync(
        Guid id,
        UpdateEditionStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        var edition = await dbContext.Editions.FirstOrDefaultAsync(e => e.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Edition with ID '{id}' was not found.");

        var title = await dbContext.Titles.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == edition.TitleId, cancellationToken);

        if (request.IsActive && title != null && !title.IsActive)
        {
            throw new BadRequestException("Không thể kích hoạt ấn bản khi đầu sách trực thuộc đang bị ngừng sử dụng.");
        }

        edition.IsActive = request.IsActive;
        await dbContext.SaveChangesAsync(cancellationToken);

        var (_, confirmedByName, _) = await EditionValidator.ResolveConfirmationAsync(
            dbContext, edition.MetadataConfirmedBy, existingConfirmedAt: edition.MetadataConfirmedAt, cancellationToken: cancellationToken);

        var copiesCount = await dbContext.BookCopies.CountAsync(c => c.EditionId == id, cancellationToken);
        return edition.ToResponse(title?.Name, confirmedByName, copiesCount);
    }

    public async Task DeleteEditionAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var edition = await dbContext.Editions.FirstOrDefaultAsync(e => e.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Edition with ID '{id}' was not found.");

        await EditionValidator.EnsureDeletableAsync(dbContext, id, cancellationToken);

        dbContext.Editions.Remove(edition);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}