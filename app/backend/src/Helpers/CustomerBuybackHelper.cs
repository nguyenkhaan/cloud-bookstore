using backend.src.Data;
using backend.src.Dto.Common;
using backend.src.Dto.BuybackDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Helpers;

public record ResolvedBuybackLineInput(
    EditionModel Edition,
    string TitleName,
    ConditionGrade ConditionGrade,
    long AgreedBuyPrice,
    long ExpectedSellingPrice,
    int Quantity,
    string? ConditionNote
);

public static class CustomerBuybackHelper
{
    public const long SingleItemApprovalLimit = 200_000L;
    public const long SlipTotalApprovalLimit = 1_000_000L;
    public const long DefaultDrawerBalance = 6_065_000L;
    public const string ApprovalAuditEntityType = "BUYBACK_APPROVAL";

    public static (string Name, string Phone) ValidateSeller(string? rawName, string? rawPhone)
    {
        if (string.IsNullOrWhiteSpace(rawName))
        {
            throw new BadRequestException("Thiếu người bán: Họ tên người bán là bắt buộc (BR-BUY-001).");
        }

        if (string.IsNullOrWhiteSpace(rawPhone))
        {
            throw new BadRequestException("Thiếu người bán: Số điện thoại người bán là bắt buộc (BR-BUY-001).");
        }

        var name = rawName.Trim();
        var phoneDigits = new string(rawPhone.Where(char.IsDigit).ToArray());

        if (phoneDigits.Length is < 9 or > 15)
        {
            throw new BadRequestException("Số điện thoại người bán phải có từ 9 đến 15 chữ số.");
        }

        return (name, phoneDigits);
    }

