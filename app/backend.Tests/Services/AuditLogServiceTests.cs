using System.Net;
using backend.src.Controllers;
using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.BookCopyDto;
using backend.src.Dto.UploadDto;
using backend.src.Exceptions;
using backend.src.Infrastructure;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace backend.Tests.Services;

public sealed class AuditLogServiceTests
{
    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"AuditLogTestDb_{Guid.NewGuid():N}")
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new AppDbContext(options);
    }

    private sealed class FakeCloudinaryService : ICloudinaryService
    {
        public CloudinaryUploadPolicy GetPolicy(UploadOwnerType ownerType)
            => throw new NotImplementedException();

        public CloudinaryUploadSignature CreateUploadSignature(UploadOwnerType ownerType, Guid intentId)
            => throw new NotImplementedException();

        public bool VerifyUploadResponse(string publicImageId, long version, string responseSignature)
            => true;

        public string BuildImageUrl(string publicImageId, UploadOwnerType ownerType)
            => $"https://img.test/{publicImageId}";

        public Task DestroyAsync(string publicImageId, UploadOwnerType ownerType, CancellationToken cancellationToken = default)
            => Task.CompletedTask;
    }

    [Fact]
    public async Task SearchPagedAsync_ResolvesActorsLabelsAndInventoryScope()
    {
        await using var db = CreateDbContext();

        var adminRole = new RoleModel { Id = Guid.NewGuid(), RoleName = RoleName.ADMIN };
        var admin = new EmployeeModel
        {
            Id = Guid.NewGuid(),
            FullName = "Nguyễn Minh Anh",
            Email = "minhanh@maybooks.vn",
            Password = "hash",
            Phone = "0901111111",
            RoleId = adminRole.Id,
            Role = adminRole,
            Status = EmployeeStatus.ACTIVE
        };

        var title = new TitleModel { Id = Guid.NewGuid(), Name = "Conan", VolumeLabel = "Tập 10" };
        var edition = new EditionModel { Id = Guid.NewGuid(), TitleId = title.Id, Publisher = "Kim Đồng" };
        var receipt = new StockReceiptModel { Id = Guid.NewGuid(), Code = "INB-001", SourceType = StockReceiptSourceType.SUPPLIER, Status = ApprovalStatus.COMPLETED, CreatedBy = admin.Id };
        var receiptLine = new StockReceiptLineModel { Id = Guid.NewGuid(), ReceiptId = receipt.Id, EditionId = edition.Id, Quantity = 1, UnitCost = 20000 };
        var copy = new BookCopyModel
        {
            Id = Guid.NewGuid(),
            CopyBarcode = "BC-1092",
            EditionId = edition.Id,
            ReceiptLineId = receiptLine.Id,
            Status = BookCopyStatus.AVAILABLE,
            ConditionGrade = ConditionGrade.A,
            SellingPrice = 80000
        };
        var saleInvoice = new SaleInvoiceModel
        {
            Id = Guid.NewGuid(),
            InvoiceNo = "POS-0101",
            CashSessionId = Guid.NewGuid(),
            Status = SaleInvoiceStatus.PAID,
            CreatedBy = admin.Id
        };

        db.AddRange(adminRole, admin, title, edition, receipt, receiptLine, copy, saleInvoice);

        var service = new AuditLogService(db);
        var context = new AuditLogContext(admin.Id, IPAddress.Parse("192.168.1.10"), "Chrome 129 / Windows", "req-102034-127");

        var log1 = await service.CreateAuditLogEntryAsync(new CreateAuditLogEntry(
            "BOOK_COPY_CREATE", "BookCopy", copy.Id, null, new { SellingPrice = 75000 }, "Nhập mới bản sách", context));
        var log2 = await service.CreateAuditLogEntryAsync(new CreateAuditLogEntry(
            "UPDATE_PRICE", "BookCopy", copy.Id, new { SellingPrice = 75000 }, new { SellingPrice = 80000 }, "Điều chỉnh giá niêm yết", context));
        var saleLog = await service.CreateAuditLogEntryAsync(new CreateAuditLogEntry(
            "VOID_ORDER", "sale_invoice", saleInvoice.Id, new { Status = "PAID" }, new { Status = "VOIDED" }, "Hoàn tiền theo yêu cầu", context));

        // Admin sees all 3 logs
        var adminPage = await service.SearchPagedAsync(new AuditLogQuery(Search: "Minh Anh", Page: 1, PageSize: 10), restrictToInventoryScope: false);
        Assert.Equal(3, adminPage.TotalCount);
        Assert.Contains(adminPage.Items, x => x.Id == log2.Id && x.EntityLabel == "BC-1092" && x.ActorName == "Nguyễn Minh Anh");
        Assert.Equal("Chrome 129 / Windows", adminPage.Items.First(x => x.Id == log2.Id).UserAgent);
        Assert.Equal("req-102034-127", adminPage.Items.First(x => x.Id == log2.Id).CorrelationId);

        // Inventory manager sees only inventory-scoped logs (2 BookCopy logs, not sale_invoice)
        var invPage = await service.SearchPagedAsync(new AuditLogQuery(Page: 1, PageSize: 10), restrictToInventoryScope: true);
        Assert.Equal(2, invPage.TotalCount);
        Assert.DoesNotContain(invPage.Items, x => x.EntityType == "sale_invoice");

        // Detail with related events
        var detail = await service.GetByIdWithRelatedAsync(log2.Id, restrictToInventoryScope: true);
        Assert.Equal(2, detail.RelatedEvents.Count);
        Assert.Equal(log1.Id, detail.RelatedEvents[0].Id);
        Assert.Equal(log2.Id, detail.RelatedEvents[1].Id);

        // Inventory manager cannot view non-inventory log detail
        await Assert.ThrowsAsync<ForbiddenException>(() =>
            service.GetByIdWithRelatedAsync(saleLog.Id, restrictToInventoryScope: true));

        // Metadata respects inventory scope
        var invMeta = await service.GetMetadataAsync(restrictToInventoryScope: true);
        Assert.Single(invMeta.EntityTypes);
        Assert.Equal("BookCopy", invMeta.EntityTypes[0]);
    }

    [Fact]
    public async Task UpdateShelfCodeAsync_UpdatesShelfAndWritesAuditLog()
    {
        await using var db = CreateDbContext();

        var title = new TitleModel { Id = Guid.NewGuid(), Name = "One Piece", VolumeLabel = "Tập 1" };
        var edition = new EditionModel { Id = Guid.NewGuid(), TitleId = title.Id };
        var receipt = new StockReceiptModel { Id = Guid.NewGuid(), Code = "INB-002", SourceType = StockReceiptSourceType.SUPPLIER, Status = ApprovalStatus.COMPLETED, CreatedBy = Guid.NewGuid() };
        var receiptLine = new StockReceiptLineModel { Id = Guid.NewGuid(), ReceiptId = receipt.Id, EditionId = edition.Id, Quantity = 1, UnitCost = 15000 };
        var copy = new BookCopyModel
        {
            Id = Guid.NewGuid(),
            CopyBarcode = "BC00000099",
            EditionId = edition.Id,
            ReceiptLineId = receiptLine.Id,
            Status = BookCopyStatus.AVAILABLE,
            ConditionGrade = ConditionGrade.A,
            SellingPrice = 45000,
            RentalRate = 3000,
            ShelfCode = "A1-01"
        };
        db.AddRange(title, edition, receipt, receiptLine, copy);
        await db.SaveChangesAsync();

        var auditService = new AuditLogService(db);
        var copyService = new BookCopyService(
            db,
            auditService,
            new UploadIntentService(db, new FakeCloudinaryService(), auditService),
            new FakeCloudinaryService(),
            NullLogger<BookCopyService>.Instance);

        var ctx = new AuditLogContext(Guid.NewGuid(), IPAddress.Loopback);
        var updated = await copyService.UpdateShelfCodeAsync(
            copy.Id,
            new UpdateBookCopyShelfRequest("B2-08", "Sắp xếp lại khu truyện tranh"),
            ctx);

        Assert.Equal("B2-08", updated.ShelfCode);

        var history = await copyService.GetBookCopyHistoryAsync(copy.Id, canViewCost: false);
        Assert.Contains(history, h => h.EventType == "BOOK_COPY_SHELF_UPDATE" && h.Reason == "Sắp xếp lại khu truyện tranh");
        var receiptItem = history.First(h => h.EventType == "RECEIPT_LINKED");
        Assert.Null(receiptItem.Metadata?.CostPrice);

        var historyWithCost = await copyService.GetBookCopyHistoryAsync(copy.Id, canViewCost: true);
        Assert.Equal(15000, historyWithCost.First(h => h.EventType == "RECEIPT_LINKED").Metadata?.CostPrice);
    }

    [Fact]
    public void AuditLogController_HasExpectedRoleAuthorization()
    {
        var controllerAuth = typeof(AuditLogController)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .Single();

        Assert.Contains(nameof(RoleName.ADMIN), controllerAuth.Roles);
        Assert.Contains(nameof(RoleName.INVENTORY_MANAGER), controllerAuth.Roles);
        Assert.DoesNotContain(nameof(RoleName.CASHIER), controllerAuth.Roles);
    }
}
