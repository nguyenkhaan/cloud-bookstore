using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.BookSeriesDto;
using backend.src.Dto.TitleDto;
using backend.src.Dto.UploadDto;
using backend.src.Exceptions;
using backend.src.Infrastructure;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Xunit;

namespace backend.Tests.Services;

public sealed class BookHierarchyImageServiceTests
{
    private const string UrlPrefix = "https://res.cloudinary.com/test/image/upload/";

    [Fact]
    public async Task CreateBookSeries_consumes_verified_image_intent()
    {
        var databaseName = NewDatabaseName();
        var actorId = Guid.NewGuid();
        await using var dbContext = CreateDbContext(databaseName);
        var intent = AddPendingIntent(dbContext, UploadOwnerType.BOOK_SERIES_IMAGE, actorId);
        await dbContext.SaveChangesAsync();
        var cloudinary = new FakeCloudinaryService();
        var service = CreateBookSeriesService(dbContext, cloudinary, new RecordingLogger<BookSeriesService>());

        var response = await service.CreateBookSeriesAsync(
            new CreateBookSeriesRequest("Series", ImageUpload: CreateUploadResult(intent)),
            new AuditLogContext(actorId, null));

        await using var verifyContext = CreateDbContext(databaseName);
        var series = await verifyContext.BookSeries.SingleAsync();
        var storedIntent = await verifyContext.UploadIntents.SingleAsync();
        Assert.Equal(intent.PublicImageId, series.PublicImageId);
        Assert.Equal(UploadIntentStatus.COMPLETED, storedIntent.Status);
        Assert.Equal(UrlPrefix + intent.PublicImageId, response.ImageUrl);
        var audit = await verifyContext.AuditLogs.SingleAsync();
        Assert.Equal("ATTACH_IMAGE", audit.Action);
        Assert.Equal(series.Id, audit.EntityId);
        Assert.Contains(intent.Id.ToString(), audit.AfterData);
        Assert.Empty(cloudinary.DestroyedIds);
    }

    [Fact]
    public async Task CreateBookSeries_leaves_intent_pending_when_it_belongs_to_another_actor()
    {
        var databaseName = NewDatabaseName();
        await using var dbContext = CreateDbContext(databaseName);
        var intent = AddPendingIntent(dbContext, UploadOwnerType.BOOK_SERIES_IMAGE, Guid.NewGuid());
        await dbContext.SaveChangesAsync();
        var service = CreateBookSeriesService(dbContext, new FakeCloudinaryService(), new RecordingLogger<BookSeriesService>());

        await Assert.ThrowsAsync<ForbiddenException>(() => service.CreateBookSeriesAsync(
            new CreateBookSeriesRequest("Series", ImageUpload: CreateUploadResult(intent)),
            new AuditLogContext(Guid.NewGuid(), null)));

        await using var verifyContext = CreateDbContext(databaseName);
        Assert.Empty(verifyContext.BookSeries);
        Assert.Equal(UploadIntentStatus.PENDING, (await verifyContext.UploadIntents.SingleAsync()).Status);
    }

    [Fact]
    public async Task GetTitles_returns_resolved_image_urls_without_public_ids()
    {
        await using var dbContext = CreateDbContext(NewDatabaseName());
        dbContext.Titles.AddRange(
            new TitleModel { Name = "A title", PublicImageId = "cloud-bookstore/public/titles/abc" },
            new TitleModel { Name = "B title" });
        await dbContext.SaveChangesAsync();
        var service = CreateTitleService(dbContext, new FakeCloudinaryService(), new RecordingLogger<TitleService>());

        var result = await service.GetTitlesAsync(new TitleQuery());

        Assert.Equal(UrlPrefix + "cloud-bookstore/public/titles/abc", result.Items[0].ImageUrl);
        Assert.Null(result.Items[1].ImageUrl);
        Assert.Null(typeof(TitleResponse).GetProperty("PublicImageId"));
        Assert.Null(typeof(TitleDetailResponse).GetProperty("PublicImageId"));
        Assert.Null(typeof(BookSeriesResponse).GetProperty("PublicImageId"));
        Assert.Null(typeof(BookSeriesDetailResponse).GetProperty("PublicImageId"));
        Assert.Null(typeof(BookSeriesTitleSummary).GetProperty("PublicImageId"));
    }

