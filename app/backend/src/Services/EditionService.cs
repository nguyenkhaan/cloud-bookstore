using backend.src.Data;
using backend.src.Dto.Common;
using backend.src.Dto.EditionDto;
using backend.src.Exceptions;
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
        if (request.TitleId == Guid.Empty)
        {
            throw new BadRequestException("TitleId không hợp lệ.");
        }

        var title = await dbContext.Titles.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == request.TitleId, cancellationToken);
        if (title == null)
        {
            throw new NotFoundException($"Đầu sách với ID '{request.TitleId}' không tồn tại.");
        }

        if (!title.IsActive)
        {
            throw new BadRequestException("Không thể tạo ấn bản cho đầu sách đang bị ngừng sử dụng.");
        }

        if (request.CoverPrice < 0)
        {
            throw new BadRequestException("Giá bìa phải lớn hơn hoặc bằng 0.");
        }

        if (request.MinStockSale < 0)
        {
            throw new BadRequestException("Ngưỡng tồn tối thiểu kênh bán phải lớn hơn hoặc bằng 0.");
        }

        if (request.MinStockRental < 0)
        {
            throw new BadRequestException("Ngưỡng tồn tối thiểu kênh thuê phải lớn hơn hoặc bằng 0.");
        }

        var trimmedIsbn = string.IsNullOrWhiteSpace(request.Isbn) ? null : request.Isbn.Trim();
        if (trimmedIsbn?.Length > 20)
        {
            throw new BadRequestException("ISBN không được vượt quá 20 ký tự.");
        }

        var trimmedEditionStatement = string.IsNullOrWhiteSpace(request.EditionStatement) ? null : request.EditionStatement.Trim();
        if (trimmedEditionStatement?.Length > 100)
        {
            throw new BadRequestException("Thông tin ấn bản không được vượt quá 100 ký tự.");
        }

        var trimmedPrintingStatement = string.IsNullOrWhiteSpace(request.PrintingStatement) ? null : request.PrintingStatement.Trim();
        if (trimmedPrintingStatement?.Length > 100)
        {
            throw new BadRequestException("Thông tin lần in không được vượt quá 100 ký tự.");
        }

        var trimmedFormat = string.IsNullOrWhiteSpace(request.Format) ? null : request.Format.Trim();
        if (trimmedFormat?.Length > 100)
        {
            throw new BadRequestException("Định dạng không được vượt quá 100 ký tự.");
        }

        var trimmedPublisher = string.IsNullOrWhiteSpace(request.Publisher) ? null : request.Publisher.Trim();
        if (trimmedPublisher?.Length > 255)
        {
            throw new BadRequestException("Nhà xuất bản không được vượt quá 255 ký tự.");
        }

        var trimmedCoverImageUrl = string.IsNullOrWhiteSpace(request.CoverImageUrl) ? null : request.CoverImageUrl.Trim();

        var duplicateExists = await dbContext.Editions.AnyAsync(
            e => e.TitleId == request.TitleId &&
                 e.Isbn == trimmedIsbn &&
                 e.EditionStatement == trimmedEditionStatement &&
                 e.PrintingStatement == trimmedPrintingStatement &&
                 e.Format == trimmedFormat &&
                 e.PublishYear == request.PublishYear,
            cancellationToken);

        if (duplicateExists)
        {
            throw new ConflictException("Ấn bản tương tự của đầu sách này đã tồn tại trong hệ thống.");
        }

        Guid? confirmedBy = request.MetadataConfirmedBy ?? actorId;
        string? confirmedByName = null;
        DateTime? confirmedAt = null;

        if (confirmedBy.HasValue)
        {
            var employee = await dbContext.Employees.AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == confirmedBy.Value, cancellationToken);
            if (employee == null)
            {
                throw new NotFoundException($"Nhân viên với ID '{confirmedBy.Value}' không tồn tại.");
            }
            confirmedByName = employee.FullName;
            confirmedAt = DateTime.UtcNow;
        }

        var edition = new EditionModel
        {
            Id = Guid.NewGuid(),
            TitleId = request.TitleId,
            Isbn = trimmedIsbn,
            EditionStatement = trimmedEditionStatement,
            PrintingStatement = trimmedPrintingStatement,
            Format = trimmedFormat,
            Publisher = trimmedPublisher,
            PublishYear = request.PublishYear,
            CoverPrice = request.CoverPrice,
            MinStockSale = request.MinStockSale,
            MinStockRental = request.MinStockRental,
            CoverImageUrl = trimmedCoverImageUrl,
            MetadataSource = request.MetadataSource ?? MetadataSource.MANUAL,
            MetadataConfirmedBy = confirmedBy,
            MetadataConfirmedAt = confirmedAt,
            IsActive = request.IsActive
        };

        dbContext.Editions.Add(edition);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new EditionResponse(
            edition.Id,
            edition.Isbn,
            edition.TitleId,
            title.Name,
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
            confirmedByName,
            edition.MetadataConfirmedAt,
            edition.IsActive,
            0
        );
    }
}