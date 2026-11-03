namespace backend.src.Infrastructure;

public sealed record CloudinaryUploadPolicy(
    string DeliveryType,
    string UploadPreset,
    string Folder);
