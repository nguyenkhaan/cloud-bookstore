using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.BookCopyDto;
using backend.src.Dto.EditionDto;
using backend.src.Dto.UploadDto;
using backend.src.Exceptions;
using backend.src.Infrastructure;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace backend.Tests.Services;

public sealed class EditionAndCopyImageServiceTests
{
    private const string UrlPrefix = "https://res.cloudinary.com/test/image/upload/";

    [Fact]
    public async Task CreateEdition_consumes_edition_image_intent()
    {
        var databaseName = NewDatabaseName();
        var actorId = Guid.NewGuid();
        await using var dbContext = CreateDbContext(databaseName);
        var title = new TitleModel { Name = "Title" };
        dbContext.Titles.Add(title);
        dbContext.Employees.Add(NewEmployee(actorId));
        var intent = AddPendingIntent(dbContext, UploadOwnerType.EDITION_IMAGE, actorId);
        await dbContext.SaveChangesAsync();
        var cloudinary = new FakeCloudinaryService();
        var service = CreateEditionService(dbContext, cloudinary);

        var response = await service.CreateEditionAsync(
            new CreateEditionRequest(title.Id, Isbn: "9780000000001", ImageUpload: CreateUploadResult(intent)),
            new AuditLogContext(actorId, null));

        await using var verifyContext = CreateDbContext(databaseName);
        var edition = await verifyContext.Editions.SingleAsync();
        Assert.Equal(intent.PublicImageId, edition.PublicImageId);
        Assert.Equal(UploadIntentStatus.COMPLETED, (await verifyContext.UploadIntents.SingleAsync()).Status);
        Assert.Equal(UrlPrefix + intent.PublicImageId, response.ImageUrl);
        var audit = await verifyContext.AuditLogs.SingleAsync();
        Assert.Equal("ATTACH_IMAGE", audit.Action);
        Assert.Equal(edition.Id, audit.EntityId);
    }

    [Fact]
    public async Task CreateEdition_rejects_intent_issued_for_another_owner_type()
    {
        var databaseName = NewDatabaseName();
        var actorId = Guid.NewGuid();
        await using var dbContext = CreateDbContext(databaseName);
        var title = new TitleModel { Name = "Title" };
        dbContext.Titles.Add(title);
        dbContext.Employees.Add(NewEmployee(actorId));
        var intent = AddPendingIntent(dbContext, UploadOwnerType.BOOK_COPY_IMAGE, actorId);
        await dbContext.SaveChangesAsync();
        var service = CreateEditionService(dbContext, new FakeCloudinaryService());

        await Assert.ThrowsAsync<BadRequestException>(() => service.CreateEditionAsync(
            new CreateEditionRequest(title.Id, ImageUpload: CreateUploadResult(intent)),
            new AuditLogContext(actorId, null)));

        await using var verifyContext = CreateDbContext(databaseName);
        Assert.Empty(verifyContext.Editions);
        Assert.Equal(UploadIntentStatus.PENDING, (await verifyContext.UploadIntents.SingleAsync()).Status);
    }

    [Fact]
    public async Task UpdateEdition_without_image_upload_keeps_existing_image()
    {
        var databaseName = NewDatabaseName();
        const string imageId = "cloud-bookstore/public/editions/existing";
        await using var dbContext = CreateDbContext(databaseName);
        var title = new TitleModel { Name = "Title" };
        var edition = new EditionModel { TitleId = title.Id, PublicImageId = imageId };
        dbContext.Titles.Add(title);
        dbContext.Editions.Add(edition);
        await dbContext.SaveChangesAsync();
        var cloudinary = new FakeCloudinaryService();
        var service = CreateEditionService(dbContext, cloudinary);

        var response = await service.UpdateEditionAsync(
            edition.Id,
            new UpdateEditionRequest(Publisher: "Publisher"),
            new AuditLogContext(null, null));

        await using var verifyContext = CreateDbContext(databaseName);
        Assert.Equal(imageId, (await verifyContext.Editions.SingleAsync()).PublicImageId);
        Assert.Equal(UrlPrefix + imageId, response.ImageUrl);
        Assert.Empty(cloudinary.DestroyedIds);
    }

    [Fact]
    public async Task GetBookCopyDetail_resolves_copy_and_edition_image_urls()
    {
        await using var dbContext = CreateDbContext(NewDatabaseName());
        var copy = SeedBookCopy(
            dbContext,
            editionImageId: "cloud-bookstore/public/editions/e1",
            copyImageId: "cloud-bookstore/public/book-copies/c1");
        await dbContext.SaveChangesAsync();
        var service = CreateBookCopyService(dbContext, new FakeCloudinaryService());

        var detail = await service.GetBookCopyByIdAsync(copy.Id, canViewCost: false);
        var list = await service.GetBookCopiesAsync(new BookCopyQuery());

        Assert.Equal(UrlPrefix + "cloud-bookstore/public/book-copies/c1", detail.ImageUrl);
        Assert.Equal(UrlPrefix + "cloud-bookstore/public/editions/e1", detail.EditionImageUrl);
        Assert.Equal(UrlPrefix + "cloud-bookstore/public/book-copies/c1", Assert.Single(list.Items).ImageUrl);
        Assert.Null(typeof(BookCopyDetailResponse).GetProperty("PublicImageId"));
        Assert.Null(typeof(BookCopyDetailResponse).GetProperty("CoverImageUrl"));
        Assert.Null(typeof(EditionResponse).GetProperty("CoverImageUrl"));
        Assert.Null(typeof(EditionDetailResponse).GetProperty("CoverImageUrl"));
    }

