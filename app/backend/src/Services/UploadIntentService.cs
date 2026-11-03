using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.UploadDto;
using backend.src.Exceptions;
using backend.src.Infrastructure;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

public sealed class UploadIntentService(
    AppDbContext dbContext,
    ICloudinaryService cloudinaryService,
    AuditLogService auditLogService)
{
    private const string AuditEntityType = "UploadIntent";
    private const string CreateAuditAction = "CREATE_UPLOAD_INTENT";

    public async Task<UploadSignatureResponse> CreateSignatureAsync(
        Guid actorId,
        UploadSignatureRequest request,
        AuditLogContext context,
        CancellationToken cancellationToken = default)
    {
        if (actorId == Guid.Empty)
        {
            throw new BadRequestException("Actor is invalid.");
        }

        var ownerType = request?.OwnerType
            ?? throw new BadRequestException("Owner type is required.");
        if (!Enum.IsDefined(ownerType))
        {
            throw new BadRequestException("Owner type is invalid.");
        }
        if (!IsImplementedBookOwnerType(ownerType))
        {
            throw new BadRequestException("This image owner type is not available yet.");
        }

        var intentId = Guid.NewGuid();
        var signature = cloudinaryService.CreateUploadSignature(ownerType, intentId);
        var intent = new UploadIntentModel
        {
            Id = intentId,
            OwnerType = ownerType,
            PublicImageId = signature.PublicId,
            Status = UploadIntentStatus.PENDING,
            CreatedBy = actorId,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.UploadIntents.Add(intent);
        await auditLogService.CreateAuditLogEntryAsync(
            new CreateAuditLogEntry(
                CreateAuditAction,
                AuditEntityType,
                intent.Id,
                null,
                new { intent.OwnerType, intent.PublicImageId, intent.Status },
                "Issued Cloudinary upload signature.",
                new AuditLogContext(actorId, context?.IpAddress)),
            cancellationToken);

        return new UploadSignatureResponse(
            intent.Id,
            signature.ApiKey,
            signature.UploadUrl,
            signature.PublicId,
            signature.AssetFolder,
            signature.UploadPreset,
            signature.DeliveryType,
            signature.Overwrite,
            signature.Timestamp,
            signature.Signature);
    }

    public async Task<string> ConsumeAsync(
        Guid actorId,
        UploadOwnerType expectedOwnerType,
        CloudinaryUploadResultRequest upload,
        CancellationToken cancellationToken = default)
    {
        if (actorId == Guid.Empty)
        {
            throw new BadRequestException("Actor is invalid.");
        }
        if (!Enum.IsDefined(expectedOwnerType))
        {
            throw new BadRequestException("Expected owner type is invalid.");
        }
        if (upload is null || upload.UploadIntentId == Guid.Empty)
        {
            throw new BadRequestException("Upload intent is required.");
        }
        if (string.IsNullOrWhiteSpace(upload.PublicId) || upload.PublicId.Length > 255)
        {
            throw new BadRequestException("Cloudinary public ID is invalid.");
        }
        if (upload.Version <= 0 || string.IsNullOrWhiteSpace(upload.Signature))
        {
            throw new BadRequestException("Cloudinary response signature is invalid.");
        }
        if (upload.Bytes is < 0)
        {
            throw new BadRequestException("Cloudinary response size is invalid.");
        }

        var intent = await dbContext.UploadIntents
            .SingleOrDefaultAsync(item => item.Id == upload.UploadIntentId, cancellationToken)
            ?? throw new NotFoundException("Upload intent does not exist.");

        if (intent.CreatedBy != actorId)
        {
            throw new ForbiddenException("Upload intent belongs to another user.");
        }
        if (intent.Status != UploadIntentStatus.PENDING)
        {
            throw new ConflictException("Upload intent has already been consumed.");
        }
        if (intent.OwnerType != expectedOwnerType ||
            !string.Equals(intent.PublicImageId, upload.PublicId.Trim(), StringComparison.Ordinal))
        {
            throw new BadRequestException("Upload result does not match its intent.");
        }
        if (!cloudinaryService.VerifyUploadResponse(
                intent.PublicImageId,
                upload.Version,
                upload.Signature.Trim()))
        {
            throw new BadRequestException("Cloudinary response signature is invalid.");
        }

        intent.AssetId = NormalizeOptional(upload.AssetId, 64, "Cloudinary asset ID");
        intent.Format = NormalizeOptional(upload.Format, 20, "Cloudinary format");
        intent.Bytes = upload.Bytes;
        intent.Status = UploadIntentStatus.COMPLETED;
        intent.CompletedAt = DateTime.UtcNow;

        return intent.PublicImageId;
    }

    private static bool IsImplementedBookOwnerType(UploadOwnerType ownerType)
        => ownerType is UploadOwnerType.BOOK_SERIES_IMAGE
            or UploadOwnerType.TITLE_IMAGE
            or UploadOwnerType.EDITION_IMAGE
            or UploadOwnerType.BOOK_COPY_IMAGE;

    private static string? NormalizeOptional(string? value, int maxLength, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim();
        if (normalized.Length > maxLength)
        {
            throw new BadRequestException($"{fieldName} is too long.");
        }

        return normalized;
    }
}