    public static async Task<CustomerModel> ResolveOrCreateSellerCustomerAsync(
        AppDbContext dbContext,
        string sellerName,
        string sellerPhone,
        CancellationToken cancellationToken = default)
    {
        var existing = await dbContext.Customers
            .FirstOrDefaultAsync(c => c.Phone == sellerPhone, cancellationToken);

        if (existing is not null)
        {
            return existing;
        }

        var defaultTier = await dbContext.MembershipTiers.AsNoTracking()
            .OrderBy(t => t.RankOrder)
            .FirstOrDefaultAsync(cancellationToken);

        Guid tierId;
        if (defaultTier is not null)
        {
            tierId = defaultTier.Id;
        }
        else
        {
            var createdTier = new MembershipTierModel
            {
                Id = Guid.NewGuid(),
                Name = MembershipTierName.REGULAR,
                RankOrder = 1,
                MinSpend = 0,
                MaxBooks = 3,
                MaxRentalDays = 14
            };
            dbContext.MembershipTiers.Add(createdTier);
            tierId = createdTier.Id;
        }

        var customer = new CustomerModel
        {
            Id = Guid.NewGuid(),
            FullName = sellerName,
            Phone = sellerPhone,
            TierId = tierId,
            EligibleSpend = 0,
            IsFlagged = false,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Customers.Add(customer);
        return customer;
    }

    public static async Task<List<ResolvedBuybackLineInput>> ValidateAndResolveLinesAsync(
        AppDbContext dbContext,
        IReadOnlyList<CreateCustomerBuybackLineRequest>? lines,
        CancellationToken cancellationToken = default)
    {
        if (lines is null || lines.Count == 0)
        {
            throw new BadRequestException("Phiếu thu mua sách cũ phải có ít nhất 1 cuốn sách.");
        }

        var editions = await (from e in dbContext.Editions.AsNoTracking()
                              where e.IsActive
                              join t in dbContext.Titles.AsNoTracking() on e.TitleId equals t.Id
                              select new { Edition = e, Title = t })
            .ToListAsync(cancellationToken);

        if (editions.Count == 0)
        {
            throw new BadRequestException("Hệ thống chưa có ấn bản sách hoạt động để liên kết thu mua.");
        }

        var result = new List<ResolvedBuybackLineInput>(lines.Count);

        foreach (var line in lines)
        {
            if (line.AgreedBuyPrice <= 0)
            {
                throw new BadRequestException("Giá mua thỏa thuận thực tế của mỗi cuốn phải lớn hơn 0.");
            }

            if (line.Quantity is <= 0 or > 100)
            {
                throw new BadRequestException("Số lượng mỗi dòng thu mua phải từ 1 đến 100 cuốn.");
            }

            var matched = editions.FirstOrDefault(x => line.EditionId.HasValue && x.Edition.Id == line.EditionId.Value);

            if (matched is null && !string.IsNullOrWhiteSpace(line.Isbn))
            {
                var cleanIsbn = line.Isbn.Trim().Replace("-", "").Replace(" ", "");
                matched = editions.FirstOrDefault(x =>
                    x.Edition.Isbn != null &&
                    x.Edition.Isbn.Replace("-", "").Replace(" ", "").Contains(cleanIsbn, StringComparison.OrdinalIgnoreCase));
            }

            if (matched is null && !string.IsNullOrWhiteSpace(line.TitleName))
            {
                var q = line.TitleName.Trim().ToLowerInvariant();
                matched = editions.FirstOrDefault(x =>
                    x.Title.Name.ToLowerInvariant().Contains(q) ||
                    q.Contains(x.Title.Name.ToLowerInvariant()));
            }

            matched ??= editions[0];

            var expectedSelling = line.ExpectedSellingPrice > 0
                ? line.ExpectedSellingPrice
                : Math.Max(matched.Edition.CoverPrice, Math.Round((decimal)line.AgreedBuyPrice * 1.4m / 1000m) * 1000m > 0
                    ? (long)(Math.Round((decimal)line.AgreedBuyPrice * 1.4m / 1000m) * 1000m)
                    : line.AgreedBuyPrice + 20000L);

            var displayTitle = !string.IsNullOrWhiteSpace(line.TitleName)
                ? line.TitleName.Trim()
                : (string.IsNullOrWhiteSpace(matched.Title.VolumeLabel)
                    ? matched.Title.Name
                    : $"{matched.Title.Name} - {matched.Title.VolumeLabel}");

            var note = BuildEncodedConditionNote(displayTitle, expectedSelling, line.ConditionNote);

            result.Add(new ResolvedBuybackLineInput(
                matched.Edition,
                displayTitle,
                line.ConditionGrade,
                line.AgreedBuyPrice,
                expectedSelling,
                line.Quantity,
                note));
        }

        return result;
    }

    public static async Task<BuybackIsbnLookupResponse> LookupByIsbnAsync(
        AppDbContext dbContext,
        string rawQuery,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(rawQuery))
        {
            throw new BadRequestException("Vui lòng nhập ISBN hoặc tên sách để tra cứu.");
        }

        var clean = rawQuery.Trim().Replace("-", "").Replace(" ", "");
        var qLower = rawQuery.Trim().ToLowerInvariant();

        var rows = await (from e in dbContext.Editions.AsNoTracking()
                          where e.IsActive
                          join t in dbContext.Titles.AsNoTracking() on e.TitleId equals t.Id
                          select new { Edition = e, Title = t })
            .ToListAsync(cancellationToken);

        var matched = rows.FirstOrDefault(x =>
            (x.Edition.Isbn != null && x.Edition.Isbn.Replace("-", "").Replace(" ", "").Contains(clean, StringComparison.OrdinalIgnoreCase)) ||
            x.Title.Name.ToLowerInvariant().Contains(qLower));

        if (matched is null)
        {
            throw new NotFoundException($"Không tìm thấy ấn bản nào khớp với '{rawQuery}'.");
        }

        var cover = matched.Edition.CoverPrice > 0 ? matched.Edition.CoverPrice : 65000L;
        var fullTitle = string.IsNullOrWhiteSpace(matched.Title.VolumeLabel)
            ? matched.Title.Name
            : $"{matched.Title.Name} - {matched.Title.VolumeLabel}";

        return new BuybackIsbnLookupResponse(
            matched.Edition.Id,
            matched.Title.Id,
            fullTitle,
            matched.Title.Author,
            matched.Edition.Publisher,
            matched.Edition.PublishYear,
            matched.Edition.Isbn,
            cover,
            RoundThousand(cover * 0.60m),
            RoundThousand(cover * 0.70m),
            RoundThousand(cover * 0.50m),
            RoundThousand(cover * 0.60m),
            RoundThousand(cover * 0.30m),
            RoundThousand(cover * 0.45m),
            RoundThousand(cover * 0.15m),
            RoundThousand(cover * 0.25m));
    }

    public static async Task<PagedResult<CustomerBuybackDetailResponse>> GetPagedAsync(
        AppDbContext dbContext,
        BuybackQuery query,
        CancellationToken cancellationToken = default)
    {
        var baseQuery = dbContext.StockReceipts.AsNoTracking()
            .Where(r => r.SourceType == StockReceiptSourceType.CUSTOMER_BUYBACK);

        if (query.Status.HasValue)
        {
            baseQuery = baseQuery.Where(r => r.Status == query.Status.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            var matchingCustomerIds = await dbContext.Customers.AsNoTracking()
                .Where(c => c.FullName.ToLower().Contains(term) || c.Phone.Contains(term))
                .Select(c => c.Id)
                .ToListAsync(cancellationToken);

            baseQuery = baseQuery.Where(r =>
                r.Code.ToLower().Contains(term) ||
                (r.Note != null && r.Note.ToLower().Contains(term)) ||
                (r.SellerId != null && matchingCustomerIds.Contains(r.SellerId.Value)));
        }

        var totalCount = await baseQuery.CountAsync(cancellationToken);
        var receipts = await baseQuery
            .OrderByDescending(r => r.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        var items = new List<CustomerBuybackDetailResponse>(receipts.Count);
        foreach (var receipt in receipts)
        {
            items.Add(await BuildDetailResponseAsync(dbContext, receipt, cancellationToken));
        }

        return new PagedResult<CustomerBuybackDetailResponse>(items, totalCount, query.Page, query.PageSize);
    }

    public static async Task<CustomerBuybackDetailResponse> BuildDetailResponseAsync(
        AppDbContext dbContext,
        StockReceiptModel receipt,
        CancellationToken cancellationToken = default)
    {
        CustomerModel? customer = null;
        if (receipt.SellerId.HasValue)
        {
            customer = await dbContext.Customers.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == receipt.SellerId.Value, cancellationToken);
        }

        var creator = await dbContext.Employees.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == receipt.CreatedBy, cancellationToken);

        EmployeeModel? approver = null;
        if (receipt.ApprovedBy.HasValue)
        {
            approver = await dbContext.Employees.AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == receipt.ApprovedBy.Value, cancellationToken);
        }

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

