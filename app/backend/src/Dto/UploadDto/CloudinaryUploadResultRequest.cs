using System.ComponentModel.DataAnnotations;

namespace backend.src.Dto.UploadDto;

public sealed record CloudinaryUploadResultRequest(
    Guid UploadIntentId,
    [Required, MaxLength(255)] string PublicId,
    [Range(1, long.MaxValue)] long Version,
    [Required] string Signature,
    [MaxLength(64)] string? AssetId,
    [MaxLength(20)] string? Format,
    [Range(0, long.MaxValue)] long? Bytes);