    [Fact]
    public async Task DeleteBookCopy_removes_public_asset_after_database_commit()
    {
        var databaseName = NewDatabaseName();
        const string imageId = "cloud-bookstore/public/book-copies/old";
        await using var dbContext = CreateDbContext(databaseName);
        var copy = SeedBookCopy(dbContext, editionImageId: null, copyImageId: imageId);
        await dbContext.SaveChangesAsync();
        var cloudinary = new FakeCloudinaryService
        {
            OnDestroy = () =>
            {
                using var observer = CreateDbContext(databaseName);
                Assert.Null(observer.BookCopies.Single().PublicImageId);
            }
        };
        var service = CreateBookCopyService(dbContext, cloudinary);

        await service.DeleteBookCopyImageAsync(copy.Id, new AuditLogContext(Guid.NewGuid(), null));

        Assert.Equal([(imageId, UploadOwnerType.BOOK_COPY_IMAGE)], cloudinary.DestroyedIds);
        await using var verifyContext = CreateDbContext(databaseName);
        Assert.Equal("DELETE_IMAGE", (await verifyContext.AuditLogs.SingleAsync()).Action);
    }

    [Theory]
    [InlineData(BookCopyStatus.RENTED)]
    [InlineData(BookCopyStatus.SOLD)]
    public async Task UpdateBookCopyImage_is_allowed_for_rented_or_sold_copy(BookCopyStatus status)
    {
        // Product decision: image routes intentionally skip EnsureEditable (unlike PUT /{id}).
        var databaseName = NewDatabaseName();
        var actorId = Guid.NewGuid();
        await using var dbContext = CreateDbContext(databaseName);
        var copy = SeedBookCopy(dbContext, editionImageId: null, copyImageId: null);
        copy.Status = status;
        var intent = AddPendingIntent(dbContext, UploadOwnerType.BOOK_COPY_IMAGE, actorId);
        await dbContext.SaveChangesAsync();
        var service = CreateBookCopyService(dbContext, new FakeCloudinaryService());

        var detail = await service.UpdateBookCopyImageAsync(copy.Id, CreateUploadResult(intent), new AuditLogContext(actorId, null));

        Assert.Equal(UrlPrefix + intent.PublicImageId, detail.ImageUrl);
        await using var verifyContext = CreateDbContext(databaseName);
        Assert.Equal(intent.PublicImageId, (await verifyContext.BookCopies.SingleAsync()).PublicImageId);
        Assert.Equal("ATTACH_IMAGE", (await verifyContext.AuditLogs.SingleAsync()).Action);
    }

    [Fact]
    public async Task DeleteBookCopy_removes_unreferenced_copy_and_its_image()
    {
        var databaseName = NewDatabaseName();
        await using var dbContext = CreateDbContext(databaseName);
        var copy = SeedBookCopy(dbContext, null, "cloud-bookstore/public/book-copies/to-delete");
        await dbContext.SaveChangesAsync();
        var cloudinary = new FakeCloudinaryService();

        await CreateBookCopyService(dbContext, cloudinary).DeleteBookCopyAsync(copy.Id, new AuditLogContext(null, null));

        await using var verify = CreateDbContext(databaseName);
        Assert.Empty(verify.BookCopies);
        Assert.Equal("BOOK_COPY_DELETE", (await verify.AuditLogs.SingleAsync()).Action);
        Assert.Single(cloudinary.DestroyedIds);
    }

    [Fact]
    public async Task DeleteBookCopy_rejects_historical_rental()
    {
        await using var dbContext = CreateDbContext(NewDatabaseName());
        var copy = SeedBookCopy(dbContext, null, null);
        dbContext.RentalLines.Add(new RentalLineModel { CopyId = copy.Id, Status = RentalLineStatus.RETURNED });
        await dbContext.SaveChangesAsync();

        await Assert.ThrowsAsync<ConflictException>(() =>
            CreateBookCopyService(dbContext, new FakeCloudinaryService()).DeleteBookCopyAsync(copy.Id, new AuditLogContext(null, null)));
        Assert.Single(dbContext.BookCopies);
    }

