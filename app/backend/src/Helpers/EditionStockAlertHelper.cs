using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.EditionDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Helpers;

public static class EditionStockAlertHelper
{
    private const string AuditEntityType = "Edition";
    private const string ActionUpdateThresholds = "EDITION_UPDATE_THRESHOLDS";

    public static async Task<EditionStockAlertDashboardResponse> GetStockAlertsAsync(
        AppDbContext dbContext,
        EditionStockAlertQuery query,
        CancellationToken cancellationToken = default)
    {
        var editions = await dbContext.Editions.AsNoTracking()
            .Where(e => e.IsActive)
            .ToListAsync(cancellationToken);

        var titleIds = editions.Select(e => e.TitleId).Distinct().ToList();
        var titles = titleIds.Count == 0
            ? new Dictionary<Guid, TitleModel>()
            : await dbContext.Titles.AsNoTracking()
                .Where(t => titleIds.Contains(t.Id))
                .ToDictionaryAsync(t => t.Id, cancellationToken);

        var editionIds = editions.Select(e => e.Id).ToList();
        var copies = editionIds.Count == 0
            ? []
            : await dbContext.BookCopies.AsNoTracking()
                .Where(c => editionIds.Contains(c.EditionId) &&
                            c.Status != BookCopyStatus.SOLD &&
                            c.Status != BookCopyStatus.DISPOSED &&
                            c.Status != BookCopyStatus.LOST)
                .Select(c => new { c.EditionId, c.Status, c.Availability })
                .ToListAsync(cancellationToken);

        var copiesByEdition = copies
            .GroupBy(c => c.EditionId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var suppliers = await dbContext.Suppliers.AsNoTracking()
            .Where(s => s.IsActive)
            .OrderBy(s => s.Name)
            .ToListAsync(cancellationToken);

        var receiptLineRows = editionIds.Count == 0
            ? []
            : await (from l in dbContext.StockReceiptLines.AsNoTracking()
                     where editionIds.Contains(l.EditionId)
                     join r in dbContext.StockReceipts.AsNoTracking() on l.ReceiptId equals r.Id
                     where r.SourceType == StockReceiptSourceType.SUPPLIER &&
                           r.Status != ApprovalStatus.CANCELLED &&
                           r.Status != ApprovalStatus.REJECTED
                     orderby r.CreatedAt descending
                     select new
                     {
                         l.EditionId,
                         l.Quantity,
                         r.Status,
                         r.Code,
                         r.SupplierId,
                         r.CreatedAt
                     }).ToListAsync(cancellationToken);

        var pendingLines = receiptLineRows
            .Where(r => r.Status == ApprovalStatus.DRAFT || r.Status == ApprovalStatus.PENDING_APPROVAL)
            .ToList();

        var pendingByEdition = pendingLines
            .GroupBy(r => r.EditionId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Quantity));

        var latestSupplierByEdition = receiptLineRows
            .Where(r => r.SupplierId.HasValue)
            .GroupBy(r => r.EditionId)
            .ToDictionary(g => g.Key, g => g.First().SupplierId!.Value);

        var suppliersById = suppliers.ToDictionary(s => s.Id);

        var allBuiltItems = editions.Select(ed =>
        {
            titles.TryGetValue(ed.TitleId, out var title);
            var edCopies = copiesByEdition.GetValueOrDefault(ed.Id) ?? [];
            var pendingCount = pendingByEdition.GetValueOrDefault(ed.Id);

            var supplier = ResolvePreferredSupplier(ed, latestSupplierByEdition, suppliersById, suppliers);

            return BuildAlertItem(
                ed,
                title,
                edCopies.Select(c => (c.Status, c.Availability)),
                pendingCount,
                supplier);
        }).ToList();

        var alertEditionCount = allBuiltItems.Count(i => i.IsSaleLow || i.IsRentalLow);
        var rentalLowEditionCount = allBuiltItems.Count(i => i.IsRentalLow);
        var pendingImportCopiesCount = pendingLines.Sum(l => l.Quantity);
        var pendingImportEditionCount = pendingLines.Select(l => l.EditionId).Distinct().Count();
        var latestPendingReceiptCode = pendingLines.FirstOrDefault()?.Code;
        var totalSuggestedRestock = allBuiltItems
            .Where(i => i.IsSaleLow || i.IsRentalLow)
            .Sum(i => i.SuggestedRestockCount);

        IEnumerable<EditionStockAlertItemResponse> filtered = allBuiltItems;

        if (query.OnlyAlerts)
        {
            filtered = filtered.Where(i => i.IsSaleLow || i.IsRentalLow);
        }

        if (query.SupplierId.HasValue)
        {
            filtered = filtered.Where(i => i.PreferredSupplierId == query.SupplierId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Channel))
        {
            var ch = query.Channel.Trim().ToUpperInvariant();
            if (ch == "SALE")
            {
                filtered = filtered.Where(i => i.IsSaleLow);
            }
            else if (ch == "RENTAL")
            {
                filtered = filtered.Where(i => i.IsRentalLow);
            }
        }

        if (!string.IsNullOrWhiteSpace(query.Severity))
        {
            var sev = query.Severity.Trim().ToUpperInvariant();
            if (sev != "ALL")
            {
                filtered = filtered.Where(i => string.Equals(i.Severity, sev, StringComparison.OrdinalIgnoreCase));
            }
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var q = query.Search.Trim().ToLowerInvariant();
            filtered = filtered.Where(i =>
                i.TitleName.ToLowerInvariant().Contains(q) ||
                (i.Isbn != null && i.Isbn.ToLowerInvariant().Contains(q)) ||
                (i.Publisher != null && i.Publisher.ToLowerInvariant().Contains(q)));
        }

        var orderedItems = filtered
            .OrderByDescending(i => i.IsSaleLow || i.IsRentalLow)
            .ThenBy(i => i.AvailableSale + i.AvailableRental)
            .ThenBy(i => i.TitleName)
            .ToList();

        return new EditionStockAlertDashboardResponse(
            alertEditionCount,
            rentalLowEditionCount,
            pendingImportCopiesCount,
            pendingImportEditionCount,
            latestPendingReceiptCode,
            totalSuggestedRestock,
            orderedItems);
    }