        var payment = await dbContext.Payments.AsNoTracking()
            .Where(p => p.StockReceiptId == receipt.Id)
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        var openSession = await dbContext.CashSessions.AsNoTracking()
            .Where(s => s.Status == CashSessionStatus.OPEN)
            .OrderByDescending(s => s.OpenedAt)
            .FirstOrDefaultAsync(cancellationToken);

        var drawerBefore = openSession?.OpeningBalance is > 0
            ? openSession.OpeningBalance + 5_000_000L
            : DefaultDrawerBalance;
        var method = payment?.Method ?? PaymentMethod.CASH;
        var drawerAfter = method == PaymentMethod.CASH
            ? Math.Max(0L, drawerBefore - receipt.TotalAmount)
            : drawerBefore;

        var lineResponses = lines.Select(l =>
        {
            editionsById.TryGetValue(l.EditionId, out var edInfo);
            var lineCopies = copiesByLine.GetValueOrDefault(l.Id) ?? [];
            var barcodes = lineCopies.Select(c => c.CopyBarcode).ToList();
            var sampleCopy = lineCopies.FirstOrDefault();

            var (customTitle, encodedSelling) = ParseEncodedConditionNote(l.ConditionNote);
            var fallbackTitle = edInfo is not null
                ? (string.IsNullOrWhiteSpace(edInfo.Title.VolumeLabel)
                    ? edInfo.Title.Name
                    : $"{edInfo.Title.Name} - {edInfo.Title.VolumeLabel}")
                : "Sách thu mua";

            var expectedSelling = sampleCopy?.SellingPrice
                ?? encodedSelling
                ?? Math.Max(edInfo?.Edition.CoverPrice ?? 0L, l.UnitCost + 20000L);

            return new CustomerBuybackLineResponse(
                l.Id,
                l.EditionId,
                customTitle ?? fallbackTitle,
                edInfo?.Edition.Isbn,
                l.ConditionGrade,
                edInfo?.Edition.CoverPrice ?? 0L,
                l.UnitCost,
                expectedSelling,
                l.Quantity,
                l.UnitCost > SingleItemApprovalLimit,
                barcodes,
                sampleCopy?.Status);
        }).ToList();

        return new CustomerBuybackDetailResponse(
            receipt.Id,
            receipt.Code,
            receipt.SellerId,
            customer?.FullName ?? "Khách bán sách",
            customer?.Phone ?? "-",
            receipt.Status,
            receipt.NeedsApproval,
            receipt.TotalAmount,
            lineResponses.Sum(l => l.Quantity),
            lineResponses.Sum(l => l.Barcodes.Count),
            method,
            payment?.PaymentNo,
            drawerBefore,
            drawerAfter,
            receipt.Note,
            receipt.CreatedBy,
            creator?.FullName ?? "Nhân viên",
            receipt.CreatedAt,
            receipt.ApprovedBy,
            approver?.FullName,
            receipt.ApprovedAt,
            receipt.CompletedAt,
            lineResponses);
    }

    public static string BuildEncodedConditionNote(string titleName, long expectedSellingPrice, string? userNote)
    {
        var basePart = $"TITLE:{titleName}|SELL:{expectedSellingPrice}";
        return string.IsNullOrWhiteSpace(userNote) ? basePart : $"{basePart}|NOTE:{userNote.Trim()}";
    }

    public static (string? CustomTitle, long? ExpectedSellingPrice) ParseEncodedConditionNote(string? note)
    {
        if (string.IsNullOrWhiteSpace(note) || !note.StartsWith("TITLE:", StringComparison.Ordinal))
        {
            return (null, null);
        }

        string? title = null;
        long? selling = null;

        foreach (var part in note.Split('|', StringSplitOptions.RemoveEmptyEntries))
        {
            if (part.StartsWith("TITLE:", StringComparison.Ordinal))
            {
                title = part["TITLE:".Length..].Trim();
            }
            else if (part.StartsWith("SELL:", StringComparison.Ordinal) &&
                     long.TryParse(part["SELL:".Length..], out var parsed))
            {
                selling = parsed;
            }
        }

        return (title, selling);
    }

    private static long RoundThousand(decimal val)
        => (long)(Math.Round(val / 1000m) * 1000m);
}
