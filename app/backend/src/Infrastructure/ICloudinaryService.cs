using backend.src.Dto.UploadDto;
using backend.src.Models.Enums;

namespace backend.src.Infrastructure;

public interface ICloudinaryService
{
    CloudinaryUploadPolicy GetPolicy(UploadOwnerType ownerType);
    CloudinaryUploadSignature CreateUploadSignature(UploadOwnerType ownerType, Guid intentId);
    bool VerifyUploadResponse(string publicImageId, long version, string responseSignature);
    string BuildImageUrl(string publicImageId, UploadOwnerType ownerType);
    Task DestroyAsync(string publicImageId, UploadOwnerType ownerType, CancellationToken cancellationToken = default);
}
