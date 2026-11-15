using backend.src.Data;
using backend.src.Dto.Common;
using backend.src.Dto.CustomerDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

/// <summary>
/// Read-only projections for CUS-003. Never writes Customer.EligibleSpend (see spec).
/// </summary>
public class CustomerHistoryService(AppDbContext dbContext)
{
    private static readonly string[] ViolationResults = ["OPEN_OVERDUE", "AWAITING_PAYMENT", "SETTLED"];

    private sealed record LineRow(RentalLineModel Line, string CopyBarcode, string TitleName, string? VolumeLabel);

    private sealed record LineContext(
        RentalLineModel Line, RentalSlipModel Slip, ReturnModel? Return,
        string CopyBarcode, string TitleName, string? VolumeLabel);

    // ───────────────────────── Summary ─────────────────────────

    public async Task<CustomerHistorySummaryResponse> GetSummaryAsync(
        Guid customerId, CancellationToken cancellationToken = default)
    {
        var customer = await RequireCustomerAsync(customerId, cancellationToken);
        var now = DateTime.UtcNow;
        var contexts = await LoadLineContextsAsync(customerId, cancellationToken);

        var rentalCount = await dbContext.RentalSlips
            .CountAsync(s => s.CustomerId == customerId && s.Status != RentalSlipStatus.DRAFT, cancellationToken);

        var invoices = dbContext.SaleInvoices.AsNoTracking()
            .Where(i => i.CustomerId == customerId && i.Status != SaleInvoiceStatus.DRAFT);
        var saleCount = await invoices.CountAsync(cancellationToken);

        var receipts = dbContext.StockReceipts.AsNoTracking()
            .Where(r => r.SellerId == customerId
                        && r.SourceType == StockReceiptSourceType.CUSTOMER_BUYBACK
                        && r.Status != ApprovalStatus.DRAFT);
        var buybackCount = await receipts.CountAsync(cancellationToken);
        var buybackPaid = await receipts.Where(r => r.CompletedAt != null)
            .SumAsync(r => r.TotalAmount, cancellationToken);

        var activeSaleLines = await (
            from l in dbContext.SaleInvoiceLines.AsNoTracking()
            join i in dbContext.SaleInvoices.AsNoTracking() on l.InvoiceId equals i.Id
            where i.CustomerId == customerId
                  && i.Status == SaleInvoiceStatus.PAID
                  && l.Status == SaleInvoiceLineStatus.ACTIVE
            select new { l.FinalPrice, l.DiscountAmount }).ToListAsync(cancellationToken);
        var salesSpend = activeSaleLines.Sum(x => x.FinalPrice);
        var salesDiscount = activeSaleLines.Sum(x => x.DiscountAmount);

        var latestSale = await invoices.Where(i => i.Status == SaleInvoiceStatus.PAID)
            .OrderByDescending(i => i.PaidAt ?? i.CreatedAt)
            .Select(i => new { i.Id, i.InvoiceNo, At = i.PaidAt ?? i.CreatedAt, i.TotalPayable })
            .FirstOrDefaultAsync(cancellationToken);
        var latestBuyback = await receipts
            .OrderByDescending(r => r.CompletedAt ?? r.CreatedAt)
            .Select(r => new { r.Id, r.Code, At = r.CompletedAt ?? r.CreatedAt, r.TotalAmount })
            .FirstOrDefaultAsync(cancellationToken);

        var held = contexts
            .Where(x => x.Slip.Status == RentalSlipStatus.ACTIVE && x.Line.Status == RentalLineStatus.RENTING)
            .ToList();
        var rentalSpend = contexts.Where(IsSettled)
            .Sum(x => x.Line.ChargedRentFee + x.Line.ChargedExtensionFee);
        var outstanding = contexts.Sum(OutstandingOf);
        var openOverdueSlips = contexts.Where(x => IsOpenOverdue(x, now)).Select(x => x.Slip.Id).Distinct().Count();
        var computed = salesSpend + rentalSpend;

        return new CustomerHistorySummaryResponse(
            RentalCount: rentalCount,
            SaleCount: saleCount,
            BuybackCount: buybackCount,
            ViolationCount: contexts.Count(x => IsViolation(x, now)),
            HeldBookCount: held.Count,
            ActiveSlipCount: held.Select(x => x.Slip.Id).Distinct().Count(),
            DepositHeld: held.Sum(x => x.Line.DepositAmount),
            LateReturnCount: contexts.Where(x => IsSettled(x) && x.Line.LateDays > 0)
                .Select(x => x.Slip.Id).Distinct().Count(),
            OpenOverdueCount: openOverdueSlips,
            OutstandingAmount: outstanding,
            BlocksNewRental: customer.IsFlagged || openOverdueSlips > 0 || outstanding > 0,
            SalesSpend: salesSpend,
            SalesDiscountTotal: salesDiscount,
            RentalSpend: rentalSpend,
            ComputedEligibleSpend: computed,
            StoredEligibleSpend: customer.EligibleSpend,
            EligibleSpendMismatch: computed != customer.EligibleSpend,
            BuybackPaidTotal: buybackPaid,
            LatestSale: latestSale is null
                ? null
                : new CustomerLatestDocument(latestSale.Id, latestSale.InvoiceNo ?? string.Empty, latestSale.At, latestSale.TotalPayable),
            LatestBuyback: latestBuyback is null
                ? null
                : new CustomerLatestDocument(latestBuyback.Id, latestBuyback.Code, latestBuyback.At, latestBuyback.TotalAmount));
    }