    [Fact]
    public async Task Rented_copy_allows_note_change_but_rejects_price_change()
    {
        await using var dbContext = CreateDbContext(NewDatabaseName());
        var copy = SeedBookCopy(dbContext, null, null);
        copy.Status = BookCopyStatus.RENTED;
        copy.SellingPrice = 50_000;
        await dbContext.SaveChangesAsync();
        var service = CreateBookCopyService(dbContext, new FakeCloudinaryService());

        await service.UpdateBookCopyAsync(copy.Id,
            new UpdateBookCopyRequest(copy.ConditionGrade, copy.Availability, "Kiểm tra bìa", "Bìa có vết xước", 50_000),
            new AuditLogContext(null, null));
        Assert.Equal("Bìa có vết xước", copy.ConditionNote);

        await Assert.ThrowsAsync<ConflictException>(() => service.UpdateBookCopyAsync(copy.Id,
            new UpdateBookCopyRequest(copy.ConditionGrade, copy.Availability, "Đổi giá", copy.ConditionNote, 60_000),
            new AuditLogContext(null, null)));
        Assert.Equal(50_000, copy.SellingPrice);
    }

    [Fact]
    public async Task Copy_in_active_sale_allows_note_but_rejects_price_change_and_delete()
    {
        await using var dbContext = CreateDbContext(NewDatabaseName());
        var copy = SeedBookCopy(dbContext, null, null);
        copy.SellingPrice = 50_000;
        dbContext.SaleInvoiceLines.Add(new SaleInvoiceLineModel { CopyId = copy.Id, Status = SaleInvoiceLineStatus.ACTIVE });
        await dbContext.SaveChangesAsync();
        var service = CreateBookCopyService(dbContext, new FakeCloudinaryService());

        await service.UpdateBookCopyAsync(copy.Id,
            new UpdateBookCopyRequest(copy.ConditionGrade, copy.Availability, "Ghi chú", "Bìa hơi cũ", 50_000),
            new AuditLogContext(null, null));
        Assert.Equal("Bìa hơi cũ", copy.ConditionNote);
        await Assert.ThrowsAsync<ConflictException>(() => service.UpdateBookCopyAsync(copy.Id,
            new UpdateBookCopyRequest(copy.ConditionGrade, copy.Availability, "Đổi giá", copy.ConditionNote, 60_000),
            new AuditLogContext(null, null)));
        await Assert.ThrowsAsync<ConflictException>(() => service.DeleteBookCopyAsync(copy.Id, new AuditLogContext(null, null)));
        Assert.Equal(50_000, copy.SellingPrice);
    }

    [Fact]
    public async Task Available_receipt_lines_only_include_remaining_quantity()
    {
        await using var dbContext = CreateDbContext(NewDatabaseName());
        var copy = SeedBookCopy(dbContext, null, null);
        await dbContext.SaveChangesAsync();
        var line = await dbContext.StockReceiptLines.SingleAsync();
        line.Quantity = 2;
        await dbContext.SaveChangesAsync();

        var options = await CreateBookCopyService(dbContext, new FakeCloudinaryService())
            .GetAvailableReceiptLinesAsync(copy.EditionId);

        Assert.Equal(1, Assert.Single(options).RemainingQuantity);
    }

    private static string NewDatabaseName() => Guid.NewGuid().ToString("N");

    private static AppDbContext CreateDbContext(string databaseName)
        => new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName)
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);

    private static EditionService CreateEditionService(AppDbContext dbContext, FakeCloudinaryService cloudinary)
    {
        var auditLogService = new AuditLogService(dbContext);
        return new EditionService(
            dbContext,
            new UploadIntentService(dbContext, cloudinary, auditLogService),
            cloudinary,
            auditLogService,
            NullLogger<EditionService>.Instance);
    }

    private static BookCopyService CreateBookCopyService(AppDbContext dbContext, FakeCloudinaryService cloudinary)
    {
        var auditLogService = new AuditLogService(dbContext);
        return new BookCopyService(
            dbContext,
            auditLogService,
            new UploadIntentService(dbContext, cloudinary, auditLogService),
            cloudinary,
            NullLogger<BookCopyService>.Instance);
    }

    private static BookCopyModel SeedBookCopy(AppDbContext dbContext, string? editionImageId, string? copyImageId)
    {
        var title = new TitleModel { Name = "Title" };
        var edition = new EditionModel { TitleId = title.Id, PublicImageId = editionImageId };
        var receipt = new StockReceiptModel { Code = "PN-0001", SourceType = StockReceiptSourceType.SUPPLIER };
        var line = new StockReceiptLineModel { ReceiptId = receipt.Id, EditionId = edition.Id };
        var copy = new BookCopyModel
        {
            CopyBarcode = "BC000001",
            EditionId = edition.Id,
            ReceiptLineId = line.Id,
            Status = BookCopyStatus.AVAILABLE,
            PublicImageId = copyImageId
        };
        dbContext.Titles.Add(title);
        dbContext.Editions.Add(edition);
        dbContext.StockReceipts.Add(receipt);
        dbContext.StockReceiptLines.Add(line);
        dbContext.BookCopies.Add(copy);
        return copy;
    }

    private static EmployeeModel NewEmployee(Guid id)
        => new()
        {
            Id = id,
            Email = "staff@example.com",
            FullName = "Staff",
            Password = "hash",
            Phone = "0900000000"
        };

    private static UploadIntentModel AddPendingIntent(AppDbContext dbContext, UploadOwnerType ownerType, Guid actorId)
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
        public Action? OnDestroy { get; init; }
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
            return Task.CompletedTask;
        }
    }
}
