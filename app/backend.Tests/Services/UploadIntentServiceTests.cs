using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.UploadDto;
using backend.src.Exceptions;
using backend.src.Infrastructure;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace backend.Tests.Services;

public sealed class UploadIntentServiceTests
{
    [Fact]
    public async Task CreateSignature_persists_pending_intent_for_a_book_owner()
    {
        await using var dbContext = CreateDbContext();
        var actorId = Guid.NewGuid();
        var service = CreateService(dbContext);

        var response = await service.CreateSignatureAsync(
            actorId,
            new UploadSignatureRequest(UploadOwnerType.BOOK_SERIES_IMAGE),
            new AuditLogContext(actorId, null));

        var intent = await dbContext.UploadIntents.SingleAsync();
        Assert.Equal(response.UploadIntentId, intent.Id);
        Assert.Equal(UploadOwnerType.BOOK_SERIES_IMAGE, intent.OwnerType);
        Assert.Equal(UploadIntentStatus.PENDING, intent.Status);
        Assert.Equal(actorId, intent.CreatedBy);
        Assert.Equal(intent.PublicImageId, response.PublicId);
        Assert.False(response.Overwrite);
        Assert.Null(typeof(UploadSignatureResponse).GetProperty("ApiSecret"));
        Assert.Equal("CREATE_UPLOAD_INTENT", (await dbContext.AuditLogs.SingleAsync()).Action);
    }

    [Fact]
    public async Task CreateSignature_rejects_deferred_evidence_owner_types()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(dbContext);

        await Assert.ThrowsAsync<BadRequestException>(() => service.CreateSignatureAsync(
            Guid.NewGuid(),
            new UploadSignatureRequest(UploadOwnerType.RENTAL_LINE_IMAGE),
            new AuditLogContext(null, null)));

        Assert.Empty(dbContext.UploadIntents);
        Assert.Empty(dbContext.AuditLogs);
    }

    [Fact]
    public async Task ConsumeAsync_rejects_intent_owned_by_another_actor()
    {
        await using var dbContext = CreateDbContext();
        var intent = AddPendingIntent(dbContext, UploadOwnerType.TITLE_IMAGE, Guid.NewGuid());
        await dbContext.SaveChangesAsync();
        var service = CreateService(dbContext);

        await Assert.ThrowsAsync<ForbiddenException>(() => service.ConsumeAsync(
            Guid.NewGuid(),
            UploadOwnerType.TITLE_IMAGE,
            CreateUploadResult(intent)));

        Assert.Equal(UploadIntentStatus.PENDING, intent.Status);
    }

    [Fact]
    public async Task ConsumeAsync_rejects_untrusted_cloudinary_response()
    {
        await using var dbContext = CreateDbContext();
        var actorId = Guid.NewGuid();
        var intent = AddPendingIntent(dbContext, UploadOwnerType.EDITION_IMAGE, actorId);
        await dbContext.SaveChangesAsync();
        var service = CreateService(dbContext, verifiesResponse: false);

        await Assert.ThrowsAsync<BadRequestException>(() => service.ConsumeAsync(
            actorId,
            UploadOwnerType.EDITION_IMAGE,
            CreateUploadResult(intent)));

        Assert.Equal(UploadIntentStatus.PENDING, intent.Status);
        Assert.Null(intent.CompletedAt);
    }

    [Fact]
    public async Task ConsumeAsync_completes_once_and_copies_metadata()
    {
        await using var dbContext = CreateDbContext();
        var actorId = Guid.NewGuid();
        var intent = AddPendingIntent(dbContext, UploadOwnerType.BOOK_COPY_IMAGE, actorId);
        await dbContext.SaveChangesAsync();
        var service = CreateService(dbContext);

        var publicId = await service.ConsumeAsync(
            actorId,
            UploadOwnerType.BOOK_COPY_IMAGE,
            CreateUploadResult(intent));

        Assert.Equal(intent.PublicImageId, publicId);
        Assert.Equal(UploadIntentStatus.COMPLETED, intent.Status);
        Assert.Equal("asset-123", intent.AssetId);
        Assert.Equal("webp", intent.Format);
        Assert.Equal(12_345, intent.Bytes);
        Assert.NotNull(intent.CompletedAt);
        Assert.Equal(EntityState.Modified, dbContext.Entry(intent).State);

        await dbContext.SaveChangesAsync();

        await Assert.ThrowsAsync<ConflictException>(() => service.ConsumeAsync(
            actorId,
            UploadOwnerType.BOOK_COPY_IMAGE,
            CreateUploadResult(intent)));
    }

    private static AppDbContext CreateDbContext()
        => new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options);

    private static UploadIntentService CreateService(AppDbContext dbContext, bool verifiesResponse = true)
        => new(dbContext, new FakeCloudinaryService(verifiesResponse), new AuditLogService(dbContext));

    private static UploadIntentModel AddPendingIntent(
        AppDbContext dbContext,
        UploadOwnerType ownerType,
        Guid actorId)
    {
        var intent = new UploadIntentModel
        {
            Id = Guid.NewGuid(),
            OwnerType = ownerType,
            PublicImageId = $"cloud-bookstore/public/test/{Guid.NewGuid():N}",
            CreatedBy = actorId
        };
        dbContext.UploadIntents.Add(intent);
        return intent;
    }

    private static CloudinaryUploadResultRequest CreateUploadResult(UploadIntentModel intent)
        => new(
            intent.Id,
            intent.PublicImageId,
            1_735_689_100,
            "cloudinary-response-signature",
            "asset-123",
            "webp",
            12_345);

    private sealed class FakeCloudinaryService(bool verifiesResponse) : ICloudinaryService
    {
        public CloudinaryUploadPolicy GetPolicy(UploadOwnerType ownerType)
            => new("upload", "test-preset", "public/test");

        public CloudinaryUploadSignature CreateUploadSignature(UploadOwnerType ownerType, Guid intentId)
            => new(
                "test-api-key",
                "https://api.cloudinary.com/v1_1/test/image/upload",
                $"cloud-bookstore/public/test/{intentId:N}",
                "cloud-bookstore/public/test",
                "test-preset",
                "upload",
                false,
                1_735_689_100,
                "upload-signature");

        public bool VerifyUploadResponse(string publicImageId, long version, string responseSignature)
            => verifiesResponse;

        public string BuildImageUrl(string publicImageId, UploadOwnerType ownerType)
            => $"https://res.cloudinary.com/test/image/upload/{publicImageId}";

        public Task DestroyAsync(
            string publicImageId,
            UploadOwnerType ownerType,
            CancellationToken cancellationToken = default)
            => Task.CompletedTask;
    }
}
