using backend.src.Models.Enums;

namespace backend.src.Infrastructure;

public static class CloudinaryServiceExtensions
{
    public static string? BuildImageUrlOrNull(
        this ICloudinaryService cloudinaryService,
        string? publicImageId,
        UploadOwnerType ownerType)
        => string.IsNullOrWhiteSpace(publicImageId)
            ? null
            : cloudinaryService.BuildImageUrl(publicImageId, ownerType);

    /// <summary>
    /// Destroys an asset whose database reference has already been committed away.
    /// Failures never propagate: the database stays authoritative and the orphan is
    /// logged as a structured warning for the future cleanup worker.
    /// </summary>
    public static async Task TryDestroyAfterCommitAsync(
        this ICloudinaryService cloudinaryService,
        string? publicImageId,
        UploadOwnerType ownerType,
        ILogger logger)
    {
        if (string.IsNullOrWhiteSpace(publicImageId))
        {
            return;
        }

        try
        {
            // The DB change is already committed; do not let request abortion skip the cleanup attempt.
            await cloudinaryService.DestroyAsync(publicImageId, ownerType, CancellationToken.None);
        }
        catch (Exception exception)
        {
            logger.LogWarning(
                exception,
                "Cloudinary orphan: failed to destroy asset {PublicImageId} ({OwnerType}) after database commit.",
                publicImageId,
                ownerType);
        }
    }
}
