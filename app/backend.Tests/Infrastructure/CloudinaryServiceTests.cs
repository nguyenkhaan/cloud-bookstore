using backend.src.Configurations;
using backend.src.Dto.UploadDto;
using backend.src.Infrastructure;
using backend.src.Models.Enums;
using System.Security.Cryptography;
using System.Text;
using CloudinaryDotNet;
using Microsoft.Extensions.Options;
using Xunit;

namespace backend.Tests.Infrastructure;

public sealed class CloudinaryServiceTests
{
    private static readonly CloudinarySettings Settings = new()
    {
        CloudName = "test-cloud",
        ApiKey = "123456789012345",
        ApiSecret = "test-api-secret",
        RootFolder = "cloud-bookstore",
        FolderMode = CloudinaryFolderMode.DYNAMIC,
        PublicUploadPreset = "book-images-signed",
        AuthenticatedUploadPreset = "evidence-images-signed"
    };

    [Theory]
    [InlineData(UploadOwnerType.BOOK_SERIES_IMAGE, "upload", "public/book-series")]
    [InlineData(UploadOwnerType.TITLE_IMAGE, "upload", "public/titles")]
    [InlineData(UploadOwnerType.EDITION_IMAGE, "upload", "public/editions")]
    [InlineData(UploadOwnerType.BOOK_COPY_IMAGE, "upload", "public/book-copies")]
    [InlineData(UploadOwnerType.RENTAL_LINE_IMAGE, "authenticated", "private/rental-lines")]
    [InlineData(UploadOwnerType.STOCK_RECEIPT_IMAGE, "authenticated", "private/stock-receipts")]
    public void GetPolicy_maps_owner_type_to_backend_owned_delivery_and_folder(
        UploadOwnerType ownerType,
        string expectedDeliveryType,
        string expectedFolder)
    {
        var policy = CreateService().GetPolicy(ownerType);

        Assert.Equal(expectedDeliveryType, policy.DeliveryType);
        Assert.Equal(expectedFolder, policy.Folder);
    }

    [Fact]
    public void CreateUploadSignature_uses_backend_owned_public_id_and_only_expected_parameters()
    {
        var intentId = Guid.Parse("d6d6bd89-a507-4e6f-82bf-7e78d35fdb1e");
        var signature = CreateService().CreateUploadSignature(UploadOwnerType.EDITION_IMAGE, intentId);

        Assert.Equal("cloud-bookstore/public/editions/d6d6bd89a5074e6f82bf7e78d35fdb1e", signature.PublicId);
        Assert.Equal("book-images-signed", signature.UploadPreset);
        Assert.Equal("upload", signature.DeliveryType);
        Assert.False(signature.Overwrite);
        Assert.Equal("cloud-bookstore/public/editions", signature.AssetFolder);
        Assert.Equal("123456789012345", signature.ApiKey);
        Assert.Equal("https://api.cloudinary.com/v1_1/test-cloud/image/upload", signature.UploadUrl);

        // Hand-written string to sign, exactly as Cloudinary rebuilds it from the form values the
        // frontend posts (lowercase "false"). Not computed through the SDK so serialization bugs show up.
        var stringToSign =
            "asset_folder=cloud-bookstore/public/editions" +
            "&overwrite=false" +
            "&public_id=cloud-bookstore/public/editions/d6d6bd89a5074e6f82bf7e78d35fdb1e" +
            $"&timestamp={signature.Timestamp}" +
            "&type=upload" +
            "&upload_preset=book-images-signed";
        var expectedSignature = Convert.ToHexStringLower(
            SHA1.HashData(Encoding.UTF8.GetBytes(stringToSign + Settings.ApiSecret)));

        Assert.Equal(expectedSignature, signature.Signature);
    }

    [Fact]
    public void VerifyUploadResponse_rejects_a_signature_for_another_public_id()
    {
        var service = CreateService();
        const long version = 1_735_689_100;
        var signatureForAnotherAsset = CreateCloudinary().Api.SignParameters(new SortedDictionary<string, object>
        {
            ["public_id"] = "cloud-bookstore/public/editions/another-intent",
            ["version"] = version
        });

        Assert.False(service.VerifyUploadResponse(
            "cloud-bookstore/public/editions/expected-intent",
            version,
            signatureForAnotherAsset));
    }

    [Fact]
    public void BuildImageUrl_uses_https_and_signs_authenticated_evidence_urls()
    {
        var service = CreateService();

        var publicUrl = service.BuildImageUrl(
            "cloud-bookstore/public/titles/a-title",
            UploadOwnerType.TITLE_IMAGE);
        var privateUrl = service.BuildImageUrl(
            "cloud-bookstore/private/rental-lines/a-line",
            UploadOwnerType.RENTAL_LINE_IMAGE);

        Assert.StartsWith("https://res.cloudinary.com/test-cloud/image/upload/", publicUrl);
        Assert.StartsWith("https://res.cloudinary.com/test-cloud/image/authenticated/s--", privateUrl);
    }

    private static CloudinaryService CreateService()
        => new(Options.Create(Settings));

    private static Cloudinary CreateCloudinary()
        => new(new Account(Settings.CloudName, Settings.ApiKey, Settings.ApiSecret));
}