    public static async Task<EditionStockAlertItemResponse> UpdateThresholdsAsync(
        AppDbContext dbContext,
        AuditLogService auditLogService,
        Guid editionId,
        UpdateEditionThresholdsRequest request,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        if (request.MinStockSale is null)
        {
            throw new BadRequestException("Tồn an toàn kênh Bán (MinStockSale) là bắt buộc.");
        }

        if (request.MinStockRental is null)
        {
            throw new BadRequestException("Tồn an toàn kênh Thuê (MinStockRental) là bắt buộc.");
        }

        if (request.MinStockSale.Value < 0)
        {
            throw new BadRequestException("Tồn an toàn kênh Bán (MinStockSale) không được nhỏ hơn 0.");
        }

        if (request.MinStockRental.Value < 0)
        {
            throw new BadRequestException("Tồn an toàn kênh Thuê (MinStockRental) không được nhỏ hơn 0.");
        }

        var edition = await dbContext.Editions
            .FirstOrDefaultAsync(e => e.Id == editionId, cancellationToken)
            ?? throw new NotFoundException($"Không tìm thấy ấn bản với ID '{editionId}'.");

        var beforeSnapshot = new
        {
            edition.Id,
            edition.MinStockSale,
            edition.MinStockRental
        };

        edition.MinStockSale = request.MinStockSale.Value;
        edition.MinStockRental = request.MinStockRental.Value;
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.CreateAuditLogEntryAsync(
            new CreateAuditLogEntry(
                ActionUpdateThresholds,
                AuditEntityType,
                edition.Id,
                beforeSnapshot,
                new
                {
                    edition.Id,
                    edition.MinStockSale,
                    edition.MinStockRental
                },
                $"Cập nhật ngưỡng tồn an toàn ấn bản {edition.Isbn ?? edition.Id.ToString()} (Bán: {edition.MinStockSale}, Thuê: {edition.MinStockRental})",
                auditContext),
            cancellationToken);

        var title = await dbContext.Titles.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == edition.TitleId, cancellationToken);

        var copies = await dbContext.BookCopies.AsNoTracking()
            .Where(c => c.EditionId == edition.Id &&
                        c.Status != BookCopyStatus.SOLD &&
                        c.Status != BookCopyStatus.DISPOSED &&
                        c.Status != BookCopyStatus.LOST)
            .Select(c => new { c.Status, c.Availability })
            .ToListAsync(cancellationToken);

        var suppliers = await dbContext.Suppliers.AsNoTracking()
            .Where(s => s.IsActive)
            .OrderBy(s => s.Name)
            .ToListAsync(cancellationToken);

        var suppliersById = suppliers.ToDictionary(s => s.Id);
        var supplier = ResolvePreferredSupplier(edition, new Dictionary<Guid, Guid>(), suppliersById, suppliers);