    // ───────────────────────── Rentals ─────────────────────────

    public async Task<PagedResult<CustomerRentalHistoryItem>> GetRentalsAsync(
        Guid customerId, CustomerHistoryQuery query, CancellationToken cancellationToken = default)
    {
        await RequireCustomerAsync(customerId, cancellationToken);
        ValidateRange(query);
        var (page, pageSize) = Paging(query);
        var status = ParseStatus<RentalSlipStatus>(query.Status);
        var now = DateTime.UtcNow;

        var slips = dbContext.RentalSlips.AsNoTracking()
            .Where(s => s.CustomerId == customerId && s.Status != RentalSlipStatus.DRAFT);
        if (status.HasValue) slips = slips.Where(s => s.Status == status.Value);
        if (query.From.HasValue) slips = slips.Where(s => s.RentDate >= query.From.Value);
        if (query.To.HasValue) slips = slips.Where(s => s.RentDate <= query.To.Value);

        var total = await slips.CountAsync(cancellationToken);
        var pageSlips = await slips
            .OrderByDescending(s => s.RentDate).ThenByDescending(s => s.CreatedAt).ThenBy(s => s.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync(cancellationToken);

        var slipIds = pageSlips.Select(s => s.Id).ToList();
        var lineRows = await LoadLineRowsAsync(slipIds, cancellationToken);
        var returns = await dbContext.Returns.AsNoTracking()
            .Where(r => slipIds.Contains(r.SlipId)).ToListAsync(cancellationToken);

        var items = pageSlips.Select(slip =>
        {
            var rows = lineRows.Where(r => r.Line.SlipId == slip.Id).ToList();
            var ret = returns.FirstOrDefault(r => r.SlipId == slip.Id);
            var settled = ret?.Status == ReturnStatus.SETTLED;
            return new CustomerRentalHistoryItem(
                slip.Id,
                slip.SlipNo,
                slip.Status.ToString(),
                slip.RentDate,
                slip.ActivatedAt,
                rows.Count == 0 ? null : rows.Max(r => r.Line.DueAt),
                rows.Select(r => (int)r.Line.ExtensionCount).DefaultIfEmpty(0).Max(),
                settled ? rows.Select(r => (int)r.Line.LateDays).DefaultIfEmpty(0).Max() : 0,
                slip.Status == RentalSlipStatus.ACTIVE
                    && rows.Any(r => r.Line.Status == RentalLineStatus.RENTING && r.Line.DueAt < now),
                rows.Sum(r => r.Line.DepositAmount),
                settled ? rows.Sum(r => r.Line.RefundAmount) : 0,
                rows.Sum(r => OutstandingOf(r.Line, ret)),
                settled ? rows.Sum(r => r.Line.ChargedRentFee + r.Line.ChargedExtensionFee) : 0,
                ret?.Id,
                ret?.ReturnNo,
                ret?.Status.ToString(),
                ret is null ? null : ret.SettledAt ?? ret.ReturnedAt,
                rows.Select(r => new RentalLineSummary(
                    r.Line.Id, r.Line.CopyId, r.CopyBarcode, r.TitleName, r.VolumeLabel,
                    r.Line.Status.ToString(), r.Line.DepositAmount)).ToList());
        }).ToList();

        return new PagedResult<CustomerRentalHistoryItem>(items, total, page, pageSize);
    }

    // ───────────────────────── Sales ─────────────────────────

    public async Task<PagedResult<CustomerSaleHistoryItem>> GetSalesAsync(
        Guid customerId, CustomerHistoryQuery query, CancellationToken cancellationToken = default)
    {
        await RequireCustomerAsync(customerId, cancellationToken);
        ValidateRange(query);
        var (page, pageSize) = Paging(query);
        var status = ParseStatus<SaleInvoiceStatus>(query.Status);

        var invoices = dbContext.SaleInvoices.AsNoTracking()
            .Where(i => i.CustomerId == customerId && i.Status != SaleInvoiceStatus.DRAFT);
        if (status.HasValue) invoices = invoices.Where(i => i.Status == status.Value);
        if (query.From.HasValue)
        {
            var from = FromUtc(query.From.Value);
            invoices = invoices.Where(i => (i.PaidAt ?? i.CreatedAt) >= from);
        }
        if (query.To.HasValue)
        {
            var toExclusive = FromUtc(query.To.Value).AddDays(1);
            invoices = invoices.Where(i => (i.PaidAt ?? i.CreatedAt) < toExclusive);
        }

        var total = await invoices.CountAsync(cancellationToken);
        var pageInvoices = await invoices
            .OrderByDescending(i => i.PaidAt ?? i.CreatedAt).ThenBy(i => i.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync(cancellationToken);

        var ids = pageInvoices.Select(i => i.Id).ToList();
        var lineRows = await (
            from l in dbContext.SaleInvoiceLines.AsNoTracking()
            join c in dbContext.BookCopies.AsNoTracking() on l.CopyId equals c.Id
            join e in dbContext.Editions.AsNoTracking() on c.EditionId equals e.Id
            join t in dbContext.Titles.AsNoTracking() on e.TitleId equals t.Id
            where ids.Contains(l.InvoiceId)
            select new { l, c.CopyBarcode, TitleName = t.Name, t.VolumeLabel }).ToListAsync(cancellationToken);

        var items = pageInvoices.Select(inv =>
        {
            var rows = lineRows.Where(r => r.l.InvoiceId == inv.Id).ToList();
            var counted = inv.Status == SaleInvoiceStatus.PAID
                ? rows.Where(r => r.l.Status == SaleInvoiceLineStatus.ACTIVE).Sum(r => r.l.FinalPrice)
                : 0;
            return new CustomerSaleHistoryItem(
                inv.Id,
                inv.InvoiceNo,
                inv.Status.ToString(),
                inv.PaidAt ?? inv.CreatedAt,
                inv.Subtotal,
                inv.DiscountTotal,
                inv.TotalPayable,
                counted,
                rows.Any(r => r.l.Status == SaleInvoiceLineStatus.REVERSED),
                rows.Count > 0 && rows.All(r => r.l.Status == SaleInvoiceLineStatus.REVERSED),
                rows.Select(r => new SaleLineSummary(
                    r.l.Id, r.l.CopyId, r.CopyBarcode, r.TitleName, r.VolumeLabel,
                    r.l.ListPrice, r.l.FinalPrice, r.l.Status.ToString())).ToList());
        }).ToList();

        return new PagedResult<CustomerSaleHistoryItem>(items, total, page, pageSize);
    }

    // ───────────────────────── Buybacks ─────────────────────────

    public async Task<PagedResult<CustomerBuybackHistoryItem>> GetBuybacksAsync(
        Guid customerId, CustomerHistoryQuery query, CancellationToken cancellationToken = default)
    {
        await RequireCustomerAsync(customerId, cancellationToken);
        ValidateRange(query);
        var (page, pageSize) = Paging(query);
        var status = ParseStatus<ApprovalStatus>(query.Status);

        var receipts = dbContext.StockReceipts.AsNoTracking()
            .Where(r => r.SellerId == customerId
                        && r.SourceType == StockReceiptSourceType.CUSTOMER_BUYBACK
                        && r.Status != ApprovalStatus.DRAFT);
        if (status.HasValue) receipts = receipts.Where(r => r.Status == status.Value);
        if (query.From.HasValue)
        {
            var from = FromUtc(query.From.Value);
            receipts = receipts.Where(r => (r.CompletedAt ?? r.CreatedAt) >= from);
        }
        if (query.To.HasValue)
        {
            var toExclusive = FromUtc(query.To.Value).AddDays(1);
            receipts = receipts.Where(r => (r.CompletedAt ?? r.CreatedAt) < toExclusive);
        }

        var total = await receipts.CountAsync(cancellationToken);
        var pageReceipts = await receipts
            .OrderByDescending(r => r.CompletedAt ?? r.CreatedAt).ThenBy(r => r.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync(cancellationToken);

        var ids = pageReceipts.Select(r => r.Id).ToList();
        var lineRows = await (
            from l in dbContext.StockReceiptLines.AsNoTracking()
            join e in dbContext.Editions.AsNoTracking() on l.EditionId equals e.Id
            join t in dbContext.Titles.AsNoTracking() on e.TitleId equals t.Id
            where ids.Contains(l.ReceiptId)
            select new { l.ReceiptId, TitleName = t.Name, t.VolumeLabel, l.ConditionGrade, l.Quantity, l.UnitCost })
            .ToListAsync(cancellationToken);

        var items = pageReceipts.Select(r => new CustomerBuybackHistoryItem(
            r.Id,
            r.Code,
            r.Status.ToString(),
            r.CompletedAt ?? r.CreatedAt,
            r.TotalAmount,
            r.CompletedAt != null,
            r.NeedsApproval,
            lineRows.Where(l => l.ReceiptId == r.Id)
                .Select(l => new BuybackLineSummary(
                    l.TitleName, l.VolumeLabel, l.ConditionGrade.ToString(), l.Quantity, l.UnitCost))
                .ToList())).ToList();

        return new PagedResult<CustomerBuybackHistoryItem>(items, total, page, pageSize);
    }

    // ───────────────────────── Violations & obligations ─────────────────────────

    public async Task<PagedResult<CustomerViolationItem>> GetViolationsAsync(
        Guid customerId, CustomerHistoryQuery query, CancellationToken cancellationToken = default)
    {
        await RequireCustomerAsync(customerId, cancellationToken);
        ValidateRange(query);
        var (page, pageSize) = Paging(query);

        string? result = null;
        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            result = ViolationResults.FirstOrDefault(r =>
                string.Equals(r, query.Status.Trim(), StringComparison.OrdinalIgnoreCase))
                ?? throw new BadRequestException($"Trạng thái '{query.Status}' không hợp lệ.");
        }

        var now = DateTime.UtcNow;
        // A customer has at most tens of rental lines, so filtering in memory keeps the
        // "left join return" logic simple. Revisit if volume grows.
        var all = (await LoadLineContextsAsync(customerId, cancellationToken))
            .Where(x => IsViolation(x, now))
            .Select(x => ToViolation(x, now))
            .Where(v => result is null || v.Result == result)
            .Where(v => !query.From.HasValue || DateOnly.FromDateTime(v.OccurredAt) >= query.From.Value)
            .Where(v => !query.To.HasValue || DateOnly.FromDateTime(v.OccurredAt) <= query.To.Value)
            .OrderByDescending(v => v.OccurredAt).ThenBy(v => v.LineId)
            .ToList();

        var pageItems = all.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return new PagedResult<CustomerViolationItem>(pageItems, all.Count, page, pageSize);
    }

    // ───────────────────────── Helpers ─────────────────────────

    private async Task<CustomerModel> RequireCustomerAsync(Guid id, CancellationToken cancellationToken) =>
        await dbContext.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
        ?? throw new NotFoundException($"Không tìm thấy khách hàng với mã {id}");

    private static (int Page, int PageSize) Paging(CustomerHistoryQuery query) =>
        (Math.Max(1, query.Page), Math.Clamp(query.PageSize, 1, 100));

    private static void ValidateRange(CustomerHistoryQuery query)
    {
        if (query.From.HasValue && query.To.HasValue && query.From > query.To)
            throw new BadRequestException("Khoảng ngày không hợp lệ: 'Từ ngày' phải trước hoặc bằng 'Đến ngày'.");
    }

    private static TEnum? ParseStatus<TEnum>(string? raw) where TEnum : struct, Enum
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var value = raw.Trim();
        if (Enum.GetNames<TEnum>().Any(n => string.Equals(n, value, StringComparison.OrdinalIgnoreCase))
            && Enum.TryParse<TEnum>(value, ignoreCase: true, out var parsed))
            return parsed;
        throw new BadRequestException($"Trạng thái '{raw}' không hợp lệ.");
    }

    private static DateTime FromUtc(DateOnly date) =>
        DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);