    [Fact]
    public async Task ReplaceImage_keeps_new_reference_when_destroy_fails()
    {
        var databaseName = NewDatabaseName();
        var actorId = Guid.NewGuid();
        const string oldImageId = "cloud-bookstore/public/titles/old";
        await using var dbContext = CreateDbContext(databaseName);
        var title = new TitleModel { Name = "Title", PublicImageId = oldImageId };
        dbContext.Titles.Add(title);
        var intent = AddPendingIntent(dbContext, UploadOwnerType.TITLE_IMAGE, actorId);
        await dbContext.SaveChangesAsync();
        var cloudinary = new FakeCloudinaryService { FailDestroy = true };
        var logger = new RecordingLogger<TitleService>();
        var service = CreateTitleService(dbContext, cloudinary, logger);

        var response = await service.UpdateTitleImageAsync(
            title.Id,
            CreateUploadResult(intent),
            new AuditLogContext(actorId, null));

        await using var verifyContext = CreateDbContext(databaseName);
        Assert.Equal(intent.PublicImageId, (await verifyContext.Titles.SingleAsync()).PublicImageId);
        Assert.Equal(UploadIntentStatus.COMPLETED, (await verifyContext.UploadIntents.SingleAsync()).Status);
        Assert.Equal("REPLACE_IMAGE", (await verifyContext.AuditLogs.SingleAsync()).Action);
        Assert.Equal(UrlPrefix + intent.PublicImageId, response.ImageUrl);
        Assert.Equal([(oldImageId, UploadOwnerType.TITLE_IMAGE)], cloudinary.DestroyedIds);
        Assert.Contains(logger.Entries, entry => entry.Level == LogLevel.Warning && entry.Message.Contains(oldImageId));
    }

    [Fact]
    public async Task DeleteBookSeries_destroys_public_asset_after_database_commit()
    {
        var databaseName = NewDatabaseName();
        const string imageId = "cloud-bookstore/public/book-series/old";
        await using var dbContext = CreateDbContext(databaseName);
        var series = new BookSeriesModel { Name = "Series", PublicImageId = imageId };
        dbContext.BookSeries.Add(series);
        await dbContext.SaveChangesAsync();
        var cloudinary = new FakeCloudinaryService();
        cloudinary.OnDestroy = () =>
        {
            using var observer = CreateDbContext(databaseName);
            Assert.Empty(observer.BookSeries);
        };
        var service = CreateBookSeriesService(dbContext, cloudinary, new RecordingLogger<BookSeriesService>());

        await service.DeleteBookSeriesAsync(series.Id, new AuditLogContext(Guid.NewGuid(), null));

        Assert.Equal([(imageId, UploadOwnerType.BOOK_SERIES_IMAGE)], cloudinary.DestroyedIds);
        await using var verifyContext = CreateDbContext(databaseName);
        Assert.Equal("DELETE_IMAGE", (await verifyContext.AuditLogs.SingleAsync()).Action);
    }

    private static string NewDatabaseName() => Guid.NewGuid().ToString("N");

    private static AppDbContext CreateDbContext(string databaseName)
        => new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options);

    private static BookSeriesService CreateBookSeriesService(
        AppDbContext dbContext,
        FakeCloudinaryService cloudinary,
        ILogger<BookSeriesService> logger)
    {
        var auditLogService = new AuditLogService(dbContext);
        return new BookSeriesService(
            dbContext,
            new UploadIntentService(dbContext, cloudinary, auditLogService),
            cloudinary,
            auditLogService,
            logger);
    }

    private static TitleService CreateTitleService(
        AppDbContext dbContext,
        FakeCloudinaryService cloudinary,
        ILogger<TitleService> logger)
    {
        var auditLogService = new AuditLogService(dbContext);
        return new TitleService(
            dbContext,
            new UploadIntentService(dbContext, cloudinary, auditLogService),
            cloudinary,
            auditLogService,
            logger);
    }

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
        => new(intent.Id, intent.PublicImageId, 1_735_689_100, "response-signature", "asset-1", "webp", 1_024);

    private sealed class FakeCloudinaryService : ICloudinaryService
    {
        public bool FailDestroy { get; init; }
        public Action? OnDestroy { get; set; }
        public List<(string PublicImageId, UploadOwnerType OwnerType)> DestroyedIds { get; } = [];

        public CloudinaryUploadPolicy GetPolicy(UploadOwnerType ownerType)
            => new("upload", "test-preset", "public/test");

        public CloudinaryUploadSignature CreateUploadSignature(UploadOwnerType ownerType, Guid intentId)
            => throw new NotSupportedException();

        public bool VerifyUploadResponse(string publicImageId, long version, string responseSignature) => true;

        public string BuildImageUrl(string publicImageId, UploadOwnerType ownerType) => UrlPrefix + publicImageId;

        public Task DestroyAsync(string publicImageId, UploadOwnerType ownerType, CancellationToken cancellationToken = default)
        {
            DestroyedIds.Add((publicImageId, ownerType));
            OnDestroy?.Invoke();
            return FailDestroy
                ? Task.FromException(new InvalidOperationException("Cloudinary unavailable."))
                : Task.CompletedTask;
        }
    }

    private sealed class RecordingLogger<T> : ILogger<T>
    {
        public List<(LogLevel Level, string Message)> Entries { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
            => Entries.Add((logLevel, formatter(state, exception)));
    }
}