        return BuildAlertItem(
            edition,
            title,
            copies.Select(c => (c.Status, c.Availability)),
            0,
            supplier);
    }

    private static SupplierModel? ResolvePreferredSupplier(
        EditionModel edition,
        IReadOnlyDictionary<Guid, Guid> latestSupplierByEdition,
        IReadOnlyDictionary<Guid, SupplierModel> suppliersById,
        IReadOnlyList<SupplierModel> activeSuppliers)
    {
        if (latestSupplierByEdition.TryGetValue(edition.Id, out var latestSupId) &&
            suppliersById.TryGetValue(latestSupId, out var latestSup))
        {
            return latestSup;
        }

        if (!string.IsNullOrWhiteSpace(edition.Publisher))
        {
            var pubLower = edition.Publisher.Trim().ToLowerInvariant();
            var matched = activeSuppliers.FirstOrDefault(s =>
                s.Name.ToLowerInvariant().Contains(pubLower) ||
                pubLower.Contains(s.Name.ToLowerInvariant()));
            if (matched is not null)
            {
                return matched;
            }
        }

        return activeSuppliers.FirstOrDefault();
    }

    private static EditionStockAlertItemResponse BuildAlertItem(
        EditionModel ed,
        TitleModel? title,
        IEnumerable<(BookCopyStatus Status, BookChannelAvailability Availability)> copyRows,
        int pendingCount,
        SupplierModel? supplier)
    {
        var list = copyRows.ToList();

        var availableSale = list.Count(c =>
            c.Status == BookCopyStatus.AVAILABLE &&
            (c.Availability == BookChannelAvailability.BOTH || c.Availability == BookChannelAvailability.SALE_ONLY));

        var availableRental = list.Count(c =>
            c.Status == BookCopyStatus.AVAILABLE &&
            (c.Availability == BookChannelAvailability.BOTH || c.Availability == BookChannelAvailability.RENTAL_ONLY));

        var rentedCount = list.Count(c => c.Status == BookCopyStatus.RENTED);
        var totalPhysical = list.Count;

        var isSaleLow = availableSale <= ed.MinStockSale && (ed.MinStockSale > 0 || availableSale == 0);
        var isRentalLow = availableRental <= ed.MinStockRental && (ed.MinStockRental > 0 || availableRental == 0);
        var isOutOfStock = availableSale == 0 && availableRental == 0;

        var saleDeficit = Math.Max(0, ed.MinStockSale - availableSale);
        var rentalDeficit = Math.Max(0, ed.MinStockRental - availableRental);

        string severity;
        string severityLabel;
        if (isOutOfStock)
        {
            severity = "OUT_OF_STOCK";
            severityLabel = "Hết khả dụng";
        }
        else if (isSaleLow && isRentalLow)
        {
            severity = "BOTH_LOW";
            severityLabel = "Thiếu Bán & Thuê";
        }
        else if (isRentalLow)
        {
            severity = "RENTAL_LOW";
            severityLabel = $"Thiếu kho thuê (còn {availableRental}/{ed.MinStockRental})";
        }
        else if (isSaleLow)
        {
            severity = "SALE_LOW";
            severityLabel = $"Thiếu kho bán (còn {availableSale}/{ed.MinStockSale})";
        }
        else
        {
            severity = "OK";
            severityLabel = "Đủ tồn an toàn";
        }

        int suggestedRestock;
        string suggestionText;

        if (!isSaleLow && !isRentalLow)
        {
            suggestedRestock = 0;
            suggestionText = "Kênh Bán: Đủ tồn | Kênh Thuê: Đủ tồn";
        }
        else if (!isSaleLow && isRentalLow)
        {
            var addRental = Math.Max(1, rentalDeficit);
            suggestedRestock = addRental;
            suggestionText = $"Kênh Bán: Đủ tồn | Kênh Thuê: +{addRental} cuốn";
        }
        else if (isSaleLow && !isRentalLow)
        {
            var addSale = Math.Max(1, saleDeficit);
            suggestedRestock = addSale;
            suggestionText = $"Kênh Bán: +{addSale} cuốn | Kênh Thuê: Đủ tồn";
        }
        else
        {
            var addSale = Math.Max(1, saleDeficit);
            var addRental = Math.Max(1, rentalDeficit);
            suggestedRestock = addSale + addRental;
            suggestionText = $"Kênh Bán: +{addSale} cuốn | Kênh Thuê: +{addRental} cuốn";
        }

        var fullTitle = title is not null
            ? $"{title.Name}{(string.IsNullOrWhiteSpace(title.VolumeLabel) ? "" : $" - {title.VolumeLabel}")}"
            : "Đầu sách";

        return new EditionStockAlertItemResponse(
            ed.Id,
            ed.TitleId,
            fullTitle,
            title?.VolumeLabel,
            ed.EditionStatement,
            ed.Isbn,
            ed.Publisher,
            ed.PublishYear,
            ed.CoverPrice,
            ed.MinStockSale,
            ed.MinStockRental,
            availableSale,
            availableRental,
            rentedCount,
            totalPhysical,
            pendingCount,
            saleDeficit,
            rentalDeficit,
            suggestedRestock,
            isSaleLow,
            isRentalLow,
            severity,
            severityLabel,
            suggestionText,
            supplier?.Id,
            supplier is not null ? SupplierService.FormatSupplierCode(supplier.Id) : null,
            supplier?.Name);
    }
}
