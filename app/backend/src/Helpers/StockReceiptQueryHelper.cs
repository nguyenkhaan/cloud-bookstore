using backend.src.Data;
using backend.src.Dto.Common;
using backend.src.Dto.StockReceiptDto;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Helpers;

public static class StockReceiptQueryHelper
{
    public static async Task<PagedResult<StockReceiptSummaryResponse>> GetPagedAsync(
        AppDbContext dbContext,
        StockReceiptQuery query,
        CancellationToken cancellationToken = default)
    {
        var sourceFilter = query.SourceType ?? StockReceiptSourceType.SUPPLIER;
        var baseQuery = dbContext.StockReceipts.AsNoTracking()
            .Where(r => r.SourceType == sourceFilter);

        if (query.SupplierId.HasValue)
        {
            baseQuery = baseQuery.Where(r => r.SupplierId == query.SupplierId.Value);
        }

        if (query.Status.HasValue)
        {
            baseQuery = baseQuery.Where(r => r.Status == query.Status.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            var matchingSupplierIds = await dbContext.Suppliers.AsNoTracking()
                .Where(s => s.Name.ToLower().Contains(term))
                .Select(s => s.Id)
                .ToListAsync(cancellationToken);

            baseQuery = baseQuery.Where(r =>
                r.Code.ToLower().Contains(term) ||
                (r.Note != null && r.Note.ToLower().Contains(term)) ||
                (r.SupplierId != null && matchingSupplierIds.Contains(r.SupplierId.Value)));
        }

        var totalCount = await baseQuery.CountAsync(cancellationToken);

        var receipts = await baseQuery
            .OrderByDescending(r => r.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        if (receipts.Count == 0)
        {
            return new PagedResult<StockReceiptSummaryResponse>([], totalCount, query.Page, query.PageSize);
        }

        var receiptIds = receipts.Select(r => r.Id).ToList();
        var supplierIds = receipts
            .Where(r => r.SupplierId.HasValue)
            .Select(r => r.SupplierId!.Value)
            .Distinct()
            .ToList();
        var creatorIds = receipts.Select(r => r.CreatedBy).Distinct().ToList();

        var suppliers = supplierIds.Count == 0
            ? new Dictionary<Guid, SupplierModel>()
            : await dbContext.Suppliers.AsNoTracking()
                .Where(s => supplierIds.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id, cancellationToken);

        var creators = creatorIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await dbContext.Employees.AsNoTracking()
                .Where(e => creatorIds.Contains(e.Id))
                .ToDictionaryAsync(e => e.Id, e => e.FullName, cancellationToken);

        var lineRows = await dbContext.StockReceiptLines.AsNoTracking()
            .Where(l => receiptIds.Contains(l.ReceiptId))
            .Select(l => new { l.Id, l.ReceiptId, l.Quantity })
            .ToListAsync(cancellationToken);

        var lineIds = lineRows.Select(l => l.Id).ToList();
        var copyCountsByLine = lineIds.Count == 0
            ? new Dictionary<Guid, int>()
            : await dbContext.BookCopies.AsNoTracking()
                .Where(c => lineIds.Contains(c.ReceiptLineId))
                .GroupBy(c => c.ReceiptLineId)
                .Select(g => new { LineId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.LineId, x => x.Count, cancellationToken);

        var linesByReceipt = lineRows
            .GroupBy(l => l.ReceiptId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var items = receipts.Select(r =>
        {
            suppliers.TryGetValue(r.SupplierId ?? Guid.Empty, out var supplier);
            creators.TryGetValue(r.CreatedBy, out var creatorName);
            var rLines = linesByReceipt.GetValueOrDefault(r.Id);
            var lineCount = rLines?.Count ?? 0;
            var totalCopies = rLines?.Sum(l => l.Quantity) ?? 0;
            var generatedCopies = rLines?.Sum(l => copyCountsByLine.GetValueOrDefault(l.Id)) ?? 0;

            return new StockReceiptSummaryResponse(
                r.Id,
                r.Code,
                r.SourceType,
                r.SupplierId,
                supplier is not null ? SupplierService.FormatSupplierCode(supplier.Id) : null,
                supplier?.Name,
                r.Status,
                r.TotalAmount,
                lineCount,
                totalCopies,
                generatedCopies,
                r.Note,
                r.CreatedBy,
                creatorName,
                r.CreatedAt,
                r.CompletedAt);
        }).ToList();

        return new PagedResult<StockReceiptSummaryResponse>(items, totalCount, query.Page, query.PageSize);
    }

    public static async Task<StockReceiptDetailResponse> BuildDetailResponseAsync(
        AppDbContext dbContext,
        StockReceiptModel receipt,
        CancellationToken cancellationToken = default)
    {
        SupplierModel? supplier = null;
        if (receipt.SupplierId.HasValue)
        {
            supplier = await dbContext.Suppliers.AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == receipt.SupplierId.Value, cancellationToken);
        }

        var creator = await dbContext.Employees.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == receipt.CreatedBy, cancellationToken);

        var lines = await dbContext.StockReceiptLines.AsNoTracking()
            .Where(l => l.ReceiptId == receipt.Id)
            .ToListAsync(cancellationToken);

        var editionIds = lines.Select(l => l.EditionId).Distinct().ToList();
        var editionRows = editionIds.Count == 0
            ? []
            : await (from e in dbContext.Editions.AsNoTracking()
                     where editionIds.Contains(e.Id)
                     join t in dbContext.Titles.AsNoTracking() on e.TitleId equals t.Id
                     select new { Edition = e, Title = t })
                .ToListAsync(cancellationToken);

        var editionsById = editionRows.ToDictionary(x => x.Edition.Id);

        var lineIds = lines.Select(l => l.Id).ToList();
        var copies = lineIds.Count == 0
            ? []
            : await dbContext.BookCopies.AsNoTracking()
                .Where(c => lineIds.Contains(c.ReceiptLineId))
                .OrderBy(c => c.CopyBarcode)
                .ToListAsync(cancellationToken);

        var copiesByLine = copies
            .GroupBy(c => c.ReceiptLineId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var lineResponses = lines.Select(l =>
        {
            editionsById.TryGetValue(l.EditionId, out var edInfo);
            var lineCopies = copiesByLine.GetValueOrDefault(l.Id) ?? [];
            var barcodes = lineCopies.Select(c => c.CopyBarcode).ToList();
            var sampleCopy = lineCopies.FirstOrDefault();

            return new StockReceiptLineResponse(
                l.Id,
                l.EditionId,
                edInfo?.Title.Id ?? Guid.Empty,
                edInfo?.Title.Name ?? "Đầu sách",
                edInfo?.Title.VolumeLabel,
                edInfo?.Edition.Isbn,
                edInfo?.Edition.Publisher,
                edInfo?.Edition.PublishYear,
                edInfo?.Edition.EditionStatement,
                edInfo?.Edition.Format,
                edInfo?.Edition.CoverPrice ?? 0L,
                l.Quantity,
                l.UnitCost,
                l.ConditionGrade,
                l.ConditionNote,
                sampleCopy?.Availability ?? l.Availability,
                sampleCopy?.SellingPrice,
                sampleCopy?.RentalRate,
                barcodes.Count,
                barcodes.FirstOrDefault(),
                barcodes.LastOrDefault(),
                barcodes,
                sampleCopy?.Status);
        }).ToList();

        return new StockReceiptDetailResponse(
            receipt.Id,
            receipt.Code,
            receipt.SourceType,
            receipt.SupplierId,
            supplier is not null ? SupplierService.FormatSupplierCode(supplier.Id) : null,
            supplier?.Name,
            receipt.Status,
            receipt.TotalAmount,
            lineResponses.Count,
            lineResponses.Sum(l => l.Quantity),
            lineResponses.Sum(l => l.GeneratedCopyCount),
            receipt.Note,
            receipt.CreatedBy,
            creator?.FullName,
            receipt.CreatedAt,
            receipt.CompletedAt,
            lineResponses);
    }
}
