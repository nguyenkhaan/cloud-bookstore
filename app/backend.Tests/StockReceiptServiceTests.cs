using System.Net;
using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.StockReceiptDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace backend.Tests;

public class StockReceiptServiceTests
{
    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"stock-receipt-tests-{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(options);
    }

    private static (StockReceiptService Service, Guid EmployeeId, Guid SupplierId, Guid EditionId) SeedFixture(AppDbContext dbContext)
    {
        var roleId = Guid.NewGuid();
        var employeeId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var titleId = Guid.NewGuid();
        var editionId = Guid.NewGuid();

        dbContext.Roles.Add(new RoleModel { Id = roleId, RoleName = RoleName.ADMIN, IsActive = true });
        dbContext.Employees.Add(new EmployeeModel
        {
            Id = employeeId,
            Email = "admin@cloud.io",
            FullName = "Admin Test",
            Password = "hash",
            Phone = "0900000001",
            RoleId = roleId,
            Status = EmployeeStatus.ACTIVE
        });
        dbContext.Suppliers.Add(new SupplierModel
        {
            Id = supplierId,
            Name = "NXB Kim Đồng",
            Phone = "02839305247",
            TaxCode = "0100108240",
            IsActive = true
        });
        dbContext.Titles.Add(new TitleModel
        {
            Id = titleId,
            Name = "Doraemon - Tập 01",
            VolumeLabel = "Tập 01",
            IsActive = true
        });
        dbContext.Editions.Add(new EditionModel
        {
            Id = editionId,
            TitleId = titleId,
            Isbn = "9786042223121",
            Publisher = "NXB Kim Đồng",
            PublishYear = 2024,
            CoverPrice = 40000,
            IsActive = true
        });
        dbContext.SaveChanges();

        var auditLogService = new AuditLogService(dbContext);
        var service = new StockReceiptService(dbContext, auditLogService);
        return (service, employeeId, supplierId, editionId);
    }

    [Fact]
    public async Task CreateAndCompleteStockReceipt_GeneratesBookCopiesAndBarcodes()
    {
        await using var dbContext = CreateDbContext();
        var (service, employeeId, supplierId, editionId) = SeedFixture(dbContext);
        var auditCtx = new AuditLogContext(employeeId, IPAddress.Loopback);

        var draft = await service.CreateStockReceiptAsync(
            new CreateStockReceiptRequest(
                supplierId,
                "Hóa đơn KD-1026-882",
                [
                    new CreateStockReceiptLineRequest(
                        editionId,
                        Quantity: 5,
                        UnitCost: 25000,
                        ConditionGrade: ConditionGrade.A,
                        Availability: BookChannelAvailability.BOTH)
                ]),
            auditCtx);

        Assert.Equal(ApprovalStatus.DRAFT, draft.Status);
        Assert.Equal(125000L, draft.TotalAmount);
        Assert.Equal(5, draft.TotalCopies);
        Assert.Equal(0, draft.GeneratedCopyCount);

        var completed = await service.CompleteStockReceiptAsync(
            draft.Id,
            new CompleteStockReceiptRequest(
                ActivateImmediately: true,
                Note: "Hoàn tất nhập kho",
                Lines:
                [
                    new CompleteStockReceiptLinePricingRequest(
                        LineId: draft.Lines[0].Id,
                        SellingPrice: 36000,
                        RentalRate: 2500,
                        Availability: BookChannelAvailability.BOTH)
                ]),
            auditCtx);

        Assert.Equal(ApprovalStatus.COMPLETED, completed.Status);
        Assert.Equal(5, completed.GeneratedCopyCount);
        Assert.Single(completed.Lines);
        Assert.Equal(5, completed.Lines[0].Barcodes.Count);
        Assert.Equal(BookCopyStatus.AVAILABLE, completed.Lines[0].CopyStatus);
        Assert.Equal(36000L, completed.Lines[0].SellingPrice);
    }

    [Fact]
    public async Task CreateStockReceipt_WithEmptyLines_ThrowsBadRequestException()
    {
        await using var dbContext = CreateDbContext();
        var (service, employeeId, supplierId, _) = SeedFixture(dbContext);
        var auditCtx = new AuditLogContext(employeeId, IPAddress.Loopback);

        await Assert.ThrowsAsync<BadRequestException>(() =>
            service.CreateStockReceiptAsync(
                new CreateStockReceiptRequest(supplierId, "Phiếu rỗng", []),
                auditCtx));
    }
}
