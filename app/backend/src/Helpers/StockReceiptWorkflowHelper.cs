using backend.src.Data;
using backend.src.Dto.StockReceiptDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Helpers;

public static class StockReceiptWorkflowHelper
{
    public static async Task<string> GenerateReceiptCodeAsync(
        AppDbContext dbContext,
        string prefix = "PN",
        CancellationToken cancellationToken = default)
    {
        var count = await dbContext.StockReceipts.CountAsync(cancellationToken);
        var nextNum = count + 1;

        while (true)
        {
            var candidate = $"{prefix}-{nextNum:D6}";
            var exists = await dbContext.StockReceipts
                .AnyAsync(r => r.Code == candidate, cancellationToken);
            if (!exists)
            {
                return candidate;
            }
            nextNum++;
        }
    }

    public static async Task<List<string>> NextBarcodesAsync(
        AppDbContext dbContext,
        int count,
        CancellationToken cancellationToken = default)
    {
        if (count <= 0)
        {
            return [];
        }

        if (!dbContext.Database.IsRelational())
        {
            var existingCount = await dbContext.BookCopies.CountAsync(cancellationToken);
            return Enumerable.Range(existingCount + 1, count)
                .Select(i => BookCopyValidator.FormatBarcode(i))
                .ToList();
        }

        var sql = $"SELECT nextval('{BookCopyValidator.BarcodeSequenceName}') AS \"Value\" FROM generate_series(1, {count})";
        var seqValues = await dbContext.Database
            .SqlQueryRaw<long>(sql)
            .ToListAsync(cancellationToken);

        return seqValues.Select(BookCopyValidator.FormatBarcode).ToList();
    }

    public static async Task<List<BookCopyModel>> PrepareAndGenerateCopiesAsync(
        AppDbContext dbContext,
        IReadOnlyList<StockReceiptLineModel> lines,
        IReadOnlyList<CompleteStockReceiptLinePricingRequest> pricingOverrides,
        bool activateImmediately,
        DateTime now,
        CancellationToken cancellationToken = default)
    {
        var editionIds = lines.Select(l => l.EditionId).Distinct().ToList();
        var editions = await dbContext.Editions.AsNoTracking()
            .Where(e => editionIds.Contains(e.Id))
            .ToDictionaryAsync(e => e.Id, cancellationToken);

        var lineIds = lines.Select(l => l.Id).ToList();
        var existingCopies = await dbContext.BookCopies
            .Where(c => lineIds.Contains(c.ReceiptLineId))
            .ToListAsync(cancellationToken);

        var existingByLine = existingCopies
            .GroupBy(c => c.ReceiptLineId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var copiesToGeneratePerLine = new List<(
            StockReceiptLineModel Line,
            int MissingCount,
            ResolvedReceiptLinePricing Pricing)>();

        foreach (var line in lines)
        {
            if (!editions.TryGetValue(line.EditionId, out var edition))
            {
                throw new NotFoundException($"Không tìm thấy ấn bản '{line.EditionId}'.");
            }

            var pricing = StockReceiptValidator.ResolveLinePricing(line, edition, pricingOverrides);
            line.Availability = pricing.Availability;

            var existingForLine = existingByLine.GetValueOrDefault(line.Id) ?? [];
            foreach (var existingCopy in existingForLine)
            {
                existingCopy.SellingPrice = pricing.SellingPrice;
                existingCopy.RentalRate = pricing.RentalRate;
                existingCopy.Availability = pricing.Availability;
                if (pricing.ShelfCode is not null)
                {
                    existingCopy.ShelfCode = pricing.ShelfCode;
                }
                if (activateImmediately && existingCopy.Status == BookCopyStatus.PENDING_RECEIPT)
                {
                    existingCopy.Status = BookCopyStatus.AVAILABLE;
                }
            }

            var missingCount = Math.Max(0, line.Quantity - existingForLine.Count);
            copiesToGeneratePerLine.Add((line, missingCount, pricing));
        }

        var totalMissingCopies = copiesToGeneratePerLine.Sum(x => x.MissingCount);
        var generatedBarcodes = await NextBarcodesAsync(dbContext, totalMissingCopies, cancellationToken);
        var barcodeCursor = 0;
        var targetStatus = activateImmediately
            ? BookCopyStatus.AVAILABLE
            : BookCopyStatus.PENDING_RECEIPT;

        var newCopies = new List<BookCopyModel>(totalMissingCopies);

        foreach (var item in copiesToGeneratePerLine)
        {
            for (var i = 0; i < item.MissingCount; i++)
            {
                newCopies.Add(new BookCopyModel
                {
                    Id = Guid.NewGuid(),
                    CopyBarcode = generatedBarcodes[barcodeCursor++],
                    EditionId = item.Line.EditionId,
                    ReceiptLineId = item.Line.Id,
                    Availability = item.Pricing.Availability,
                    Status = targetStatus,
                    ConditionGrade = item.Line.ConditionGrade,
                    ConditionNote = item.Line.ConditionNote,
                    CostPrice = item.Line.UnitCost,
                    SellingPrice = item.Pricing.SellingPrice,
                    RentalRate = item.Pricing.RentalRate,
                    ShelfCode = item.Pricing.ShelfCode,
                    CreatedAt = now
                });
            }
        }

        return newCopies;
    }

    public static int ApplyActivationAndPricingToCopies(
        IEnumerable<BookCopyModel> copies,
        IReadOnlyList<CompleteStockReceiptLinePricingRequest> pricingOverrides)
    {
        var activatedCount = 0;

        foreach (var copy in copies)
        {
            var lineOverride = pricingOverrides.FirstOrDefault(p =>
                (p.LineId.HasValue && p.LineId.Value == copy.ReceiptLineId) ||
                (!p.LineId.HasValue && p.EditionId.HasValue && p.EditionId.Value == copy.EditionId));

            if (lineOverride?.SellingPrice is > 0)
            {
                copy.SellingPrice = lineOverride.SellingPrice.Value;
            }

            if (lineOverride?.RentalRate is > 0)
            {
                copy.RentalRate = lineOverride.RentalRate.Value;
            }

            if (lineOverride?.Availability is not null)
            {
                copy.Availability = lineOverride.Availability.Value;
            }

            if (copy.SellingPrice is not > 0)
            {
                throw new BadRequestException(
                    $"Bản sách {copy.CopyBarcode} chưa có giá bán niêm yết hợp lệ (> 0).");
            }

            if (copy.Status == BookCopyStatus.PENDING_RECEIPT)
            {
                copy.Status = BookCopyStatus.AVAILABLE;
                activatedCount++;
            }
        }

        return activatedCount;
    }
}
