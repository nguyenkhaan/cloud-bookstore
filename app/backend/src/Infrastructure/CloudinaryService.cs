using backend.src.Configurations;
using backend.src.Dto.UploadDto;
using backend.src.Models.Enums;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using System.Text;

namespace backend.src.Infrastructure;

public sealed class CloudinaryService : ICloudinaryService
{
    private const string ImageResourceType = "image";
    private readonly CloudinarySettings settings;
    private readonly Cloudinary cloudinary;

    public CloudinaryService(IOptions<CloudinarySettings> cloudinarySettings)
    {
        settings = cloudinarySettings.Value;
        cloudinary = new Cloudinary(new Account(
            settings.CloudName,
            settings.ApiKey,
            settings.ApiSecret));
    }

    public CloudinaryUploadPolicy GetPolicy(UploadOwnerType ownerType)
        => ownerType switch
        {
            UploadOwnerType.BOOK_SERIES_IMAGE => new("upload", settings.PublicUploadPreset, "public/book-series"),
            UploadOwnerType.TITLE_IMAGE => new("upload", settings.PublicUploadPreset, "public/titles"),
            UploadOwnerType.EDITION_IMAGE => new("upload", settings.PublicUploadPreset, "public/editions"),
            UploadOwnerType.BOOK_COPY_IMAGE => new("upload", settings.PublicUploadPreset, "public/book-copies"),
            UploadOwnerType.RENTAL_LINE_IMAGE => new("authenticated", settings.AuthenticatedUploadPreset, "private/rental-lines"),
            UploadOwnerType.STOCK_RECEIPT_IMAGE => new("authenticated", settings.AuthenticatedUploadPreset, "private/stock-receipts"),
            _ => throw new ArgumentOutOfRangeException(nameof(ownerType), ownerType, "Unsupported Cloudinary upload owner type.")
        };

    public CloudinaryUploadSignature CreateUploadSignature(UploadOwnerType ownerType, Guid intentId)
    {
        var policy = GetPolicy(ownerType);
        var publicId = $"{settings.RootFolder}/{policy.Folder}/{intentId:N}";
        var assetFolder = settings.FolderMode == CloudinaryFolderMode.DYNAMIC
            ? $"{settings.RootFolder}/{policy.Folder}"
            : null;
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var parameters = new SortedDictionary<string, object>
        {
            ["public_id"] = publicId,
            ["timestamp"] = timestamp,
            ["type"] = policy.DeliveryType,
            ["upload_preset"] = policy.UploadPreset,
            ["overwrite"] = false
        };
        if (assetFolder is not null)
        {
            parameters.Add("asset_folder", assetFolder);
        }

        return new CloudinaryUploadSignature(
            settings.ApiKey,
            $"https://api.cloudinary.com/v1_1/{settings.CloudName}/{ImageResourceType}/upload",
            publicId,
            assetFolder,
            policy.UploadPreset,
            policy.DeliveryType,
            timestamp,
            cloudinary.Api.SignParameters(parameters));
    }

    public bool VerifyUploadResponse(string publicImageId, long version, string responseSignature)
    {
        if (string.IsNullOrWhiteSpace(responseSignature))
        {
            return false;
        }

        var expectedSignature = cloudinary.Api.SignParameters(
            new SortedDictionary<string, object>
            {
                ["public_id"] = publicImageId,
                ["version"] = version
            },
            signatureVersion: 1);

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expectedSignature),
            Encoding.UTF8.GetBytes(responseSignature));
    }

    public string BuildImageUrl(string publicImageId, UploadOwnerType ownerType)
    {
        var policy = GetPolicy(ownerType);
        return cloudinary.Api.UrlImgUp
            .Secure(true)
            .Type(policy.DeliveryType)
            .Signed(policy.DeliveryType == "authenticated")
            .BuildUrl(publicImageId);
    }

    public async Task DestroyAsync(
        string publicImageId,
        UploadOwnerType ownerType,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var policy = GetPolicy(ownerType);
        var result = await cloudinary.DestroyAsync(new DeletionParams(publicImageId)
        {
            ResourceType = ResourceType.Image,
            Type = policy.DeliveryType,
            Invalidate = true
        });

        if (result.Error is not null)
        {
            throw new InvalidOperationException($"Cloudinary failed to delete asset '{publicImageId}'.");
        }
    }
}
