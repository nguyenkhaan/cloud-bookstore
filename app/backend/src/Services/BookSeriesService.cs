using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.BookSeriesDto;
using backend.src.Dto.Common;
using backend.src.Dto.UploadDto;
using backend.src.Exceptions;
using backend.src.Infrastructure;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

public class BookSeriesService(
    AppDbContext dbContext,
    UploadIntentService uploadIntentService,
    ICloudinaryService cloudinaryService,
    AuditLogService auditLogService,
    ILogger<BookSeriesService> logger)
{
    private const UploadOwnerType SeriesImageOwner = UploadOwnerType.BOOK_SERIES_IMAGE;
    private const UploadOwnerType TitleImageOwner = UploadOwnerType.TITLE_IMAGE;
    private const string AuditEntityType = "BookSeries";
    private const string ActionAttachImage = "ATTACH_IMAGE";
    private const string ActionReplaceImage = "REPLACE_IMAGE";
    private const string ActionDeleteImage = "DELETE_IMAGE";

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

        var rows = await (from s in baseQuery
                          orderby s.Name
                          select new
                          {
                              Response = new BookSeriesResponse(
                                  s.Id,
                                  s.Name,
                                  s.Description,
                                  s.IsActive,
                                  s.CreatedAt,
                                  dbContext.Titles.Count(t => t.SeriesId == s.Id),
                                  null
                              ),
                              s.PublicImageId
                          })
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        // Image URLs are resolved in memory, never inside the EF projection.
        var items = rows
            .Select(row => row.Response with
            {
                ImageUrl = cloudinaryService.BuildImageUrlOrNull(row.PublicImageId, SeriesImageOwner)
            })
            .ToList();

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

        var titleRows = await dbContext.Titles.AsNoTracking()
            .Where(t => t.SeriesId == id)
            .OrderBy(t => t.VolumeLabel)
            .ThenBy(t => t.Name)
            .Select(t => new
            {
                t.Id,
                t.Name,
                t.VolumeLabel,
                t.Author,
                t.OriginalPublishYear,
                t.IsActive,
                t.PublicImageId
            })
            .ToListAsync(cancellationToken);

        var titles = titleRows
            .Select(t => new BookSeriesTitleSummary(
                t.Id,
                t.Name,
                t.VolumeLabel,
                t.Author,
                t.OriginalPublishYear,
                t.IsActive,
                cloudinaryService.BuildImageUrlOrNull(t.PublicImageId, TitleImageOwner)
            ))
            .ToList();

        return new BookSeriesDetailResponse(
            series.Id,
            series.Name,
            series.Description,
            series.IsActive,
            series.CreatedAt,
            cloudinaryService.BuildImageUrlOrNull(series.PublicImageId, SeriesImageOwner),
            titles
        );
    }

    public async Task<BookSeriesResponse> CreateBookSeriesAsync(
        CreateBookSeriesRequest request,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new BadRequestException("Tên bộ sách không được để trống.");
        }

        var trimmedName = request.Name.Trim();
        if (trimmedName.Length > 255)
        {
            throw new BadRequestException("Tên bộ sách không được vượt quá 255 ký tự.");
        }

        var exists = await dbContext.BookSeries.AnyAsync(
            s => s.Name.ToLower() == trimmedName.ToLower(),
            cancellationToken);

        if (exists)
        {
            throw new ConflictException("Bộ sách cùng tên đã tồn tại.");
        }

        // Domain validation is complete; consume the intent before tracking the new entity.
        string? publicImageId = null;
        if (request.ImageUpload is not null)
        {
            publicImageId = await ConsumeImageAsync(request.ImageUpload, auditContext, cancellationToken);
        }

        var series = new BookSeriesModel
        {
            Id = Guid.NewGuid(),
            Name = trimmedName,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            PublicImageId = publicImageId,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.BookSeries.Add(series);

        if (request.ImageUpload is not null)
        {
            // Persists the entity, consumed intent, and audit entry in one SaveChanges.
            await WriteImageAuditAsync(ActionAttachImage, series.Id, null, request.ImageUpload.UploadIntentId,
                publicImageId, "Attached image to book series.", auditContext, cancellationToken);
        }
        else
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return ToResponse(series, titlesCount: 0);
    }

    public async Task<BookSeriesResponse> UpdateBookSeriesAsync(
        Guid id,
        UpdateBookSeriesRequest request,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var series = await dbContext.BookSeries.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (series == null)
        {
            throw new NotFoundException($"Book series with ID '{id}' was not found.");
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new BadRequestException("Tên bộ sách không được để trống.");
        }

        var trimmedName = request.Name.Trim();
        if (trimmedName.Length > 255)
        {
            throw new BadRequestException("Tên bộ sách không được vượt quá 255 ký tự.");
        }

        var duplicateExists = await dbContext.BookSeries.AnyAsync(
            s => s.Id != id && s.Name.ToLower() == trimmedName.ToLower(),
            cancellationToken);

        if (duplicateExists)
        {
            throw new ConflictException("Bộ sách cùng tên đã tồn tại.");
        }

        series.Name = trimmedName;
        series.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        if (request.IsActive.HasValue)
        {
            series.IsActive = request.IsActive.Value;
        }

        string? replacedImageId = null;
        if (request.ImageUpload is not null)
        {
            replacedImageId = await ApplyImageAsync(series, request.ImageUpload, auditContext, cancellationToken);
        }
        else
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        await cloudinaryService.TryDestroyAfterCommitAsync(replacedImageId, SeriesImageOwner, logger);

        var titlesCount = await dbContext.Titles.CountAsync(t => t.SeriesId == id, cancellationToken);
        return ToResponse(series, titlesCount);
    }

    public async Task<BookSeriesResponse> UpdateBookSeriesImageAsync(
        Guid id,
        CloudinaryUploadResultRequest imageUpload,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        if (imageUpload is null)
        {
            throw new BadRequestException("Image upload result is required.");
        }

        var series = await dbContext.BookSeries.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (series == null)
        {
            throw new NotFoundException($"Book series with ID '{id}' was not found.");
        }

        var replacedImageId = await ApplyImageAsync(series, imageUpload, auditContext, cancellationToken);
        await cloudinaryService.TryDestroyAfterCommitAsync(replacedImageId, SeriesImageOwner, logger);

        var titlesCount = await dbContext.Titles.CountAsync(t => t.SeriesId == id, cancellationToken);
        return ToResponse(series, titlesCount);
    }

    public async Task DeleteBookSeriesImageAsync(
        Guid id,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var series = await dbContext.BookSeries.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (series == null)
        {
            throw new NotFoundException($"Book series with ID '{id}' was not found.");
        }

        var oldImageId = series.PublicImageId;
        if (oldImageId is null)
        {
            return;
        }

        series.PublicImageId = null;
        await WriteImageAuditAsync(ActionDeleteImage, series.Id, oldImageId, null, null,
            "Removed book series image.", auditContext, cancellationToken);

        await cloudinaryService.TryDestroyAfterCommitAsync(oldImageId, SeriesImageOwner, logger);
    }

    public async Task<BookSeriesResponse> UpdateBookSeriesStatusAsync(
        Guid id,
        UpdateBookSeriesStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        var series = await dbContext.BookSeries.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (series == null)
        {
            throw new NotFoundException($"Book series with ID '{id}' was not found.");
        }

        series.IsActive = request.IsActive;

        if (!request.IsActive)
        {
            var activeTitles = await dbContext.Titles
                .Where(t => t.SeriesId == id && t.IsActive)
                .ToListAsync(cancellationToken);

            foreach (var title in activeTitles)
            {
                title.IsActive = false;
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        var titlesCount = await dbContext.Titles.CountAsync(t => t.SeriesId == id, cancellationToken);
        return ToResponse(series, titlesCount);
    }

    public async Task DeleteBookSeriesAsync(
        Guid id,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var series = await dbContext.BookSeries.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (series == null)
        {
            throw new NotFoundException($"Book series with ID '{id}' was not found.");
        }

        var hasTitles = await dbContext.Titles.AnyAsync(t => t.SeriesId == id, cancellationToken);
        if (hasTitles)
        {
            throw new BadRequestException("Không thể xóa bộ sách này vì đang có các đầu sách/tập trực thuộc. Vui lòng chuyển trạng thái sang ngừng sử dụng thay vì xóa.");
        }

        var oldImageId = series.PublicImageId;
        dbContext.BookSeries.Remove(series);

        if (oldImageId is not null)
        {
            await WriteImageAuditAsync(ActionDeleteImage, series.Id, oldImageId, null, null,
                "Removed image together with deleted book series.", auditContext, cancellationToken);
        }
        else
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        await cloudinaryService.TryDestroyAfterCommitAsync(oldImageId, SeriesImageOwner, logger);
    }

    /// <summary>
    /// Consumes the intent, sets the new direct image ID, and commits entity + intent + audit together.
    /// Returns the previous public ID that must be destroyed after the commit, if any.
    /// </summary>
    private async Task<string?> ApplyImageAsync(
        BookSeriesModel series,
        CloudinaryUploadResultRequest imageUpload,
        AuditLogContext auditContext,
        CancellationToken cancellationToken)
    {
        var newImageId = await ConsumeImageAsync(imageUpload, auditContext, cancellationToken);
        var oldImageId = series.PublicImageId;
        series.PublicImageId = newImageId;

        var action = oldImageId is null ? ActionAttachImage : ActionReplaceImage;
        await WriteImageAuditAsync(action, series.Id, oldImageId, imageUpload.UploadIntentId, newImageId,
            oldImageId is null ? "Attached image to book series." : "Replaced book series image.",
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

        return uploadIntentService.ConsumeAsync(actorId, SeriesImageOwner, imageUpload, cancellationToken);
    }

    private Task WriteImageAuditAsync(
        string action,
        Guid seriesId,
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
                seriesId,
                oldPublicImageId is null ? null : new { PublicImageId = oldPublicImageId },
                newPublicImageId is null ? null : new { UploadIntentId = uploadIntentId, PublicImageId = newPublicImageId },
                reason,
                auditContext),
            cancellationToken);

    private BookSeriesResponse ToResponse(BookSeriesModel series, int titlesCount)
        => new(
            series.Id,
            series.Name,
            series.Description,
            series.IsActive,
            series.CreatedAt,
            titlesCount,
            cloudinaryService.BuildImageUrlOrNull(series.PublicImageId, SeriesImageOwner)
        );
}
