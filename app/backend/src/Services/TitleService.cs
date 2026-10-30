using backend.src.Data;
using backend.src.Dto.Common;
using backend.src.Dto.TitleDto;
using backend.src.Exceptions;
using backend.src.Models;
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

    public async Task<TitleDetailResponse> GetTitleByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var title = await (from t in dbContext.Titles.AsNoTracking()
                           where t.Id == id
                           join s in dbContext.BookSeries.AsNoTracking() on t.SeriesId equals s.Id into series
                           from s in series.DefaultIfEmpty()
                           join c in dbContext.Categories.AsNoTracking() on t.CategoryId equals c.Id into categories
                           from c in categories.DefaultIfEmpty()
                           select new
                           {
                               t.Id,
                               t.Name,
                               t.VolumeLabel,
                               t.Author,
                               t.OriginalPublishYear,
                               t.Description,
                               t.SeriesId,
                               SeriesName = s != null ? s.Name : null,
                               t.CategoryId,
                               CategoryName = c != null ? c.Name : null,
                               t.IsActive,
                               t.CreatedAt
                           }).FirstOrDefaultAsync(cancellationToken);

        if (title == null)
        {
            throw new NotFoundException($"Book title with ID '{id}' was not found.");
        }

        var editions = await dbContext.Editions.AsNoTracking()
            .Where(e => e.TitleId == id)
            .OrderBy(e => e.PublishYear)
            .ThenBy(e => e.EditionStatement)
            .Select(e => new TitleEditionSummary(
                e.Id,
                e.Isbn,
                e.Publisher,
                e.PublishYear,
                e.EditionStatement,
                e.PrintingStatement,
                e.Format,
                e.CoverPrice,
                e.CoverImageUrl,
                e.IsActive
            ))
            .ToListAsync(cancellationToken);

        return new TitleDetailResponse(
            title.Id,
            title.Name,
            title.VolumeLabel,
            title.Author,
            title.OriginalPublishYear,
            title.Description,
            title.SeriesId,
            title.SeriesName,
            title.CategoryId,
            title.CategoryName,
            title.IsActive,
            title.CreatedAt,
            editions
        );
    }

    public async Task<TitleResponse> CreateTitleAsync(
        CreateTitleRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new BadRequestException("Tên đầu sách không được để trống.");
        }

        var trimmedName = request.Name.Trim();
        if (trimmedName.Length > 255)
        {
            throw new BadRequestException("Tên đầu sách không được vượt quá 255 ký tự.");
        }

        string? seriesName = null;
        if (request.SeriesId.HasValue)
        {
            var series = await dbContext.BookSeries.AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == request.SeriesId.Value, cancellationToken);
            if (series == null)
            {
                throw new NotFoundException($"Bộ sách với ID '{request.SeriesId}' không tồn tại.");
            }
            if (!series.IsActive)
            {
                throw new BadRequestException("Không thể thêm đầu sách vào bộ sách đang bị ngừng sử dụng.");
            }
            seriesName = series.Name;
        }

        string? categoryName = null;
        if (request.CategoryId.HasValue)
        {
            var category = await dbContext.Categories.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == request.CategoryId.Value, cancellationToken);
            if (category == null)
            {
                throw new NotFoundException($"Thể loại với ID '{request.CategoryId}' không tồn tại.");
            }
            if (!category.IsActive)
            {
                throw new BadRequestException("Không thể chọn thể loại đang bị ngừng sử dụng.");
            }
            categoryName = category.Name;
        }

        var trimmedVolumeLabel = string.IsNullOrWhiteSpace(request.VolumeLabel) ? null : request.VolumeLabel.Trim();
        var duplicateExists = await dbContext.Titles.AnyAsync(
            t => t.SeriesId == request.SeriesId &&
                 t.Name.ToLower() == trimmedName.ToLower() &&
                 t.VolumeLabel == trimmedVolumeLabel,
            cancellationToken);

        if (duplicateExists)
        {
            throw new ConflictException("Đầu sách hoặc tập cùng tên đã tồn tại trong cùng bộ sách.");
        }

        var title = new TitleModel
        {
            Id = Guid.NewGuid(),
            SeriesId = request.SeriesId,
            Name = trimmedName,
            VolumeLabel = trimmedVolumeLabel,
            Author = string.IsNullOrWhiteSpace(request.Author) ? null : request.Author.Trim(),
            OriginalPublishYear = request.OriginalPublishYear,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            CategoryId = request.CategoryId,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Titles.Add(title);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new TitleResponse(
            title.Id,
            title.Name,
            title.VolumeLabel,
            title.Author,
            title.OriginalPublishYear,
            title.Description,
            title.SeriesId,
            seriesName,
            title.CategoryId,
            categoryName,
            title.IsActive,
            title.CreatedAt,
            EditionsCount: 0
        );
    }

    public async Task<TitleResponse> UpdateTitleAsync(
        Guid id,
        UpdateTitleRequest request,
        CancellationToken cancellationToken = default)
    {
        var title = await dbContext.Titles.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (title == null)
        {
            throw new NotFoundException($"Book title with ID '{id}' was not found.");
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new BadRequestException("Tên đầu sách không được để trống.");
        }

        var trimmedName = request.Name.Trim();
        if (trimmedName.Length > 255)
        {
            throw new BadRequestException("Tên đầu sách không được vượt quá 255 ký tự.");
        }

        string? seriesName = null;
        if (request.SeriesId.HasValue)
        {
            var series = await dbContext.BookSeries.AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == request.SeriesId.Value, cancellationToken);
            if (series == null)
            {
                throw new NotFoundException($"Bộ sách với ID '{request.SeriesId}' không tồn tại.");
            }
            if (!series.IsActive)
            {
                throw new BadRequestException("Không thể gán đầu sách vào bộ sách đang bị ngừng sử dụng.");
            }
            seriesName = series.Name;
        }

        string? categoryName = null;
        if (request.CategoryId.HasValue)
        {
            var category = await dbContext.Categories.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == request.CategoryId.Value, cancellationToken);
            if (category == null)
            {
                throw new NotFoundException($"Thể loại với ID '{request.CategoryId}' không tồn tại.");
            }
            if (!category.IsActive)
            {
                throw new BadRequestException("Không thể chọn thể loại đang bị ngừng sử dụng.");
            }
            categoryName = category.Name;
        }

        var trimmedVolumeLabel = string.IsNullOrWhiteSpace(request.VolumeLabel) ? null : request.VolumeLabel.Trim();
        var duplicateExists = await dbContext.Titles.AnyAsync(
            t => t.Id != id &&
                 t.SeriesId == request.SeriesId &&
                 t.Name.ToLower() == trimmedName.ToLower() &&
                 t.VolumeLabel == trimmedVolumeLabel,
            cancellationToken);

        if (duplicateExists)
        {
            throw new ConflictException("Đầu sách hoặc tập cùng tên đã tồn tại trong cùng bộ sách.");
        }

        title.Name = trimmedName;
        title.SeriesId = request.SeriesId;
        title.VolumeLabel = trimmedVolumeLabel;
        title.Author = string.IsNullOrWhiteSpace(request.Author) ? null : request.Author.Trim();
        title.OriginalPublishYear = request.OriginalPublishYear;
        title.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        title.CategoryId = request.CategoryId;
        if (request.IsActive.HasValue)
        {
            title.IsActive = request.IsActive.Value;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        var editionsCount = await dbContext.Editions.CountAsync(e => e.TitleId == id, cancellationToken);

        return new TitleResponse(
            title.Id,
            title.Name,
            title.VolumeLabel,
            title.Author,
            title.OriginalPublishYear,
            title.Description,
            title.SeriesId,
            seriesName,
            title.CategoryId,
            categoryName,
            title.IsActive,
            title.CreatedAt,
            editionsCount
        );
    }

    public async Task<TitleResponse> UpdateTitleStatusAsync(
        Guid id,
        UpdateTitleStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        var title = await dbContext.Titles.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (title == null)
        {
            throw new NotFoundException($"Book title with ID '{id}' was not found.");
        }

        string? seriesName = null;
        if (title.SeriesId.HasValue)
        {
            var series = await dbContext.BookSeries.AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == title.SeriesId.Value, cancellationToken);
            if (request.IsActive && series != null && !series.IsActive)
            {
                throw new BadRequestException("Không thể kích hoạt đầu sách khi bộ sách trực thuộc đang bị ngừng sử dụng.");
            }
            seriesName = series?.Name;
        }

        string? categoryName = null;
        if (title.CategoryId.HasValue)
        {
            var category = await dbContext.Categories.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == title.CategoryId.Value, cancellationToken);
            if (request.IsActive && category != null && !category.IsActive)
            {
                throw new BadRequestException("Không thể kích hoạt đầu sách khi thể loại trực thuộc đang bị ngừng sử dụng.");
            }
            categoryName = category?.Name;
        }

        title.IsActive = request.IsActive;

        if (!request.IsActive)
        {
            var activeEditions = await dbContext.Editions
                .Where(e => e.TitleId == id && e.IsActive)
                .ToListAsync(cancellationToken);

            foreach (var edition in activeEditions)
            {
                edition.IsActive = false;
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        var editionsCount = await dbContext.Editions.CountAsync(e => e.TitleId == id, cancellationToken);

        return new TitleResponse(
            title.Id,
            title.Name,
            title.VolumeLabel,
            title.Author,
            title.OriginalPublishYear,
            title.Description,
            title.SeriesId,
            seriesName,
            title.CategoryId,
            categoryName,
            title.IsActive,
            title.CreatedAt,
            editionsCount
        );
    }

    public async Task DeleteTitleAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var title = await dbContext.Titles.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (title == null)
        {
            throw new NotFoundException($"Book title with ID '{id}' was not found.");
        }

        var hasEditions = await dbContext.Editions.AnyAsync(e => e.TitleId == id, cancellationToken);
        if (hasEditions)
        {
            throw new BadRequestException("Không thể xóa đầu sách này vì đang có các ấn bản trực thuộc. Vui lòng chuyển trạng thái sang ngừng sử dụng thay vì xóa.");
        }

        dbContext.Titles.Remove(title);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}