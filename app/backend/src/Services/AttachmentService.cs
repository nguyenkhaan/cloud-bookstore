using backend.src.Configurations;
using backend.src.Data;
using backend.src.Dto.AttachmentDto;
using backend.src.Dto.AuditLogDto;
using backend.src.Exceptions;
using backend.src.Helpers;
using backend.src.Infrastructure;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace backend.src.Services;

public class AttachmentService(
    AppDbContext dbContext,
    IMinioService minioService,
    AuditLogService auditLogService,
    IOptions<MinioSettings> minioSettings,
    ILogger<AttachmentService> logger)
{
    private const string EntityType = "AttachmentModel";
    private readonly MinioSettings settings = minioSettings.Value;

    private static readonly Dictionary<string, string> ExtensionByContentType = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = "jpg",
        ["image/png"] = "png",
        ["image/webp"] = "webp",
        ["application/pdf"] = "pdf"
    };

    public async Task<AttachmentResponse> UploadAsync(
        Guid actorId,
        UploadAttachmentRequest request,
        AuditLogContext context,
        CancellationToken cancellationToken = default)
    {
        var ownerType = request.OwnerType ?? throw new BadRequestException("Owner type is required.");
        var ownerId = request.OwnerId ?? throw new BadRequestException("Owner id is required.");
        if (!Enum.IsDefined(ownerType))
            throw new BadRequestException("Owner type is invalid.");
        if (ownerId == Guid.Empty)
            throw new BadRequestException("Owner id is invalid.");

        var file = request.File;
        if (file is null || file.Length == 0)
            throw new BadRequestException("File is required.");
        if (file.Length > settings.MaxFileSizeBytes)
            throw new BadRequestException($"File exceeds the {settings.MaxFileSizeMb} MB limit.");

        var contentType = (file.ContentType ?? string.Empty).Trim().ToLowerInvariant();
        if (!settings.AllowedContentTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase) ||
            !ExtensionByContentType.TryGetValue(contentType, out var extension))
            throw new BadRequestException("File type is not allowed.");

        await EnsureOwnerExistsAsync(ownerType, ownerId, cancellationToken);
        await EnsureSignatureMatchesAsync(file, contentType, cancellationToken);

        var attachmentId = Guid.NewGuid();
        var objectKey = $"{ownerType.ToString().ToLowerInvariant()}/{ownerId:N}/{attachmentId:N}.{extension}";

        await using (var content = file.OpenReadStream())
        {
            await minioService.UploadAsync(objectKey, content, file.Length, contentType, cancellationToken);
        }

        var attachment = new AttachmentModel
        {
            Id = attachmentId,
            OwnerType = ownerType,
            OwnerId = ownerId,
            ObjectKey = objectKey,
            OriginalFileName = NormalizeFileName(file.FileName),
            ContentType = contentType,
            SizeBytes = file.Length,
            UploadedBy = actorId,
            UploadedAt = DateTime.UtcNow
        };

        try
        {
            dbContext.Attachments.Add(attachment);
            // Audit gọi SaveChanges nên metadata và audit được lưu cùng một lần.
            await auditLogService.CreateAuditLogEntryAsync(
                new CreateAuditLogEntry(
                    "UPLOAD_ATTACHMENT",
                    EntityType,
                    attachment.Id,
                    null,
                    ToResponse(attachment),
                    "Upload attachment",
                    context),
                cancellationToken);
        }
        catch
        {
            await TryDeleteObjectAsync(objectKey);
            throw;
        }

        return ToResponse(attachment);
    }

    public async Task<List<AttachmentResponse>> SearchAsync(
        AttachmentQuery query,
        CancellationToken cancellationToken = default)
    {
        var ownerType = query.OwnerType ?? throw new BadRequestException("Owner type is required.");
        var ownerId = query.OwnerId ?? throw new BadRequestException("Owner id is required.");

        return await dbContext.Attachments
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.OwnerType == ownerType && x.OwnerId == ownerId)
            .OrderByDescending(x => x.UploadedAt)
            .Select(x => new AttachmentResponse(
                x.Id, x.OwnerType, x.OwnerId, x.OriginalFileName,
                x.ContentType, x.SizeBytes, x.UploadedBy, x.UploadedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<AttachmentDownloadUrlResponse> GetDownloadUrlAsync(
        Guid attachmentId,
        CancellationToken cancellationToken = default)
    {
        var attachment = await dbContext.Attachments
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == attachmentId && !x.IsDeleted, cancellationToken);
        if (attachment is null)
            throw new NotFoundException("Attachment does not exist.");

        var expiry = TimeSpan.FromSeconds(settings.PresignedUrlExpirySeconds);
        var url = await minioService.GetPresignedUrlAsync(attachment.ObjectKey, expiry);
        return new AttachmentDownloadUrlResponse(attachment.Id, url, DateTime.UtcNow.Add(expiry));
    }

    public async Task DeleteAsync(
        Guid actorId,
        Guid attachmentId,
        DeleteAttachmentRequest request,
        AuditLogContext context,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new BadRequestException("Reason is required");

        var actor = await dbContext.Employees
            .Include(employee => employee.Role)
            .FirstOrDefaultAsync(employee => employee.Id == actorId, cancellationToken);
        if (actor is null)
            throw new NotFoundException("Actor for this action is invalid");

        var attachment = await dbContext.Attachments
            .FirstOrDefaultAsync(x => x.Id == attachmentId && !x.IsDeleted, cancellationToken);
        if (attachment is null)
            throw new NotFoundException("Attachment does not exist.");

        if (actor.Role.RoleName != RoleName.ADMIN && attachment.UploadedBy != actorId)
            throw new ForbiddenException("Only Admin or the uploader can delete this attachment");

        var before = ToResponse(attachment);
        attachment.IsDeleted = true;
        attachment.DeletedAt = DateTime.UtcNow;
        attachment.DeletedBy = actorId;

        await auditLogService.CreateAuditLogEntryAsync(
            new CreateAuditLogEntry(
                "DELETE_ATTACHMENT",
                EntityType,
                attachment.Id,
                before,
                new { IsDeleted = true, attachment.DeletedAt },
                request.Reason,
                context),
            cancellationToken);
    }

    private async Task EnsureOwnerExistsAsync(
        AttachmentOwnerType ownerType,
        Guid ownerId,
        CancellationToken cancellationToken)
    {
        var exists = ownerType switch
        {
            AttachmentOwnerType.EDITION_COVER =>
                await dbContext.Editions.AnyAsync(x => x.Id == ownerId, cancellationToken),
            AttachmentOwnerType.RENTAL_LINE_DAMAGE =>
                await dbContext.RentalLines.AnyAsync(x => x.Id == ownerId, cancellationToken),
            AttachmentOwnerType.STOCK_RECEIPT =>
                await dbContext.StockReceipts.AnyAsync(x => x.Id == ownerId, cancellationToken),
            _ => false
        };
        if (!exists)
            throw new NotFoundException("Attachment owner does not exist.");
    }

    private static async Task EnsureSignatureMatchesAsync(
        IFormFile file,
        string contentType,
        CancellationToken cancellationToken)
    {
        var header = new byte[FileSignatureValidator.HeaderLength];
        await using var stream = file.OpenReadStream();
        var read = await stream.ReadAtLeastAsync(
            header, header.Length, throwOnEndOfStream: false, cancellationToken);
        if (!FileSignatureValidator.Matches(contentType, header.AsSpan(0, read)))
            throw new BadRequestException("File content does not match its declared type.");
    }

    private async Task TryDeleteObjectAsync(string objectKey)
    {
        try
        {
            await minioService.DeleteAsync(objectKey, CancellationToken.None);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Could not remove orphan object {ObjectKey}.", objectKey);
        }
    }

    private static string NormalizeFileName(string? fileName)
    {
        var name = Path.GetFileName(fileName ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(name))
            return "file";
        return name.Length > 255 ? name[..255] : name;
    }

    private static AttachmentResponse ToResponse(AttachmentModel x) => new(
        x.Id, x.OwnerType, x.OwnerId, x.OriginalFileName,
        x.ContentType, x.SizeBytes, x.UploadedBy, x.UploadedAt);
}