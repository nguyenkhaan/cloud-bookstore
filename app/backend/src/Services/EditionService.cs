using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.Common;
using backend.src.Dto.EditionDto;
using backend.src.Dto.UploadDto;
using backend.src.Exceptions;
using backend.src.Helpers;
using backend.src.Infrastructure;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

public class EditionService(
    AppDbContext dbContext,
    UploadIntentService uploadIntentService,
    ICloudinaryService cloudinaryService,
    AuditLogService auditLogService,
    ILogger<EditionService> logger)
{
    private const UploadOwnerType EditionImageOwner = UploadOwnerType.EDITION_IMAGE;
    private const string AuditEntityType = "Edition";
    private const string ActionAttachImage = "ATTACH_IMAGE";
    private const string ActionReplaceImage = "REPLACE_IMAGE";
    private const string ActionDeleteImage = "DELETE_IMAGE";

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
                             select new
                             {
                                 Response = new EditionResponse(
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
                                 null,
                                 e.MetadataSource,
                                 e.MetadataConfirmedBy,
                                 emp != null ? emp.FullName : null,
                                 e.MetadataConfirmedAt,
                                 e.IsActive,
                                 dbContext.BookCopies.Count(c => c.EditionId == e.Id)
                                 ),
                                 e.PublicImageId
                             };

        var rows = await queryWithJoins
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        // Image URLs are resolved in memory, never inside the EF projection.
        var items = rows
            .Select(row => row.Response with
            {
                ImageUrl = cloudinaryService.BuildImageUrlOrNull(row.PublicImageId, EditionImageOwner)
            })
            .ToList();

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
                                 e.PublicImageId,
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
            cloudinaryService.BuildImageUrlOrNull(edition.PublicImageId, EditionImageOwner),
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
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var actorId = auditContext?.ActorId;
        var title = await EditionValidator.EnsureTitleValidForEditionAsync(
            dbContext, request.TitleId, request.IsActive, cancellationToken);

        var meta = EditionValidator.NormalizeAndValidate(
            request.Isbn, request.EditionStatement, request.PrintingStatement,
            request.Format, request.Publisher,
            request.CoverPrice, request.MinStockSale, request.MinStockRental);

        await EditionValidator.EnsureNoDuplicateAsync(
            dbContext, request.TitleId, meta, request.PublishYear, cancellationToken: cancellationToken);

        var (confirmedBy, confirmedByName, confirmedAt) = await EditionValidator.ResolveConfirmationAsync(
            dbContext, request.MetadataConfirmedBy ?? actorId, cancellationToken: cancellationToken);

        // Domain validation is complete; consume the intent before tracking the new entity.
        string? publicImageId = null;
        if (request.ImageUpload is not null)
        {
            publicImageId = await ConsumeImageAsync(request.ImageUpload, auditContext, cancellationToken);
        }

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
            PublicImageId = publicImageId,
            MetadataSource = request.MetadataSource ?? MetadataSource.MANUAL,
            MetadataConfirmedBy = confirmedBy,
            MetadataConfirmedAt = confirmedAt,
            IsActive = request.IsActive
        };

        dbContext.Editions.Add(edition);

        if (request.ImageUpload is not null)
        {
            // Persists the entity, consumed intent, and audit entry in one SaveChanges.
            await WriteImageAuditAsync(ActionAttachImage, edition.Id, null, request.ImageUpload.UploadIntentId,
                publicImageId, "Attached image to edition.", auditContext, cancellationToken);
        }
        else
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return ToResponse(edition, title.Name, confirmedByName, copiesCount: 0);
    }

    public async Task<EditionResponse> UpdateEditionAsync(
        Guid id,
        UpdateEditionRequest request,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var actorId = auditContext?.ActorId;
        var edition = await dbContext.Editions.FirstOrDefaultAsync(e => e.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Edition with ID '{id}' was not found.");

        var targetTitleId = request.TitleId ?? edition.TitleId;
        var nextActive = request.IsActive ?? edition.IsActive;

        var title = await EditionValidator.EnsureTitleValidForEditionAsync(
            dbContext, targetTitleId, nextActive, cancellationToken);

        var meta = EditionValidator.NormalizeAndValidate(
            request.Isbn, request.EditionStatement, request.PrintingStatement,
            request.Format, request.Publisher,
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

        // The image only changes through a verified upload intent; omitting it keeps the current image.
        string? replacedImageId = null;
        if (request.ImageUpload is not null)
        {
            replacedImageId = await ApplyImageAsync(edition, request.ImageUpload, auditContext, cancellationToken);
        }
        else
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        await cloudinaryService.TryDestroyAfterCommitAsync(replacedImageId, EditionImageOwner, logger);

        var copiesCount = await dbContext.BookCopies.CountAsync(c => c.EditionId == id, cancellationToken);
        return ToResponse(edition, title.Name, confirmedByName, copiesCount);
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
        return ToResponse(edition, title?.Name, confirmedByName, copiesCount);
    }

    public async Task DeleteEditionAsync(
        Guid id,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var edition = await dbContext.Editions.FirstOrDefaultAsync(e => e.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Edition with ID '{id}' was not found.");

        await EditionValidator.EnsureDeletableAsync(dbContext, id, cancellationToken);

        var oldImageId = edition.PublicImageId;
        dbContext.Editions.Remove(edition);

        if (oldImageId is not null)
        {
            await WriteImageAuditAsync(ActionDeleteImage, edition.Id, oldImageId, null, null,
                "Removed image together with deleted edition.", auditContext, cancellationToken);
        }
        else
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        await cloudinaryService.TryDestroyAfterCommitAsync(oldImageId, EditionImageOwner, logger);
    }

    public async Task<EditionResponse> UpdateEditionImageAsync(
        Guid id,
        CloudinaryUploadResultRequest imageUpload,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        if (imageUpload is null)
        {
            throw new BadRequestException("Image upload result is required.");
        }

        var edition = await dbContext.Editions.FirstOrDefaultAsync(e => e.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Edition with ID '{id}' was not found.");

        var replacedImageId = await ApplyImageAsync(edition, imageUpload, auditContext, cancellationToken);
        await cloudinaryService.TryDestroyAfterCommitAsync(replacedImageId, EditionImageOwner, logger);

        return await BuildResponseAsync(edition, cancellationToken);
    }

    public async Task DeleteEditionImageAsync(
        Guid id,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var edition = await dbContext.Editions.FirstOrDefaultAsync(e => e.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Edition with ID '{id}' was not found.");

        var oldImageId = edition.PublicImageId;
        if (oldImageId is null)
        {
            return;
        }

        edition.PublicImageId = null;
        await WriteImageAuditAsync(ActionDeleteImage, edition.Id, oldImageId, null, null,
            "Removed edition image.", auditContext, cancellationToken);

        await cloudinaryService.TryDestroyAfterCommitAsync(oldImageId, EditionImageOwner, logger);
    }

    /// <summary>
    /// Consumes the intent, sets the new direct image ID, and commits entity + intent + audit together.
    /// Returns the previous public ID that must be destroyed after the commit, if any.
    /// </summary>
    private async Task<string?> ApplyImageAsync(
        EditionModel edition,
        CloudinaryUploadResultRequest imageUpload,
        AuditLogContext auditContext,
        CancellationToken cancellationToken)
    {
        var newImageId = await ConsumeImageAsync(imageUpload, auditContext, cancellationToken);
        var oldImageId = edition.PublicImageId;
        edition.PublicImageId = newImageId;

        var action = oldImageId is null ? ActionAttachImage : ActionReplaceImage;
        await WriteImageAuditAsync(action, edition.Id, oldImageId, imageUpload.UploadIntentId, newImageId,
            oldImageId is null ? "Attached image to edition." : "Replaced edition image.",
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

        return uploadIntentService.ConsumeAsync(actorId, EditionImageOwner, imageUpload, cancellationToken);
    }

    private Task WriteImageAuditAsync(
        string action,
        Guid editionId,
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
                editionId,
                oldPublicImageId is null ? null : new { PublicImageId = oldPublicImageId },
                newPublicImageId is null ? null : new { UploadIntentId = uploadIntentId, PublicImageId = newPublicImageId },
                reason,
                auditContext),
            cancellationToken);

    private async Task<EditionResponse> BuildResponseAsync(EditionModel edition, CancellationToken cancellationToken)
    {
        var titleName = await dbContext.Titles.AsNoTracking()
            .Where(t => t.Id == edition.TitleId)
            .Select(t => t.Name)
            .FirstOrDefaultAsync(cancellationToken);
        var (_, confirmedByName, _) = await EditionValidator.ResolveConfirmationAsync(
            dbContext, edition.MetadataConfirmedBy, existingConfirmedAt: edition.MetadataConfirmedAt, cancellationToken: cancellationToken);
        var copiesCount = await dbContext.BookCopies.CountAsync(c => c.EditionId == edition.Id, cancellationToken);

        return ToResponse(edition, titleName, confirmedByName, copiesCount);
    }

    private EditionResponse ToResponse(EditionModel edition, string? titleName, string? confirmedByName, int copiesCount)
        => edition.ToResponse(
            titleName,
            confirmedByName,
            copiesCount,
            cloudinaryService.BuildImageUrlOrNull(edition.PublicImageId, EditionImageOwner));
}