    private async Task<List<LineRow>> LoadLineRowsAsync(List<Guid> slipIds, CancellationToken cancellationToken)
    {
        if (slipIds.Count == 0) return [];
        var rows = await (
            from l in dbContext.RentalLines.AsNoTracking()
            join c in dbContext.BookCopies.AsNoTracking() on l.CopyId equals c.Id
            join e in dbContext.Editions.AsNoTracking() on c.EditionId equals e.Id
            join t in dbContext.Titles.AsNoTracking() on e.TitleId equals t.Id
            where slipIds.Contains(l.SlipId)
            select new { l, c.CopyBarcode, TitleName = t.Name, t.VolumeLabel }).ToListAsync(cancellationToken);
        return rows.Select(r => new LineRow(r.l, r.CopyBarcode, r.TitleName, r.VolumeLabel)).ToList();
    }

    private async Task<List<LineContext>> LoadLineContextsAsync(Guid customerId, CancellationToken cancellationToken)
    {
        var slips = await dbContext.RentalSlips.AsNoTracking()
            .Where(s => s.CustomerId == customerId && s.Status != RentalSlipStatus.DRAFT)
            .ToListAsync(cancellationToken);
        if (slips.Count == 0) return [];

        var slipIds = slips.Select(s => s.Id).ToList();
        var rows = await LoadLineRowsAsync(slipIds, cancellationToken);
        var returns = await dbContext.Returns.AsNoTracking()
            .Where(r => slipIds.Contains(r.SlipId)).ToListAsync(cancellationToken);

        var slipById = slips.ToDictionary(s => s.Id);
        var returnBySlip = returns.ToDictionary(r => r.SlipId);
        return rows.Select(r => new LineContext(
            r.Line, slipById[r.Line.SlipId], returnBySlip.GetValueOrDefault(r.Line.SlipId),
            r.CopyBarcode, r.TitleName, r.VolumeLabel)).ToList();
    }

