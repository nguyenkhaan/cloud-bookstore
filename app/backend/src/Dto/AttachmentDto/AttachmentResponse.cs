using backend.src.Models.Enums;

namespace backend.src.Dto.AttachmentDto;

public record class AttachmentResponse(
    Guid Id,
    AttachmentOwnerType OwnerType,
    Guid OwnerId,
    string OriginalFileName,
    string ContentType,
    long SizeBytes,
    Guid UploadedBy,
    DateTime UploadedAt)
{ }