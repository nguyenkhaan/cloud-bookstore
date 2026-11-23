using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.StockReceiptDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Helpers;

public record ResolvedReceiptLinePricing(
    long SellingPrice,
    long? RentalRate,
    BookChannelAvailability Availability,
    string? ShelfCode
);

public static class StockReceiptValidator
{
    public const string AuditEntityType = "StockReceipt";
    public const string ActionCreate = "STOCK_RECEIPT_CREATE";
    public const string ActionUpdate = "STOCK_RECEIPT_UPDATE";
    public const string ActionComplete = "STOCK_RECEIPT_COMPLETE";
    public const string ActionActivate = "STOCK_RECEIPT_ACTIVATE_COPIES";
    public const string ActionCancel = "STOCK_RECEIPT_CANCEL";

    public static async Task<Guid> ResolveActorIdAsync(
        AppDbContext dbContext,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        if (auditContext.ActorId is { } actorId && actorId != Guid.Empty)
        {
            var exists = await dbContext.Employees.AsNoTracking()
                .AnyAsync(e => e.Id == actorId, cancellationToken);
            if (exists)
            {
                return actorId;
            }
        }

        var fallbackEmployee = await dbContext.Employees.AsNoTracking()
            .OrderBy(e => e.CreatedAt)
            .Select(e => e.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (fallbackEmployee == Guid.Empty)
        {
            throw new UnauthorizedException("Không tìm thấy nhân viên thực hiện thao tác.");
        }

        return fallbackEmployee;
    }

    public static async Task<SupplierModel> ValidateSupplierAsync(
        AppDbContext dbContext,
        Guid supplierId,
        CancellationToken cancellationToken = default)
    {
        if (supplierId == Guid.Empty)
        {
            throw new BadRequestException("Vui lòng chọn nhà cung cấp.");
        }

        var supplier = await dbContext.Suppliers.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == supplierId, cancellationToken)
            ?? throw new NotFoundException($"Không tìm thấy nhà cung cấp với ID '{supplierId}'.");

        if (!supplier.IsActive)
        {
            throw new BadRequestException($"Nhà cung cấp '{supplier.Name}' đã ngừng hợp tác, không thể lập phiếu nhập mới.");
        }

        return supplier;
    }

    public static async Task<List<CreateStockReceiptLineRequest>> ValidateLinesAsync(
        AppDbContext dbContext,
        IReadOnlyList<CreateStockReceiptLineRequest>? lines,
        CancellationToken cancellationToken = default)
    {
        if (lines is null || lines.Count == 0)
        {
            throw new BadRequestException("Phiếu nhập kho phải có ít nhất 1 dòng sách.");
        }

        foreach (var line in lines)
        {
            if (line.EditionId == Guid.Empty)
            {
                throw new BadRequestException("EditionId của dòng sách không được để trống.");
            }

            if (line.Quantity <= 0 || line.Quantity > 500)
            {
                throw new BadRequestException("Số lượng nhập mỗi dòng phải từ 1 đến 500 cuốn.");
            }

            if (line.UnitCost < 0)
            {
                throw new BadRequestException("Giá vốn nhập (UnitCost) không được âm.");
            }
        }

        var editionIds = lines.Select(l => l.EditionId).Distinct().ToList();
        var existingEditions = await dbContext.Editions.AsNoTracking()
            .Where(e => editionIds.Contains(e.Id))
            .Select(e => new { e.Id, e.IsActive })
            .ToListAsync(cancellationToken);

        if (existingEditions.Count != editionIds.Count)
        {
            var foundSet = existingEditions.Select(e => e.Id).ToHashSet();
            var missingId = editionIds.First(id => !foundSet.Contains(id));
            throw new NotFoundException($"Không tìm thấy ấn bản với ID '{missingId}'.");
        }

        var inactive = existingEditions.FirstOrDefault(e => !e.IsActive);
        if (inactive is not null)
        {
            throw new BadRequestException($"Ấn bản '{inactive.Id}' đang bị ngừng sử dụng, không thể nhập kho.");
        }

        return lines.ToList();
    }

    public static ResolvedReceiptLinePricing ResolveLinePricing(
        StockReceiptLineModel line,
        EditionModel edition,
        IReadOnlyList<CompleteStockReceiptLinePricingRequest> pricingOverrides)
    {
        var lineOverride = pricingOverrides.FirstOrDefault(p =>
            (p.LineId.HasValue && p.LineId.Value == line.Id) ||
            (!p.LineId.HasValue && p.EditionId.HasValue && p.EditionId.Value == line.EditionId));

        var availability = lineOverride?.Availability ?? line.Availability;
        var defaultSelling = edition.CoverPrice > 0
            ? edition.CoverPrice
            : (line.UnitCost > 0 ? line.UnitCost : 50000L);
        var sellingPrice = lineOverride?.SellingPrice ?? defaultSelling;

        if (sellingPrice <= 0)
        {
            throw new BadRequestException("Giá bán niêm yết phải lớn hơn 0.");
        }

        long? rentalRate = lineOverride?.RentalRate;
        if (availability != BookChannelAvailability.SALE_ONLY)
        {
            rentalRate ??= Math.Max(2000L, (sellingPrice / 15 / 500) * 500);
            if (rentalRate <= 0)
            {
                throw new BadRequestException("Giá thuê/ngày phải lớn hơn 0 khi bản sách cho phép thuê.");
            }
        }

        var shelfCode = string.IsNullOrWhiteSpace(lineOverride?.ShelfCode)
            ? null
            : lineOverride!.ShelfCode!.Trim();

        return new ResolvedReceiptLinePricing(sellingPrice, rentalRate, availability, shelfCode);
    }

    public static List<StockReceiptLineModel> BuildLineEntities(
        Guid receiptId,
        IEnumerable<CreateStockReceiptLineRequest> lines)
        => lines.Select(l => new StockReceiptLineModel
        {
            Id = Guid.NewGuid(),
            ReceiptId = receiptId,
            EditionId = l.EditionId,
            Quantity = l.Quantity,
            UnitCost = l.UnitCost,
            ConditionGrade = l.ConditionGrade,
            Availability = l.Availability,
            ConditionNote = string.IsNullOrWhiteSpace(l.ConditionNote) ? null : l.ConditionNote.Trim()
        }).ToList();

    public static object ToAuditSnapshot(
        StockReceiptModel receipt,
        IReadOnlyCollection<StockReceiptLineModel> lines) => new
    {
        receipt.Id,
        receipt.Code,
        SourceType = receipt.SourceType.ToString(),
        receipt.SupplierId,
        Status = receipt.Status.ToString(),
        receipt.TotalAmount,
        receipt.Note,
        receipt.CreatedBy,
        receipt.CreatedAt,
        receipt.CompletedAt,
        Lines = lines.Select(l => new
        {
            l.Id,
            l.EditionId,
            l.Quantity,
            l.UnitCost,
            ConditionGrade = l.ConditionGrade.ToString(),
            Availability = l.Availability.ToString()
        }).ToList()
    };
}
