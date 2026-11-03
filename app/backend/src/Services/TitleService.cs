using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.Common;
using backend.src.Dto.TitleDto;
using backend.src.Dto.UploadDto;
using backend.src.Exceptions;
using backend.src.Infrastructure;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

public class TitleService(
    AppDbContext dbContext,
    UploadIntentService uploadIntentService,
    ICloudinaryService cloudinaryService,
    AuditLogService auditLogService,
    ILogger<TitleService> logger)
{
    private const UploadOwnerType TitleImageOwner = UploadOwnerType.TITLE_IMAGE;
    private const string AuditEntityType = "Title";
    private const string ActionAttachImage = "ATTACH_IMAGE";
    private const string ActionReplaceImage = "REPLACE_IMAGE";
    private const string ActionDeleteImage = "DELETE_IMAGE";

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
                             select new
                             {
                                 Response = new TitleResponse(
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
                                 dbContext.Editions.Count(e => e.TitleId == t.Id),
                                 null
                                 ),
                                 t.PublicImageId
                             };

        var rows = await queryWithJoins
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        // Image URLs are resolved in memory, never inside the EF projection.
        var items = rows
            .Select(row => row.Response with
            {
                ImageUrl = cloudinaryService.BuildImageUrlOrNull(row.PublicImageId, TitleImageOwner)
            })
            .ToList();

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
                               t.CreatedAt,
                               t.PublicImageId
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
                e.PublicImageId,
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
            cloudinaryService.BuildImageUrlOrNull(title.PublicImageId, TitleImageOwner),
            editions
        );
    }

    public async Task<TitleResponse> CreateTitleAsync(
        CreateTitleRequest request,
        AuditLogContext auditContext,
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

        // Domain validation is complete; consume the intent before tracking the new entity.
        string? publicImageId = null;
        if (request.ImageUpload is not null)
        {
            publicImageId = await ConsumeImageAsync(request.ImageUpload, auditContext, cancellationToken);
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
            PublicImageId = publicImageId,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Titles.Add(title);

        if (request.ImageUpload is not null)
        {
            // Persists the entity, consumed intent, and audit entry in one SaveChanges.
            await WriteImageAuditAsync(ActionAttachImage, title.Id, null, request.ImageUpload.UploadIntentId,
                publicImageId, "Attached image to title.", auditContext, cancellationToken);
        }
        else
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return ToResponse(title, seriesName, categoryName, editionsCount: 0);
    }

    public async Task<TitleResponse> UpdateTitleAsync(
        Guid id,
        UpdateTitleRequest request,
        AuditLogContext auditContext,
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

        string? replacedImageId = null;
        if (request.ImageUpload is not null)
        {
            replacedImageId = await ApplyImageAsync(title, request.ImageUpload, auditContext, cancellationToken);
        }
        else
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        await cloudinaryService.TryDestroyAfterCommitAsync(replacedImageId, TitleImageOwner, logger);

        var editionsCount = await dbContext.Editions.CountAsync(e => e.TitleId == id, cancellationToken);
        return ToResponse(title, seriesName, categoryName, editionsCount);
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
        return ToResponse(title, seriesName, categoryName, editionsCount);
    }

    public async Task DeleteTitleAsync(
        Guid id,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
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

        var oldImageId = title.PublicImageId;
        dbContext.Titles.Remove(title);

        if (oldImageId is not null)
        {
            await WriteImageAuditAsync(ActionDeleteImage, title.Id, oldImageId, null, null,
                "Removed image together with deleted title.", auditContext, cancellationToken);
        }
        else
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        await cloudinaryService.TryDestroyAfterCommitAsync(oldImageId, TitleImageOwner, logger);
    }

    public async Task<TitleResponse> UpdateTitleImageAsync(
        Guid id,
        CloudinaryUploadResultRequest imageUpload,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        if (imageUpload is null)
        {
            throw new BadRequestException("Image upload result is required.");
        }

        var title = await dbContext.Titles.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (title == null)
        {
            throw new NotFoundException($"Book title with ID '{id}' was not found.");
        }

        var replacedImageId = await ApplyImageAsync(title, imageUpload, auditContext, cancellationToken);
        await cloudinaryService.TryDestroyAfterCommitAsync(replacedImageId, TitleImageOwner, logger);

        return await BuildResponseAsync(title, cancellationToken);
    }

    public async Task DeleteTitleImageAsync(
        Guid id,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var title = await dbContext.Titles.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (title == null)
        {
            throw new NotFoundException($"Book title with ID '{id}' was not found.");
        }

        var oldImageId = title.PublicImageId;
        if (oldImageId is null)
        {
            return;
        }

        title.PublicImageId = null;
        await WriteImageAuditAsync(ActionDeleteImage, title.Id, oldImageId, null, null,
            "Removed title image.", auditContext, cancellationToken);

        await cloudinaryService.TryDestroyAfterCommitAsync(oldImageId, TitleImageOwner, logger);
    }

    /// <summary>
    /// Consumes the intent, sets the new direct image ID, and commits entity + intent + audit together.
    /// Returns the previous public ID that must be destroyed after the commit, if any.
    /// </summary>
    private async Task<string?> ApplyImageAsync(
        TitleModel title,
        CloudinaryUploadResultRequest imageUpload,
        AuditLogContext auditContext,
        CancellationToken cancellationToken)
    {
        var newImageId = await ConsumeImageAsync(imageUpload, auditContext, cancellationToken);
        var oldImageId = title.PublicImageId;
        title.PublicImageId = newImageId;

        var action = oldImageId is null ? ActionAttachImage : ActionReplaceImage;
        await WriteImageAuditAsync(action, title.Id, oldImageId, imageUpload.UploadIntentId, newImageId,
            oldImageId is null ? "Attached image to title." : "Replaced title image.",
            auditContext, cancellationToken);

        return oldImageId == newImageId ? null : oldImageId;
    }

    private Task<string> ConsumeImageAsync(
        CloudinaryUploadResultRequest imageUpload,
        AuditLogContext auditContext,
        CancellationToken cancellationToken)
    {
        if (auditContext?.ActorId is not { } actorId || actorId == Guid.Empty)
        {
            throw new UnauthorizedException("Authenticated user is required to attach an image.");
        }

        return uploadIntentService.ConsumeAsync(actorId, TitleImageOwner, imageUpload, cancellationToken);
    }

    private Task WriteImageAuditAsync(
        string action,
        Guid titleId,
        string? oldPublicImageId,
        Guid? uploadIntentId,
        string? newPublicImageId,
        string reason,
        AuditLogContext auditContext,
        CancellationToken cancellationToken)
        => auditLogService.CreateAuditLogEntryAsync(
            new CreateAuditLogEntry(
                action,
                AuditEntityType,
                titleId,
                oldPublicImageId is null ? null : new { PublicImageId = oldPublicImageId },
                newPublicImageId is null ? null : new { UploadIntentId = uploadIntentId, PublicImageId = newPublicImageId },
                reason,
                auditContext),
            cancellationToken);

    private async Task<TitleResponse> BuildResponseAsync(TitleModel title, CancellationToken cancellationToken)
    {
        var seriesName = title.SeriesId.HasValue
            ? await dbContext.BookSeries.AsNoTracking()
                .Where(s => s.Id == title.SeriesId.Value)
                .Select(s => s.Name)
                .FirstOrDefaultAsync(cancellationToken)
            : null;
        var categoryName = title.CategoryId.HasValue
            ? await dbContext.Categories.AsNoTracking()
                .Where(c => c.Id == title.CategoryId.Value)
                .Select(c => c.Name)
                .FirstOrDefaultAsync(cancellationToken)
            : null;
        var editionsCount = await dbContext.Editions.CountAsync(e => e.TitleId == title.Id, cancellationToken);

        return ToResponse(title, seriesName, categoryName, editionsCount);
    }

    private TitleResponse ToResponse(TitleModel title, string? seriesName, string? categoryName, int editionsCount)
        => new(
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
            editionsCount,
            cloudinaryService.BuildImageUrlOrNull(title.PublicImageId, TitleImageOwner)
        );
}
