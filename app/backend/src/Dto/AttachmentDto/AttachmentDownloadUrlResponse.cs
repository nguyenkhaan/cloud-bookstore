namespace backend.src.Dto.AttachmentDto;

public record class AttachmentDownloadUrlResponse(Guid Id, string Url, DateTime ExpiresAtUtc)
{ }