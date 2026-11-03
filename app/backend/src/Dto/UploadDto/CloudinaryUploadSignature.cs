namespace backend.src.Dto.UploadDto;

public sealed record CloudinaryUploadSignature(
    string ApiKey,
    string UploadUrl,
    string PublicId,
    string? AssetFolder,
    string UploadPreset,
    string DeliveryType,
    long Timestamp,
    string Signature);