    private static bool IsSettled(LineContext x) => x.Return?.Status == ReturnStatus.SETTLED;

    private static long OutstandingOf(RentalLineModel line, ReturnModel? ret) =>
        ret is null || ret.Status == ReturnStatus.CANCELLED
            ? 0
            : Math.Max(0, line.AdditionalAmountDue - line.AdditionalAmountPaid);

    private static long OutstandingOf(LineContext x) => OutstandingOf(x.Line, x.Return);

    private static bool IsOpenOverdue(LineContext x, DateTime now) =>
        x.Slip.Status == RentalSlipStatus.ACTIVE
        && x.Line.Status == RentalLineStatus.RENTING
        && x.Line.DueAt < now;

    private static bool IsViolation(LineContext x, DateTime now)
    {
        var l = x.Line;
        return IsOpenOverdue(x, now)
            || OutstandingOf(x) > 0
            || (IsSettled(x) && (l.LateDays > 0 || l.ChargedLatePenalty > 0
                                 || l.ChargedDamagePenalty > 0 || l.LostRetainedAmount > 0));
    }

    private static CustomerViolationItem ToViolation(LineContext x, DateTime now)
    {
        var settled = IsSettled(x);
        var outstanding = OutstandingOf(x);
        var result = IsOpenOverdue(x, now) ? "OPEN_OVERDUE" : outstanding > 0 ? "AWAITING_PAYMENT" : "SETTLED";
        var occurred = settled
            ? x.Return!.SettledAt ?? x.Return.ReturnedAt
            : x.Return?.ReturnedAt ?? x.Line.DueAt;

        return new CustomerViolationItem(
            x.Line.Id, x.Slip.Id, x.Slip.SlipNo, x.Return?.Id, x.Return?.ReturnNo,
            x.Line.CopyId, x.CopyBarcode, x.TitleName, x.VolumeLabel,
            occurred, x.Line.DueAt, result,
            settled ? x.Line.LateDays : 0,
            settled ? x.Line.ChargedLatePenalty : x.Line.LockedLatePenalty,
            settled ? x.Line.ChargedDamagePenalty : 0,
            settled ? x.Line.LostRetainedAmount : 0,
            outstanding);
    }
}