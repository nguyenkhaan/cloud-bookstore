using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.SupplierDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace backend.Tests;

public class SupplierServiceTests
{
    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"suppliers-tests-{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task CreateSupplierAsync_ValidInput_PersistsSupplierAndAuditLog()
    {
        await using var dbContext = CreateDbContext();
        var auditService = new AuditLogService(dbContext);
        var service = new SupplierService(dbContext, auditService);
        var actorId = Guid.NewGuid();

        var created = await service.CreateSupplierAsync(
            new CreateSupplierRequest(
                Name: "NXB Kim Đồng",
                Phone: "02839305247",
                Address: "248 Cống Quỳnh, Quận 1, TP.HCM",
                TaxCode: "0100108240",
                IsActive: true),
            new AuditLogContext(actorId, null));

        Assert.NotEqual(Guid.Empty, created.Id);
        Assert.Equal("NXB Kim Đồng", created.Name);
        Assert.Equal("0100108240", created.TaxCode);
        Assert.StartsWith("NCC-", created.Code);

        var audit = await dbContext.AuditLogs.SingleAsync();
        Assert.Equal("SUPPLIER_CREATE", audit.Action);
        Assert.Equal(created.Id, audit.EntityId);
    }

    [Fact]
    public async Task CreateSupplierAsync_DuplicateNameOrTaxCode_ThrowsConflictException()
    {
        await using var dbContext = CreateDbContext();
        var service = new SupplierService(dbContext, new AuditLogService(dbContext));
        var context = new AuditLogContext(Guid.NewGuid(), null);

        await service.CreateSupplierAsync(
            new CreateSupplierRequest("NXB Trẻ", "02839316289", "TP.HCM", "0300527159"),
            context);

        await Assert.ThrowsAsync<ConflictException>(() =>
            service.CreateSupplierAsync(
                new CreateSupplierRequest("nxb trẻ", "0909123456", "TP.HCM", "9999999999"),
                context));

        await Assert.ThrowsAsync<ConflictException>(() =>
            service.CreateSupplierAsync(
                new CreateSupplierRequest("Đối tác mới", "0909123456", "TP.HCM", "0300527159"),
                context));
    }

    [Fact]
    public async Task GetSuppliersAndStatsAsync_AggregatesStockReceiptTotalsAccurately()
    {
        await using var dbContext = CreateDbContext();
        var service = new SupplierService(dbContext, new AuditLogService(dbContext));
        var context = new AuditLogContext(Guid.NewGuid(), null);

        var s1 = await service.CreateSupplierAsync(
            new CreateSupplierRequest("NXB Kim Đồng", "02839305247", "Q1", "0100108240", true),
            context);
        var s2 = await service.CreateSupplierAsync(
            new CreateSupplierRequest("Sách Nhã Nam", "0903889122", "PN", "0101601450", false),
            context);

        dbContext.StockReceipts.AddRange(
            new StockReceiptModel
            {
                Id = Guid.NewGuid(),
                Code = "INB-001",
                SourceType = StockReceiptSourceType.SUPPLIER,
                SupplierId = s1.Id,
                Status = ApprovalStatus.COMPLETED,
                TotalAmount = 16_000_000,
                CreatedBy = Guid.NewGuid()
            },
            new StockReceiptModel
            {
                Id = Guid.NewGuid(),
                Code = "INB-002",
                SourceType = StockReceiptSourceType.SUPPLIER,
                SupplierId = s1.Id,
                Status = ApprovalStatus.PENDING_APPROVAL,
                TotalAmount = 3_000_000,
                CreatedBy = Guid.NewGuid()
            });
        await dbContext.SaveChangesAsync();

        var stats = await service.GetStatsAsync();
        Assert.Equal(1, stats.ActiveCount);
        Assert.Equal(1, stats.InactiveCount);
        Assert.Equal(2, stats.TotalCount);
        Assert.Equal(16_000_000, stats.TotalImportAmount);
        Assert.Equal(3_000_000, stats.TotalPendingAmount);
        Assert.Equal(1, stats.PendingReceiptCount);

        var detail = await service.GetSupplierByIdAsync(s1.Id);
        Assert.Equal(2, detail.ReceiptCount);
        Assert.Equal(16_000_000, detail.TotalImportAmount);
        Assert.Equal(3_000_000, detail.PendingAmount);
    }

    [Fact]
    public async Task DeleteSupplierAsync_WithReferencedReceipts_ThrowsConflictException()
    {
        await using var dbContext = CreateDbContext();
        var service = new SupplierService(dbContext, new AuditLogService(dbContext));
        var context = new AuditLogContext(Guid.NewGuid(), null);

        var supplier = await service.CreateSupplierAsync(
            new CreateSupplierRequest("Phân phối Minh Long", "0908212333", "Q1", "0102643512"),
            context);

        dbContext.StockReceipts.Add(new StockReceiptModel
        {
            Id = Guid.NewGuid(),
            Code = "INB-010",
            SourceType = StockReceiptSourceType.SUPPLIER,
            SupplierId = supplier.Id,
            Status = ApprovalStatus.DRAFT,
            TotalAmount = 5_000_000,
            CreatedBy = Guid.NewGuid()
        });
        await dbContext.SaveChangesAsync();

        await Assert.ThrowsAsync<ConflictException>(() =>
            service.DeleteSupplierAsync(supplier.Id, context));
    }
}
