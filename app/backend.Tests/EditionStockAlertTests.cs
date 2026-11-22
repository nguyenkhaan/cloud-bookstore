using System.Net;
using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.EditionDto;
using backend.src.Exceptions;
using backend.src.Helpers;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace backend.Tests;

public class EditionStockAlertTests
{
    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"edition-stock-alert-tests-{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task GetStockAlertsAsync_CountsDualChannelAvailabilityAndUpdatesThresholds()
    {
        await using var dbContext = CreateDbContext();
        var auditService = new AuditLogService(dbContext);
        var titleId = Guid.NewGuid();
        var editionId = Guid.NewGuid();
        var receiptLineId = Guid.NewGuid();

        dbContext.Titles.Add(new TitleModel
        {
            Id = titleId,
            Name = "Conan",
            VolumeLabel = "Tập 10",
            IsActive = true
        });
        dbContext.Editions.Add(new EditionModel
        {
            Id = editionId,
            TitleId = titleId,
            Isbn = "9786042093595",
            Publisher = "NXB Kim Đồng",
            PublishYear = 2024,
            CoverPrice = 45000,
            MinStockSale = 2,
            MinStockRental = 3,
            IsActive = true
        });
        dbContext.BookCopies.AddRange(
            new BookCopyModel
            {
                Id = Guid.NewGuid(),
                CopyBarcode = "BC00000001",
                EditionId = editionId,
                ReceiptLineId = receiptLineId,
                Availability = BookChannelAvailability.BOTH,
                Status = BookCopyStatus.AVAILABLE,
                ConditionGrade = ConditionGrade.A
            },
            new BookCopyModel
            {
                Id = Guid.NewGuid(),
                CopyBarcode = "BC00000002",
                EditionId = editionId,
                ReceiptLineId = receiptLineId,
                Availability = BookChannelAvailability.SALE_ONLY,
                Status = BookCopyStatus.AVAILABLE,
                ConditionGrade = ConditionGrade.A
            },
            new BookCopyModel
            {
                Id = Guid.NewGuid(),
                CopyBarcode = "BC00000003",
                EditionId = editionId,
                ReceiptLineId = receiptLineId,
                Availability = BookChannelAvailability.BOTH,
                Status = BookCopyStatus.RENTED,
                ConditionGrade = ConditionGrade.A
            });
        await dbContext.SaveChangesAsync();

        var dashboard = await EditionStockAlertHelper.GetStockAlertsAsync(
            dbContext,
            new EditionStockAlertQuery());

        Assert.Single(dashboard.Items);
        var item = dashboard.Items[0];
        Assert.Equal(2, item.AvailableSale);
        Assert.Equal(1, item.AvailableRental);
        Assert.Equal(1, item.RentedCount);
        Assert.True(item.IsRentalLow);

        var updated = await EditionStockAlertHelper.UpdateThresholdsAsync(
            dbContext,
            auditService,
            editionId,
            new UpdateEditionThresholdsRequest(MinStockSale: 5, MinStockRental: 4),
            new AuditLogContext(Guid.NewGuid(), IPAddress.Loopback));

        Assert.Equal(5, updated.MinStockSale);
        Assert.Equal(4, updated.MinStockRental);
        Assert.True(updated.IsSaleLow);

        await Assert.ThrowsAsync<BadRequestException>(() =>
            EditionStockAlertHelper.UpdateThresholdsAsync(
                dbContext,
                auditService,
                editionId,
                new UpdateEditionThresholdsRequest(MinStockSale: -1, MinStockRental: 2),
                new AuditLogContext(Guid.NewGuid(), IPAddress.Loopback)));
    }
}
