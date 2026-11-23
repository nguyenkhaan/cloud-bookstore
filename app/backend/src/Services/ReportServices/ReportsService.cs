using backend.src.Data;
using backend.src.Dto.Common;
using backend.src.Dto.ReportDto;
using backend.src.Exceptions;
using backend.src.Helpers;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services.ReportServices;

public class ReportsService(AppDbContext dbContext, TimeProvider timeProvider)
{
    private const string DefaultStoreScopeLabel = "Nhà sách Mây · Cơ sở 01";
    private const decimal VietQrTargetPct = 95m;

    // =========================================================================
    // SCR-REP-01: Business Overview
    // =========================================================================

    public async Task<OverviewReportResponse> GetOverviewAsync(
        DateOnly? date,
        string? trendRange,
        Guid? currentEmployeeId,
        bool isCashierScoped,
        CancellationToken cancellationToken = default)
    {
        var utcNow = timeProvider.GetUtcNow().UtcDateTime;
        var todayVn = VietnamTimeHelper.TodayVietnam(utcNow);
        var targetDate = date ?? todayVn;
        var normalizedRange = string.Equals(trendRange, "month", StringComparison.OrdinalIgnoreCase)
            ? "month"
            : "week";

        var (dayStartUtc, dayEndUtc) = VietnamTimeHelper.GetDayRangeUtc(targetDate);
        var referenceNowUtc = targetDate < todayVn ? dayEndUtc : utcNow;

        // Determine cashier-scoped active session IDs if applicable
        var openSessionsQuery = dbContext.CashSessions.AsNoTracking()
            .Where(s => s.Status != CashSessionStatus.CLOSED);
        if (isCashierScoped && currentEmployeeId.HasValue)
        {
            openSessionsQuery = openSessionsQuery.Where(s => s.OpenedBy == currentEmployeeId.Value);
        }

        var openSessions = await openSessionsQuery
            .Select(s => new { s.Id, s.OpeningBalance })
            .ToListAsync(cancellationToken);

        var openSessionIds = openSessions.Select(s => s.Id).ToList();
        var cashPaymentsInOpenSessions = openSessionIds.Count == 0
            ? []
            : await dbContext.Payments.AsNoTracking()
                .Where(p => p.CashSessionId.HasValue &&
                            openSessionIds.Contains(p.CashSessionId.Value) &&
                            p.Status == PaymentStatus.SUCCEEDED &&
                            p.Method == PaymentMethod.CASH)
                .Select(p => new { p.Direction, p.Amount })
                .ToListAsync(cancellationToken);

        var cashDrawerBalance = openSessions.Sum(s => s.OpeningBalance) +
            cashPaymentsInOpenSessions.Sum(p => p.Direction == PaymentDirection.IN ? p.Amount : -p.Amount);

        // Trend window in Vietnam time
        var trendFromVn = normalizedRange == "month"
            ? new DateOnly(targetDate.Year, targetDate.Month, 1)
            : targetDate.AddDays(-6);
        var (trendStartUtc, _) = VietnamTimeHelper.GetDayRangeUtc(trendFromVn);
        var windowStartUtc = trendStartUtc < dayStartUtc ? trendStartUtc : dayStartUtc;

        var saleLinesQuery = from sl in dbContext.SaleInvoiceLines.AsNoTracking()
                             where sl.Status == SaleInvoiceLineStatus.ACTIVE
                             join inv in dbContext.SaleInvoices.AsNoTracking() on sl.InvoiceId equals inv.Id
                             where inv.Status == SaleInvoiceStatus.PAID
                             let effectiveAt = inv.PaidAt ?? inv.CreatedAt
                             where effectiveAt >= windowStartUtc && effectiveAt < dayEndUtc
                             select new
                             {
                                 inv.CreatedBy,
                                 inv.CashSessionId,
                                 EffectiveAt = effectiveAt,
                                 sl.FinalPrice
                             };

        if (isCashierScoped && currentEmployeeId.HasValue)
        {
            var empId = currentEmployeeId.Value;
            saleLinesQuery = saleLinesQuery.Where(x =>
                x.CreatedBy == empId || openSessionIds.Contains(x.CashSessionId));
        }

        var saleLines = await saleLinesQuery.ToListAsync(cancellationToken);

        var settledRentalLinesQuery = from rl in dbContext.RentalLines.AsNoTracking()
                                      join ret in dbContext.Returns.AsNoTracking() on rl.ReturnId equals ret.Id
                                      where ret.Status == ReturnStatus.SETTLED
                                      let effectiveAt = ret.SettledAt ?? ret.ReturnedAt
                                      where effectiveAt >= windowStartUtc && effectiveAt < dayEndUtc
                                      select new
                                      {
                                          ret.CreatedBy,
                                          EffectiveAt = effectiveAt,
                                          rl.ChargedRentFee,
                                          rl.ChargedExtensionFee,
                                          rl.ChargedLatePenalty,
                                          rl.ChargedDamagePenalty,
                                          rl.LostRetainedAmount
                                      };

        if (isCashierScoped && currentEmployeeId.HasValue)
        {
            var empId = currentEmployeeId.Value;
            settledRentalLinesQuery = settledRentalLinesQuery.Where(x => x.CreatedBy == empId);
        }

        var settledRentalLines = await settledRentalLinesQuery.ToListAsync(cancellationToken);

        // Today breakdown
        var todaySales = saleLines
            .Where(x => x.EffectiveAt >= dayStartUtc && x.EffectiveAt < dayEndUtc)
            .Sum(x => x.FinalPrice);

        var todayRentalsList = settledRentalLines
            .Where(x => x.EffectiveAt >= dayStartUtc && x.EffectiveAt < dayEndUtc)
            .ToList();

        var todayRentFees = todayRentalsList.Sum(x => x.ChargedRentFee + x.ChargedExtensionFee);
        var todayPenalties = todayRentalsList.Sum(x => x.ChargedLatePenalty + x.ChargedDamagePenalty);
        var todayLostBook = todayRentalsList.Sum(x => x.LostRetainedAmount);
        var todayRentalTotal = todayRentFees + todayPenalties + todayLostBook;
        var totalSettledRevenueToday = todaySales + todayRentalTotal;

        // Held deposits & circulating rentals (live point-in-time)
        var rentingLines = await (from rl in dbContext.RentalLines.AsNoTracking()
                                  join slip in dbContext.RentalSlips.AsNoTracking() on rl.SlipId equals slip.Id
                                  join cust in dbContext.Customers.AsNoTracking() on slip.CustomerId equals cust.Id
                                  where slip.Status == RentalSlipStatus.ACTIVE &&
                                        rl.Status == RentalLineStatus.RENTING
                                  select new
                                  {
                                      rl.SlipId,
                                      slip.SlipNo,
                                      slip.CustomerId,
                                      cust.FullName,
                                      cust.Phone,
                                      rl.DepositAmount,
                                      rl.DueAt
                                  }).ToListAsync(cancellationToken);

        var heldDepositsBalance = rentingLines.Sum(x => x.DepositAmount);
        var circulatingSlips = await dbContext.RentalSlips.AsNoTracking()
            .CountAsync(s => s.Status == RentalSlipStatus.ACTIVE, cancellationToken);

        var overdueGroups = rentingLines
            .GroupBy(x => x.SlipId)
            .Select(g =>
            {
                var first = g.First();
                var earliestDue = g.Min(x => x.DueAt);
                var daysOverdue = earliestDue < referenceNowUtc
                    ? Math.Max(1, (int)Math.Floor((referenceNowUtc - earliestDue).TotalDays))
                    : 0;
                return new
                {
                    first.SlipId,
                    first.SlipNo,
                    first.CustomerId,
                    first.FullName,
                    first.Phone,
                    EarliestDueAt = earliestDue,
                    DaysOverdue = daysOverdue,
                    ActiveCopyCount = g.Count()
                };
            })
            .Where(x => x.DaysOverdue > 0)
            .OrderByDescending(x => x.DaysOverdue)
            .ThenBy(x => x.EarliestDueAt)
            .ToList();

        var overdueCustomers = overdueGroups
            .Where(x => x.DaysOverdue > 7)
            .Select(x => new OverdueCustomerRowDto(
                x.SlipId,
                x.SlipNo,
                x.CustomerId,
                x.FullName,
                x.Phone,
                x.EarliestDueAt,
                x.DaysOverdue,
                x.ActiveCopyCount))
            .ToList();

        // VietQR stats for selected day
        var qrPayments = await dbContext.Payments.AsNoTracking()
            .Where(p => p.Method == PaymentMethod.BANK_TRANSFER &&
                        p.CreatedAt >= dayStartUtc && p.CreatedAt < dayEndUtc)
            .Select(p => p.Status)
            .ToListAsync(cancellationToken);

        var qrSucceeded = qrPayments.Count(s => s == PaymentStatus.SUCCEEDED);
        var qrTotal = qrPayments.Count;
        var qrRate = qrTotal > 0 ? Math.Round(qrSucceeded * 100m / qrTotal, 1) : 0m;
        var qrAttentionCount = qrPayments.Count(s => s is PaymentStatus.PENDING or PaymentStatus.FAILED or PaymentStatus.EXPIRED);

        // Build daily trend buckets in Vietnam timezone
        var salesByDay = saleLines
            .GroupBy(x => VietnamTimeHelper.TodayVietnam(x.EffectiveAt))
            .ToDictionary(g => g.Key, g => g.Sum(x => x.FinalPrice));

        var rentalByDay = settledRentalLines
            .GroupBy(x => VietnamTimeHelper.TodayVietnam(x.EffectiveAt))
            .ToDictionary(
                g => g.Key,
                g => g.Sum(x => x.ChargedRentFee + x.ChargedExtensionFee + x.ChargedLatePenalty + x.ChargedDamagePenalty + x.LostRetainedAmount));

        var trendPoints = new List<OverviewTrendPointDto>();
        for (var d = trendFromVn; d <= targetDate; d = d.AddDays(1))
        {
            var sAmt = salesByDay.GetValueOrDefault(d);
            var rAmt = rentalByDay.GetValueOrDefault(d);
            trendPoints.Add(new OverviewTrendPointDto(
                d,
                d.ToString("dd/MM"),
                sAmt,
                rAmt,
                sAmt + rAmt));
        }

        // Revenue structure donut (Sales includes CounterSales + LostBook in total or keeps LostBook distinct)
        var structureTotal = totalSettledRevenueToday;
        decimal Pct(long amount) => structureTotal > 0 ? Math.Round(amount * 100m / structureTotal, 1) : 0m;
        var revenueStructure = new OverviewRevenueStructureDto(
            todaySales,
            todayRentFees,
            todayPenalties,
            todayLostBook,
            structureTotal,
            Pct(todaySales),
            Pct(todayRentFees),
            Pct(todayPenalties),
            Pct(todayLostBook));

        // Top 10 rented titles in targetDate's month up to targetDate
        var monthStartVn = new DateOnly(targetDate.Year, targetDate.Month, 1);
        var (monthStartUtc, _) = VietnamTimeHelper.GetDayRangeUtc(monthStartVn);
        var topRentedRaw = await (from rl in dbContext.RentalLines.AsNoTracking()
                                  join slip in dbContext.RentalSlips.AsNoTracking() on rl.SlipId equals slip.Id
                                  join copy in dbContext.BookCopies.AsNoTracking() on rl.CopyId equals copy.Id
                                  join edition in dbContext.Editions.AsNoTracking() on copy.EditionId equals edition.Id
                                  join title in dbContext.Titles.AsNoTracking() on edition.TitleId equals title.Id
                                  where slip.Status != RentalSlipStatus.DRAFT &&
                                        slip.Status != RentalSlipStatus.CANCELLED &&
                                        rl.Status != RentalLineStatus.CANCELLED
                                  let activeAt = slip.ActivatedAt ?? slip.CreatedAt
                                  where activeAt >= monthStartUtc && activeAt < dayEndUtc
                                  select new
                                  {
                                      TitleId = title.Id,
                                      title.Name,
                                      title.VolumeLabel
                                  }).ToListAsync(cancellationToken);

        var topRentedTitles = topRentedRaw
            .GroupBy(x => new { x.TitleId, x.Name, x.VolumeLabel })
            .Select(g => new TopRentedTitleDto(
                g.Key.TitleId,
                g.Key.Name,
                g.Key.VolumeLabel,
                string.IsNullOrWhiteSpace(g.Key.VolumeLabel) ? g.Key.Name : $"{g.Key.Name} · {g.Key.VolumeLabel}",
                g.Count()))
            .OrderByDescending(x => x.RentalCount)
            .ThenBy(x => x.DisplayName)
            .Take(10)
            .ToList();

        // Low stock alerts (BR-INV-006: BOTH counts toward both sale and rental)
        var monitoredEditions = await (from e in dbContext.Editions.AsNoTracking()
                                       join t in dbContext.Titles.AsNoTracking() on e.TitleId equals t.Id
                                       where e.IsActive && t.IsActive && (e.MinStockSale > 0 || e.MinStockRental > 0)
                                       select new
                                       {
                                           EditionId = e.Id,
                                           TitleId = t.Id,
                                           t.Name,
                                           t.VolumeLabel,
                                           e.MinStockSale,
                                           e.MinStockRental
                                       }).ToListAsync(cancellationToken);

        var monitoredEditionIds = monitoredEditions.Select(x => x.EditionId).ToList();
        var availableCopies = monitoredEditionIds.Count == 0
            ? []
            : await dbContext.BookCopies.AsNoTracking()
                .Where(c => monitoredEditionIds.Contains(c.EditionId) && c.Status == BookCopyStatus.AVAILABLE)
                .Select(c => new { c.EditionId, c.Availability })
                .ToListAsync(cancellationToken);

        var copiesByEdition = availableCopies
            .GroupBy(x => x.EditionId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var lowStockAlerts = new List<LowStockAlertRowDto>();
        var outOfStockEditionCount = 0;

        foreach (var ed in monitoredEditions)
        {
            var list = copiesByEdition.GetValueOrDefault(ed.EditionId);
            var bothCount = list?.Count(x => x.Availability == BookChannelAvailability.BOTH) ?? 0;
            var saleOnlyCount = list?.Count(x => x.Availability == BookChannelAvailability.SALE_ONLY) ?? 0;
            var rentalOnlyCount = list?.Count(x => x.Availability == BookChannelAvailability.RENTAL_ONLY) ?? 0;

            var saleAvail = bothCount + saleOnlyCount;
            var rentalAvail = bothCount + rentalOnlyCount;
            var totalAvail = list?.Count ?? 0;

            var deficitSale = ed.MinStockSale > 0 ? Math.Max(0, ed.MinStockSale - saleAvail) : 0;
            var deficitRental = ed.MinStockRental > 0 ? Math.Max(0, ed.MinStockRental - rentalAvail) : 0;

            if (deficitSale > 0 || deficitRental > 0)
            {
                if (totalAvail == 0)
                {
                    outOfStockEditionCount++;
                }

                var displayTitle = string.IsNullOrWhiteSpace(ed.VolumeLabel)
                    ? ed.Name
                    : $"{ed.Name} · {ed.VolumeLabel}";

                lowStockAlerts.Add(new LowStockAlertRowDto(
                    ed.EditionId,
                    ed.TitleId,
                    displayTitle,
                    saleAvail,
                    ed.MinStockSale,
                    rentalAvail,
                    ed.MinStockRental,
                    totalAvail,
                    Math.Max(ed.MinStockSale, ed.MinStockRental),
                    Math.Max(deficitSale, deficitRental)));
            }
        }

        lowStockAlerts = lowStockAlerts
            .OrderBy(x => x.TotalAvailable)
            .ThenByDescending(x => x.SuggestedReplenishQty)
            .ToList();

        var pendingReceiptCount = await dbContext.BookCopies.AsNoTracking()
            .CountAsync(c => c.Status == BookCopyStatus.PENDING_RECEIPT, cancellationToken);

        var attention = new OverviewAttentionDto(
            overdueGroups.Count,
            overdueCustomers.Select(x => x.CustomerId).Distinct().Count(),
            lowStockAlerts.Count,
            outOfStockEditionCount,
            pendingReceiptCount,
            qrAttentionCount,
            VietQrTargetPct);

        return new OverviewReportResponse(
            targetDate,
            utcNow,
            normalizedRange,
            isCashierScoped,
            DefaultStoreScopeLabel,
            totalSettledRevenueToday,
            todaySales,
            todayRentalTotal,
            cashDrawerBalance,
            openSessions.Count,
            heldDepositsBalance,
            circulatingSlips,
            overdueGroups.Count,
            qrRate,
            qrSucceeded,
            qrTotal,
            trendPoints.Sum(p => p.TotalAmount),
            trendPoints,
            revenueStructure,
            topRentedTitles,
            attention,
            lowStockAlerts,
            overdueCustomers);
    }

    // =========================================================================
    // SCR-REP-02: Multi-source Revenue & Expense Report
    // =========================================================================

    public async Task<RevenueExpenseReportResponse> GetRevenueExpenseAsync(
        RevenueExpenseQuery query,
        CancellationToken cancellationToken = default)
    {
        var (fromVn, toVn) = ResolvePeriod(query.From, query.To);
        var dataset = await LoadRevenueExpenseDatasetAsync(fromVn, toVn, query.Method, cancellationToken);

        var sourceFilter = string.IsNullOrWhiteSpace(query.Source) || query.Source.Equals("ALL", StringComparison.OrdinalIgnoreCase)
            ? null
            : query.Source.Trim().ToUpperInvariant();
        var search = string.IsNullOrWhiteSpace(query.Search) ? null : query.Search.Trim().ToLowerInvariant();

        var totalRevenue = dataset.RevenueBreakdown.CounterSales +
                           dataset.RevenueBreakdown.LostBookRetained +
                           dataset.RevenueBreakdown.SettledRentFees +
                           dataset.RevenueBreakdown.SettledExtensionFees +
                           dataset.RevenueBreakdown.SettledPenalties;

        var totalExpense = dataset.ExpenseBreakdown.CustomerBuyback +
                           dataset.ExpenseBreakdown.SupplierImport +
                           dataset.ExpenseBreakdown.ApprovedPayroll;

        var filteredSources = dataset.SourceRows.Where(row =>
        {
            if (sourceFilter != null && !row.SourceKey.Equals(sourceFilter, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (search != null)
            {
                var matchesRow = row.SourceLabel.ToLowerInvariant().Contains(search) ||
                                 row.CodePattern.ToLowerInvariant().Contains(search) ||
                                 row.SourceKey.ToLowerInvariant().Contains(search);
                var matchesDoc = dataset.Documents.Any(d =>
                    d.SourceKey == row.SourceKey &&
                    (d.DocumentCode.ToLowerInvariant().Contains(search) ||
                     d.CounterpartyName.ToLowerInvariant().Contains(search)));
                return matchesRow || matchesDoc;
            }

            return true;
        }).ToList();

        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var pagedSources = filteredSources.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return new RevenueExpenseReportResponse(
            fromVn,
            toVn,
            DefaultStoreScopeLabel,
            totalRevenue,
            totalExpense,
            totalRevenue - totalExpense,
            dataset.RevenueBreakdown,
            dataset.ExpenseBreakdown,
            dataset.TrendBuckets,
            new PagedResult<RevenueExpenseSourceRowDto>(pagedSources, filteredSources.Count, page, pageSize));
    }

    public async Task<PagedResult<RevenueExpenseDocumentRowDto>> GetRevenueExpenseDocumentsAsync(
        RevenueExpenseQuery query,
        CancellationToken cancellationToken = default)
    {
        var (fromVn, toVn) = ResolvePeriod(query.From, query.To);
        var dataset = await LoadRevenueExpenseDatasetAsync(fromVn, toVn, query.Method, cancellationToken);

        var sourceFilter = string.IsNullOrWhiteSpace(query.Source) || query.Source.Equals("ALL", StringComparison.OrdinalIgnoreCase)
            ? null
            : query.Source.Trim().ToUpperInvariant();
        var search = string.IsNullOrWhiteSpace(query.Search) ? null : query.Search.Trim().ToLowerInvariant();

        var filtered = dataset.Documents
            .Where(d => sourceFilter == null || d.SourceKey.Equals(sourceFilter, StringComparison.OrdinalIgnoreCase))
            .Where(d => search == null ||
                        d.DocumentCode.ToLowerInvariant().Contains(search) ||
                        d.CounterpartyName.ToLowerInvariant().Contains(search) ||
                        d.SourceLabel.ToLowerInvariant().Contains(search))
            .OrderByDescending(d => d.OccurredAt)
            .ToList();

        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var items = filtered.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return new PagedResult<RevenueExpenseDocumentRowDto>(items, filtered.Count, page, pageSize);
    }

    // =========================================================================
    // SCR-REP-03: Deposit Reconciliation Report
    // =========================================================================

    public async Task<DepositReconciliationReportResponse> GetDepositReconciliationAsync(
        DepositReconciliationQuery query,
        CancellationToken cancellationToken = default)
    {
        var utcNow = timeProvider.GetUtcNow().UtcDateTime;
        var (fromVn, toVn) = ResolvePeriod(query.From, query.To);
        var (utcStart, utcEnd) = VietnamTimeHelper.GetDateRangeUtc(fromVn, toVn);
        var referenceNowUtc = utcEnd < utcNow ? utcEnd : utcNow;

        var lines = await (from rl in dbContext.RentalLines.AsNoTracking()
                           join slip in dbContext.RentalSlips.AsNoTracking() on rl.SlipId equals slip.Id
                           join cust in dbContext.Customers.AsNoTracking() on slip.CustomerId equals cust.Id
                           join ret in dbContext.Returns.AsNoTracking() on rl.ReturnId equals ret.Id into returns
                           from ret in returns.DefaultIfEmpty()
                           where slip.Status != RentalSlipStatus.DRAFT &&
                                 slip.Status != RentalSlipStatus.CANCELLED &&
                                 rl.Status != RentalLineStatus.CANCELLED
                           select new
                           {
                               LineId = rl.Id,
                               SlipId = slip.Id,
                               slip.SlipNo,
                               CustomerId = cust.Id,
                               CustomerName = cust.FullName,
                               CustomerPhone = cust.Phone,
                               ActivatedAt = slip.ActivatedAt ?? slip.CreatedAt,
                               rl.DepositAmount,
                               rl.DueAt,
                               rl.Status,
                               rl.ChargedRentFee,
                               rl.ChargedExtensionFee,
                               rl.ChargedLatePenalty,
                               rl.ChargedDamagePenalty,
                               rl.LostRetainedAmount,
                               rl.RefundAmount,
                               IsSettled = ret != null && ret.Status == ReturnStatus.SETTLED,
                               SettledAt = ret != null && ret.Status == ReturnStatus.SETTLED
                                   ? (DateTime?)(ret.SettledAt ?? ret.ReturnedAt)
                                   : null
                           }).ToListAsync(cancellationToken);

        long opening = 0;
        long collected = 0;
        long refunded = 0;
        long deductedFee = 0;
        long lostRetained = 0;

        var closingActiveSlipIds = new HashSet<Guid>();
        var closingHeldBySlip = new Dictionary<Guid, long>();

        foreach (var line in lines)
        {
            var settledBeforeStart = line.IsSettled && line.SettledAt.HasValue && line.SettledAt.Value < utcStart;
            if (line.ActivatedAt < utcStart && !settledBeforeStart)
            {
                opening += line.DepositAmount;
            }

            if (line.ActivatedAt >= utcStart && line.ActivatedAt < utcEnd)
            {
                collected += line.DepositAmount;
            }

            var settledInPeriod = line.IsSettled && line.SettledAt.HasValue &&
                                  line.SettledAt.Value >= utcStart && line.SettledAt.Value < utcEnd;
            if (settledInPeriod)
            {
                refunded += line.RefundAmount;
                lostRetained += line.LostRetainedAmount;
                var lineDeducted = Math.Max(0L, line.DepositAmount - line.RefundAmount - line.LostRetainedAmount);
                deductedFee += lineDeducted;
            }

            var settledBeforeEnd = line.IsSettled && line.SettledAt.HasValue && line.SettledAt.Value < utcEnd;
            if (line.ActivatedAt < utcEnd && !settledBeforeEnd)
            {
                closingActiveSlipIds.Add(line.SlipId);
                closingHeldBySlip[line.SlipId] = closingHeldBySlip.GetValueOrDefault(line.SlipId) + line.DepositAmount;
            }
        }

        var deductedAndLostTotal = deductedFee + lostRetained;
        var closing = opening + collected - refunded - deductedAndLostTotal;

        // Channel breakdown for closing held slips
        long cashObligation = 0;
        long bankObligation = 0;

        if (closingActiveSlipIds.Count > 0)
        {
            var slipList = closingActiveSlipIds.ToList();
            var depositPayments = await dbContext.Payments.AsNoTracking()
                .Where(p => p.RentalSlipId.HasValue &&
                            slipList.Contains(p.RentalSlipId.Value) &&
                            p.PaymentType == PaymentType.RENTAL_DEPOSIT &&
                            p.Status == PaymentStatus.SUCCEEDED)
                .Select(p => new { SlipId = p.RentalSlipId!.Value, p.Method, p.Amount })
                .ToListAsync(cancellationToken);

            var paymentsBySlip = depositPayments
                .GroupBy(p => p.SlipId)
                .ToDictionary(g => g.Key, g => g.ToList());

            foreach (var (slipId, heldAmount) in closingHeldBySlip)
            {
                if (!paymentsBySlip.TryGetValue(slipId, out var payList) || payList.Count == 0)
                {
                    cashObligation += heldAmount;
                    continue;
                }

                var totalPaid = payList.Sum(p => p.Amount);
                if (totalPaid <= 0)
                {
                    cashObligation += heldAmount;
                    continue;
                }

                var bankPaid = payList.Where(p => p.Method == PaymentMethod.BANK_TRANSFER).Sum(p => p.Amount);
                if (bankPaid == 0)
                {
                    cashObligation += heldAmount;
                }
                else if (bankPaid >= totalPaid)
                {
                    bankObligation += heldAmount;
                }
                else
                {
                    var bankShare = (long)Math.Round(heldAmount * (decimal)bankPaid / totalPaid, MidpointRounding.AwayFromZero);
                    bankObligation += bankShare;
                    cashObligation += heldAmount - bankShare;
                }
            }
        }

        // Suggested cash actual balance from active cash session (or latest closed session)
        long suggestedCashBalance = 0;
        var openCashSessions = await dbContext.CashSessions.AsNoTracking()
            .Where(s => s.Status != CashSessionStatus.CLOSED)
            .Select(s => new { s.Id, s.OpeningBalance })
            .ToListAsync(cancellationToken);

        if (openCashSessions.Count > 0)
        {
            var openIds = openCashSessions.Select(s => s.Id).ToList();
            var sessionCashMoves = await dbContext.Payments.AsNoTracking()
                .Where(p => p.CashSessionId.HasValue &&
                            openIds.Contains(p.CashSessionId.Value) &&
                            p.Status == PaymentStatus.SUCCEEDED &&
                            p.Method == PaymentMethod.CASH)
                .Select(p => new { p.Direction, p.Amount })
                .ToListAsync(cancellationToken);
            suggestedCashBalance = openCashSessions.Sum(s => s.OpeningBalance) +
                sessionCashMoves.Sum(p => p.Direction == PaymentDirection.IN ? p.Amount : -p.Amount);
        }
        else
        {
            var latestClosed = await dbContext.CashSessions.AsNoTracking()
                .OrderByDescending(s => s.ClosedAt ?? s.OpenedAt)
                .Select(s => new { s.ClosingCounted, s.ClosingExpected })
                .FirstOrDefaultAsync(cancellationToken);
            suggestedCashBalance = latestClosed?.ClosingCounted ?? latestClosed?.ClosingExpected ?? 0;
        }

        // Group slips visible in this period (held at any moment in period or still active at end)
        var slipRows = lines
            .Where(l => l.ActivatedAt < utcEnd && (!l.IsSettled || !l.SettledAt.HasValue || l.SettledAt.Value >= utcStart))
            .GroupBy(l => new { l.SlipId, l.SlipNo, l.CustomerId, l.CustomerName, l.CustomerPhone })
            .Select(g =>
            {
                var depositCollected = g.Sum(x => x.DepositAmount);
                var settledLines = g.Where(x => x.IsSettled && x.SettledAt.HasValue && x.SettledAt.Value < utcEnd).ToList();
                var settledLost = settledLines.Sum(x => x.LostRetainedAmount);
                var refundedAmt = settledLines.Sum(x => x.RefundAmount);
                var settledDeductedFromDeposit = settledLines.Sum(x => Math.Max(0L, x.DepositAmount - x.RefundAmount - x.LostRetainedAmount));
                var totalCharged = settledLines.Sum(x => x.ChargedRentFee + x.ChargedExtensionFee + x.ChargedLatePenalty + x.ChargedDamagePenalty);
                var unsettledDeposit = g.Where(x => !x.IsSettled || !x.SettledAt.HasValue || x.SettledAt.Value >= utcEnd).Sum(x => x.DepositAmount);
                var earliestDue = g.Where(x => !x.IsSettled).Select(x => (DateTime?)x.DueAt).Min() ?? g.Max(x => x.DueAt);

                string statusCode;
                string statusLabel;
                if (unsettledDeposit > 0)
                {
                    var isOverdue = g.Any(x => !x.IsSettled && x.DueAt < referenceNowUtc);
                    statusCode = isOverdue ? "OVERDUE" : "RENTING";
                    statusLabel = isOverdue ? "Quá hạn" : "Đang thuê";
                }
                else if (settledLost > 0)
                {
                    statusCode = "LOST";
                    statusLabel = "Mất → Bán";
                }
                else if (totalCharged > depositCollected - settledLost && refundedAmt == 0)
                {
                    statusCode = "CAPPED";
                    statusLabel = "Chạm trần cọc";
                }
                else
                {
                    statusCode = "SETTLED";
                    statusLabel = "Đã quyết toán";
                }

                return new DepositReconciliationSlipRowDto(
                    g.Key.SlipId,
                    g.Key.SlipNo,
                    g.Key.CustomerId,
                    g.Key.CustomerName,
                    g.Key.CustomerPhone,
                    depositCollected,
                    settledDeductedFromDeposit + settledLost,
                    refundedAmt,
                    unsettledDeposit,
                    statusCode,
                    statusLabel,
                    earliestDue);
            })
            .ToList();

        var statusFilter = string.IsNullOrWhiteSpace(query.Status) || query.Status.Equals("ALL", StringComparison.OrdinalIgnoreCase)
            ? null
            : query.Status.Trim().ToUpperInvariant();
        var search = string.IsNullOrWhiteSpace(query.Search) ? null : query.Search.Trim().ToLowerInvariant();

        var filteredSlips = slipRows
            .Where(s => statusFilter == null || s.StatusCode == statusFilter)
            .Where(s => search == null ||
                        s.SlipNo.ToLowerInvariant().Contains(search) ||
                        s.CustomerName.ToLowerInvariant().Contains(search) ||
                        s.CustomerPhone.ToLowerInvariant().Contains(search))
            .OrderByDescending(s => s.CurrentlyHeld)
            .ThenBy(s => s.DueAt)
            .ToList();

        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var pagedSlips = filteredSlips.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        string? alertBanner = null;
        if (cashObligation > 0 && suggestedCashBalance < cashObligation)
        {
            alertBanner = $"Số dư két hiện tại ({suggestedCashBalance:N0}đ) đang thấp hơn nghĩa vụ cọc tiền mặt ({cashObligation:N0}đ) — kiểm tra phiếu hoàn cọc hoặc nộp quỹ trước khi chốt đối soát.";
        }

        return new DepositReconciliationReportResponse(
            fromVn,
            toVn,
            opening,
            collected,
            refunded,
            deductedFee,
            lostRetained,
            deductedAndLostTotal,
            closing,
            closingActiveSlipIds.Count,
            cashObligation,
            bankObligation,
            suggestedCashBalance,
            alertBanner,
            new PagedResult<DepositReconciliationSlipRowDto>(pagedSlips, filteredSlips.Count, page, pageSize));
    }

    // =========================================================================
    // SCR-REP-04: Automatic Tax Declaration Report
    // =========================================================================

    public async Task<TaxDeclarationReportResponse> GetTaxDeclarationAsync(
        TaxDeclarationQuery query,
        CancellationToken cancellationToken = default)
    {
        var utcNow = timeProvider.GetUtcNow().UtcDateTime;
        var todayVn = VietnamTimeHelper.TodayVietnam(utcNow);

        var periodType = string.Equals(query.PeriodType, "QUARTER", StringComparison.OrdinalIgnoreCase)
            ? "QUARTER"
            : "MONTH";
        var year = query.Year ?? todayVn.Year;
        if (year < 2000 || year > 2100)
        {
            throw new BadRequestException("Năm kê khai không hợp lệ.");
        }

        int periodValue;
        DateOnly fromVn;
        DateOnly toVn;
        string periodLabel;

        if (periodType == "QUARTER")
        {
            periodValue = query.PeriodValue ?? ((todayVn.Month - 1) / 3 + 1);
            if (periodValue < 1 || periodValue > 4)
            {
                throw new BadRequestException("Quý kê khai phải nằm trong khoảng 1 đến 4.");
            }

            (_, _, fromVn, toVn) = VietnamTimeHelper.GetQuarterRangeUtc(year, periodValue);
            periodLabel = $"Quý {periodValue}/{year}";
        }
        else
        {
            periodValue = query.PeriodValue ?? todayVn.Month;
            if (periodValue < 1 || periodValue > 12)
            {
                throw new BadRequestException("Tháng kê khai phải nằm trong khoảng 1 đến 12.");
            }

            (_, _, fromVn, toVn) = VietnamTimeHelper.GetMonthRangeUtc(year, periodValue);
            periodLabel = $"Tháng {periodValue:D2}/{year}";
        }

        var dataset = await LoadRevenueExpenseDatasetAsync(fromVn, toVn, methodFilter: null, cancellationToken);

        var yearMonthPrefix = periodType == "MONTH" ? $"{year}{periodValue:D2}" : $"{year}Q{periodValue}";
        var payrollDocCount = dataset.Documents.Count(d => d.SourceKey == "PAYROLL");

        var revenueItems = new List<TaxRevenueItemDto>
        {
            new("SALE", "Bán sách cũ tại quầy", "Hóa đơn bán thành công trong kỳ",
                $"{dataset.Counts.GetValueOrDefault("SALE")} HĐ · HD-{yearMonthPrefix}-*",
                dataset.Counts.GetValueOrDefault("SALE"), dataset.RevenueBreakdown.CounterSales),
            new("LOST_BOOK", "Cọc bị giữ do mất sách", "Chuyển thành doanh thu bán, không tính phí thuê / trễ cho cuốn mất",
                $"{dataset.Counts.GetValueOrDefault("LOST_BOOK")} bản · RENT-{yearMonthPrefix}-*",
                dataset.Counts.GetValueOrDefault("LOST_BOOK"), dataset.RevenueBreakdown.LostBookRetained),
            new("RENTAL_FEE", "Dịch vụ cho thuê sách", "Phí thuê tại thời điểm trả và quyết toán",
                $"{dataset.Counts.GetValueOrDefault("RENTAL_FEE")} phiếu · SET-{yearMonthPrefix}-*",
                dataset.Counts.GetValueOrDefault("RENTAL_FEE"), dataset.RevenueBreakdown.SettledRentFees),
            new("EXTENSION", "Phí gia hạn", "Cộng dồn, chỉ thu tại quyết toán trả",
                $"{dataset.Counts.GetValueOrDefault("EXTENSION")} lượt · EXT-{yearMonthPrefix}-*",
                dataset.Counts.GetValueOrDefault("EXTENSION"), dataset.RevenueBreakdown.SettledExtensionFees),
            new("PENALTY", "Phạt trễ hạn / Hư hỏng", "Đã quyết toán; ngoài khung phải được duyệt",
                $"{dataset.Counts.GetValueOrDefault("PENALTY")} lượt · FINE-{yearMonthPrefix}-*",
                dataset.Counts.GetValueOrDefault("PENALTY"), dataset.RevenueBreakdown.SettledPenalties)
        };

        var buybackVerified = await CheckBuybackEvidenceAsync(fromVn, toVn, cancellationToken);
        var supplierVerified = await CheckSupplierEvidenceAsync(fromVn, toVn, cancellationToken);
        var payrollVerified = payrollDocCount >= 0;

        var expenseItems = new List<TaxExpenseItemDto>
        {
            new("BUYBACK", "Thu mua từ cá nhân", "Họ tên + SĐT người bán, phiếu thu mua hoàn tất",
                $"{dataset.Counts.GetValueOrDefault("BUYBACK")} phiếu · BUY-{yearMonthPrefix}-*",
                dataset.Counts.GetValueOrDefault("BUYBACK"), dataset.ExpenseBreakdown.CustomerBuyback, buybackVerified),
            new("SUPPLIER_IMPORT", "Nhập sỉ NCC / NXB", "Nhà cung cấp hợp lệ và Phiếu nhập hoàn tất",
                $"{dataset.Counts.GetValueOrDefault("SUPPLIER_IMPORT")} phiếu · INB-{yearMonthPrefix}-*",
                dataset.Counts.GetValueOrDefault("SUPPLIER_IMPORT"), dataset.ExpenseBreakdown.SupplierImport, supplierVerified),
            new("PAYROLL", "Lương nhân viên đã duyệt", "Bảng công đã duyệt + Đã chi trả / phê duyệt",
                $"PAY-{dataset.ExpenseBreakdown.PayrollPeriodCode} · {payrollDocCount} bản ghi công",
                payrollDocCount, dataset.ExpenseBreakdown.ApprovedPayroll, payrollVerified)
        };

        // Deposit exclusions (Section C) using exact period bridge
        var depositReport = await GetDepositReconciliationAsync(
            new DepositReconciliationQuery(fromVn, toVn, Page: 1, PageSize: 1),
            cancellationToken);

        var nextPeriodStart = toVn.AddDays(1);
        var excludedItems = new List<TaxExcludedItemDto>
        {
            new("DEPOSIT_COLLECTED", "Tiền cọc khách nộp khi thuê", depositReport.CollectedInPeriod,
                "Nợ phải trả; không phải doanh thu"),
            new("DEPOSIT_REFUNDED", "Tiền hoàn cọc khi trả sách", depositReport.RefundedInPeriod,
                "Giảm nghĩa vụ cọc; không phải chi phí"),
            new("DEPOSIT_CLOSING", $"Cọc cuối kỳ ({periodLabel})", depositReport.ClosingDepositBalance,
                $"Chuyển số dư đầu kỳ ngày {nextPeriodStart:dd/MM/yyyy}, không chịu thuế")
        };

        var totalTaxableRevenue = revenueItems.Sum(x => x.Amount);
        var totalEligibleExpense = expenseItems.Sum(x => x.Amount);

        return new TaxDeclarationReportResponse(
            periodType,
            year,
            periodValue,
            fromVn,
            toVn,
            periodLabel,
            DefaultStoreScopeLabel,
            utcNow,
            totalTaxableRevenue,
            totalEligibleExpense,
            totalTaxableRevenue - totalEligibleExpense,
            buybackVerified && supplierVerified && payrollVerified,
            revenueItems,
            expenseItems,
            excludedItems);
    }

    // =========================================================================
    // Internal Shared Dataset & Helpers
    // =========================================================================

    private sealed record RevenueExpenseDataset(
        RevenueBreakdownDto RevenueBreakdown,
        ExpenseBreakdownDto ExpenseBreakdown,
        IReadOnlyList<RevenueExpenseTrendBucketDto> TrendBuckets,
        IReadOnlyList<RevenueExpenseSourceRowDto> SourceRows,
        IReadOnlyList<RevenueExpenseDocumentRowDto> Documents,
        Dictionary<string, int> Counts);

    private async Task<RevenueExpenseDataset> LoadRevenueExpenseDatasetAsync(
        DateOnly fromVn,
        DateOnly toVn,
        PaymentMethod? methodFilter,
        CancellationToken cancellationToken)
    {
        var (utcStart, utcEnd) = VietnamTimeHelper.GetDateRangeUtc(fromVn, toVn);
        var periodTag = fromVn.ToString("yyyyMM");

        // 1. Sales invoices (PAID + ACTIVE lines)
        var paidSalesRaw = await (from sl in dbContext.SaleInvoiceLines.AsNoTracking()
                                  where sl.Status == SaleInvoiceLineStatus.ACTIVE
                                  join inv in dbContext.SaleInvoices.AsNoTracking() on sl.InvoiceId equals inv.Id
                                  where inv.Status == SaleInvoiceStatus.PAID
                                  let effectiveAt = inv.PaidAt ?? inv.CreatedAt
                                  where effectiveAt >= utcStart && effectiveAt < utcEnd
                                  join cust in dbContext.Customers.AsNoTracking() on inv.CustomerId equals cust.Id into cg
                                  from cust in cg.DefaultIfEmpty()
                                  select new
                                  {
                                      InvoiceId = inv.Id,
                                      inv.InvoiceNo,
                                      EffectiveAt = effectiveAt,
                                      CustomerName = cust != null ? cust.FullName : "Khách lẻ",
                                      sl.FinalPrice
                                  }).ToListAsync(cancellationToken);

        var saleInvoiceIds = paidSalesRaw.Select(x => x.InvoiceId).Distinct().ToList();
        var salePayments = saleInvoiceIds.Count == 0
            ? new Dictionary<Guid, List<PaymentMethod>>()
            : (await dbContext.Payments.AsNoTracking()
                .Where(p => p.SaleInvoiceId.HasValue && saleInvoiceIds.Contains(p.SaleInvoiceId.Value) && p.Status == PaymentStatus.SUCCEEDED)
                .Select(p => new { Id = p.SaleInvoiceId!.Value, p.Method })
                .ToListAsync(cancellationToken))
                .GroupBy(x => x.Id)
                .ToDictionary(g => g.Key, g => g.Select(x => x.Method).Distinct().ToList());

        var paidSaleInvoices = paidSalesRaw
            .GroupBy(x => new { x.InvoiceId, x.InvoiceNo, x.EffectiveAt, x.CustomerName })
            .Select(g =>
            {
                var methods = salePayments.GetValueOrDefault(g.Key.InvoiceId);
                return new
                {
                    g.Key.InvoiceId,
                    Code = g.Key.InvoiceNo ?? $"HD-{g.Key.InvoiceId.ToString("N")[..6].ToUpperInvariant()}",
                    g.Key.EffectiveAt,
                    g.Key.CustomerName,
                    Amount = g.Sum(x => x.FinalPrice),
                    Methods = methods is { Count: > 0 } ? methods : [PaymentMethod.CASH]
                };
            })
            .Where(x => !methodFilter.HasValue || x.Methods.Contains(methodFilter.Value))
            .ToList();

        // 2. Settled RentalLines (Lost, RentFee, Extension, Penalty)
        var settledLinesRaw = await (from rl in dbContext.RentalLines.AsNoTracking()
                                     join ret in dbContext.Returns.AsNoTracking() on rl.ReturnId equals ret.Id
                                     join slip in dbContext.RentalSlips.AsNoTracking() on rl.SlipId equals slip.Id
                                     join cust in dbContext.Customers.AsNoTracking() on slip.CustomerId equals cust.Id
                                     where ret.Status == ReturnStatus.SETTLED
                                     let effectiveAt = ret.SettledAt ?? ret.ReturnedAt
                                     where effectiveAt >= utcStart && effectiveAt < utcEnd
                                     select new
                                     {
                                         ReturnId = ret.Id,
                                         ret.ReturnNo,
                                         SlipId = slip.Id,
                                         slip.SlipNo,
                                         EffectiveAt = effectiveAt,
                                         CustomerName = cust.FullName,
                                         rl.ChargedRentFee,
                                         rl.ChargedExtensionFee,
                                         rl.ChargedLatePenalty,
                                         rl.ChargedDamagePenalty,
                                         rl.LostRetainedAmount
                                     }).ToListAsync(cancellationToken);

        var slipIds = settledLinesRaw.Select(x => x.SlipId).Distinct().ToList();
        var rentalPaymentsBySlip = slipIds.Count == 0
            ? new Dictionary<Guid, List<PaymentMethod>>()
            : (await dbContext.Payments.AsNoTracking()
                .Where(p => p.RentalSlipId.HasValue && slipIds.Contains(p.RentalSlipId.Value) && p.Status == PaymentStatus.SUCCEEDED)
                .Select(p => new { Id = p.RentalSlipId!.Value, p.Method })
                .ToListAsync(cancellationToken))
                .GroupBy(x => x.Id)
                .ToDictionary(g => g.Key, g => g.Select(x => x.Method).Distinct().ToList());

        var settledLines = settledLinesRaw
            .Select(x =>
            {
                var methods = rentalPaymentsBySlip.GetValueOrDefault(x.SlipId);
                return new
                {
                    x.ReturnId,
                    x.ReturnNo,
                    x.SlipId,
                    x.SlipNo,
                    x.EffectiveAt,
                    x.CustomerName,
                    x.ChargedRentFee,
                    x.ChargedExtensionFee,
                    x.ChargedLatePenalty,
                    x.ChargedDamagePenalty,
                    x.LostRetainedAmount,
                    Methods = methods is { Count: > 0 } ? methods : [PaymentMethod.CASH]
                };
            })
            .Where(x => !methodFilter.HasValue || x.Methods.Contains(methodFilter.Value))
            .ToList();

        // 3. Stock receipts (COMPLETED BUYBACK & SUPPLIER)
        var receiptsRaw = await (from r in dbContext.StockReceipts.AsNoTracking()
                                 where r.Status == ApprovalStatus.COMPLETED
                                 let effectiveAt = r.CompletedAt ?? r.ApprovedAt ?? r.CreatedAt
                                 where effectiveAt >= utcStart && effectiveAt < utcEnd
                                 join sup in dbContext.Suppliers.AsNoTracking() on r.SupplierId equals sup.Id into supG
                                 from sup in supG.DefaultIfEmpty()
                                 join sel in dbContext.Customers.AsNoTracking() on r.SellerId equals sel.Id into selG
                                 from sel in selG.DefaultIfEmpty()
                                 select new
                                 {
                                     r.Id,
                                     r.Code,
                                     r.SourceType,
                                     r.TotalAmount,
                                     EffectiveAt = effectiveAt,
                                     CounterpartyName = r.SourceType == StockReceiptSourceType.SUPPLIER
                                         ? (sup != null ? sup.Name : "Nhà cung cấp")
                                         : (sel != null ? sel.FullName : "Khách bán sách cũ")
                                 }).ToListAsync(cancellationToken);

        var receiptIds = receiptsRaw.Select(x => x.Id).ToList();
        var receiptPayments = receiptIds.Count == 0
            ? new Dictionary<Guid, List<PaymentMethod>>()
            : (await dbContext.Payments.AsNoTracking()
                .Where(p => p.StockReceiptId.HasValue && receiptIds.Contains(p.StockReceiptId.Value) && p.Status == PaymentStatus.SUCCEEDED)
                .Select(p => new { Id = p.StockReceiptId!.Value, p.Method })
                .ToListAsync(cancellationToken))
                .GroupBy(x => x.Id)
                .ToDictionary(g => g.Key, g => g.Select(x => x.Method).Distinct().ToList());

        var receipts = receiptsRaw
            .Select(r =>
            {
                var fallbackMethod = r.SourceType == StockReceiptSourceType.SUPPLIER
                    ? PaymentMethod.BANK_TRANSFER
                    : PaymentMethod.CASH;
                var methods = receiptPayments.GetValueOrDefault(r.Id);
                return new
                {
                    r.Id,
                    r.Code,
                    r.SourceType,
                    r.TotalAmount,
                    r.EffectiveAt,
                    r.CounterpartyName,
                    Methods = methods is { Count: > 0 } ? methods : [fallbackMethod]
                };
            })
            .Where(r => !methodFilter.HasValue || r.Methods.Contains(methodFilter.Value))
            .ToList();

        var buybacks = receipts.Where(r => r.SourceType == StockReceiptSourceType.CUSTOMER_BUYBACK).ToList();
        var supplierImports = receipts.Where(r => r.SourceType == StockReceiptSourceType.SUPPLIER).ToList();

        // 4. Approved payroll work records
        var payrollRaw = await (from w in dbContext.EmployeeWorkRecords.AsNoTracking()
                                join emp in dbContext.Employees.AsNoTracking() on w.EmployeeId equals emp.Id
                                where w.WorkDate >= fromVn && w.WorkDate <= toVn &&
                                      (w.ApprovedBy != null || w.PaymentStatus == WorkRecordPaymentStatus.PAID) &&
                                      w.ShiftSalary > 0
                                select new
                                {
                                    w.Id,
                                    w.EmployeeId,
                                    emp.FullName,
                                    w.WorkDate,
                                    w.ShiftSalary,
                                    w.ApprovedAt
                                }).ToListAsync(cancellationToken);

        var workRecordIds = payrollRaw.Select(w => w.Id).ToList();
        var payrollPayments = workRecordIds.Count == 0
            ? new Dictionary<Guid, List<PaymentMethod>>()
            : (await dbContext.Payments.AsNoTracking()
                .Where(p => p.WorkRecordId.HasValue && workRecordIds.Contains(p.WorkRecordId.Value) && p.Status == PaymentStatus.SUCCEEDED)
                .Select(p => new { Id = p.WorkRecordId!.Value, p.Method })
                .ToListAsync(cancellationToken))
                .GroupBy(x => x.Id)
                .ToDictionary(g => g.Key, g => g.Select(x => x.Method).Distinct().ToList());

        var payrollRecords = payrollRaw
            .Select(w =>
            {
                var methods = payrollPayments.GetValueOrDefault(w.Id);
                return new
                {
                    w.Id,
                    w.EmployeeId,
                    w.FullName,
                    w.WorkDate,
                    w.ShiftSalary,
                    OccurredAt = w.ApprovedAt ?? VietnamTimeHelper.GetDayRangeUtc(w.WorkDate).UtcStart,
                    Methods = methods is { Count: > 0 } ? methods : [PaymentMethod.BANK_TRANSFER]
                };
            })
            .Where(w => !methodFilter.HasValue || w.Methods.Contains(methodFilter.Value))
            .ToList();

        // Breakdown sums
        var counterSales = paidSaleInvoices.Sum(x => x.Amount);
        var lostBookRetained = settledLines.Sum(x => x.LostRetainedAmount);
        var settledRentFees = settledLines.Sum(x => x.ChargedRentFee);
        var settledExtensionFees = settledLines.Sum(x => x.ChargedExtensionFee);
        var settledPenalties = settledLines.Sum(x => x.ChargedLatePenalty + x.ChargedDamagePenalty);

        var buybackTotal = buybacks.Sum(x => x.TotalAmount);
        var supplierTotal = supplierImports.Sum(x => x.TotalAmount);
        var payrollTotal = payrollRecords.Sum(x => x.ShiftSalary);

        var revenueBreakdown = new RevenueBreakdownDto(
            counterSales,
            lostBookRetained,
            settledRentFees,
            settledExtensionFees,
            settledPenalties);

        var expenseBreakdown = new ExpenseBreakdownDto(
            buybackTotal,
            supplierTotal,
            payrollTotal,
            periodTag);

        // Build individual drill-down documents + daily aggregation for trend buckets
        var documents = new List<RevenueExpenseDocumentRowDto>();
        var revenueByVnDay = new Dictionary<DateOnly, long>();
        var expenseByVnDay = new Dictionary<DateOnly, long>();

        void AddRevDay(DateTime utcAt, long amt)
        {
            if (amt == 0) return;
            var d = VietnamTimeHelper.TodayVietnam(utcAt);
            revenueByVnDay[d] = revenueByVnDay.GetValueOrDefault(d) + amt;
        }

        void AddExpDay(DateOnly d, long amt)
        {
            if (amt == 0) return;
            expenseByVnDay[d] = expenseByVnDay.GetValueOrDefault(d) + amt;
        }

        string FormatMethods(IReadOnlyList<PaymentMethod> methods)
            => string.Join(" / ", methods.Select(m => m == PaymentMethod.BANK_TRANSFER ? "VietQR / CK" : "Tiền mặt"));

        foreach (var inv in paidSaleInvoices)
        {
            AddRevDay(inv.EffectiveAt, inv.Amount);
            documents.Add(new RevenueExpenseDocumentRowDto(
                inv.InvoiceId, inv.Code, inv.EffectiveAt,
                "SALE", "Bán sách tại quầy", inv.CustomerName,
                inv.Amount, FormatMethods(inv.Methods), "Đã hoàn tất"));
        }

        var lostCount = 0;
        var rentSlipIds = new HashSet<Guid>();
        var extCount = 0;
        var fineCount = 0;

        foreach (var line in settledLines)
        {
            if (line.LostRetainedAmount > 0)
            {
                lostCount++;
                AddRevDay(line.EffectiveAt, line.LostRetainedAmount);
                documents.Add(new RevenueExpenseDocumentRowDto(
                    line.ReturnId, line.SlipNo, line.EffectiveAt,
                    "LOST_BOOK", "Mất sách → Doanh thu bán", line.CustomerName,
                    line.LostRetainedAmount, "Khấu trừ cọc", "Đã quyết toán"));
            }

            if (line.ChargedRentFee > 0)
            {
                rentSlipIds.Add(line.ReturnId);
                AddRevDay(line.EffectiveAt, line.ChargedRentFee);
                documents.Add(new RevenueExpenseDocumentRowDto(
                    line.ReturnId, line.ReturnNo, line.EffectiveAt,
                    "RENTAL_FEE", "Thuê sách đã quyết toán", line.CustomerName,
                    line.ChargedRentFee, "Khấu trừ cọc", "Đã quyết toán"));
            }

            if (line.ChargedExtensionFee > 0)
            {
                extCount++;
                AddRevDay(line.EffectiveAt, line.ChargedExtensionFee);
                documents.Add(new RevenueExpenseDocumentRowDto(
                    line.ReturnId, line.ReturnNo, line.EffectiveAt,
                    "EXTENSION", "Gia hạn đã quyết toán", line.CustomerName,
                    line.ChargedExtensionFee, "Quyết toán khi trả", "Đã quyết toán"));
            }

            var penaltyAmt = line.ChargedLatePenalty + line.ChargedDamagePenalty;
            if (penaltyAmt > 0)
            {
                fineCount++;
                AddRevDay(line.EffectiveAt, penaltyAmt);
                documents.Add(new RevenueExpenseDocumentRowDto(
                    line.ReturnId, line.ReturnNo, line.EffectiveAt,
                    "PENALTY", "Tiền phạt trễ / Hư hỏng", line.CustomerName,
                    penaltyAmt, "Khấu trừ cọc", "Đã quyết toán"));
            }
        }

        foreach (var b in buybacks)
        {
            AddExpDay(VietnamTimeHelper.TodayVietnam(b.EffectiveAt), b.TotalAmount);
            documents.Add(new RevenueExpenseDocumentRowDto(
                b.Id, b.Code, b.EffectiveAt,
                "BUYBACK", "Thu mua sách cũ từ cá nhân", b.CounterpartyName,
                b.TotalAmount, FormatMethods(b.Methods), "Hoàn tất"));
        }

        foreach (var s in supplierImports)
        {
            AddExpDay(VietnamTimeHelper.TodayVietnam(s.EffectiveAt), s.TotalAmount);
            documents.Add(new RevenueExpenseDocumentRowDto(
                s.Id, s.Code, s.EffectiveAt,
                "SUPPLIER_IMPORT", "Nhập hàng NCC / NXB", s.CounterpartyName,
                s.TotalAmount, FormatMethods(s.Methods), "Có hóa đơn"));
        }

        var payrollByEmp = payrollRecords
            .GroupBy(p => new { p.EmployeeId, p.FullName })
            .Select(g => new
            {
                g.Key.EmployeeId,
                g.Key.FullName,
                Total = g.Sum(x => x.ShiftSalary),
                LatestAt = g.Max(x => x.OccurredAt)
            }).ToList();

        foreach (var w in payrollRecords)
        {
            AddExpDay(w.WorkDate, w.ShiftSalary);
        }

        foreach (var emp in payrollByEmp)
        {
            documents.Add(new RevenueExpenseDocumentRowDto(
                emp.EmployeeId, $"PAY-{periodTag}", emp.LatestAt,
                "PAYROLL", "Lương nhân viên đã duyệt", emp.FullName,
                emp.Total, "Chuyển khoản", "Đã duyệt"));
        }

        // 5-day bucket trend series
        var trendBuckets = new List<RevenueExpenseTrendBucketDto>();
        var cursor = fromVn;
        while (cursor <= toVn)
        {
            var bucketEnd = cursor.AddDays(4);
            if (bucketEnd > toVn) bucketEnd = toVn;

            long revSum = 0;
            long expSum = 0;
            for (var d = cursor; d <= bucketEnd; d = d.AddDays(1))
            {
                revSum += revenueByVnDay.GetValueOrDefault(d);
                expSum += expenseByVnDay.GetValueOrDefault(d);
            }

            var label = $"{cursor:dd}-{bucketEnd:dd}/{bucketEnd:MM}";
            trendBuckets.Add(new RevenueExpenseTrendBucketDto(label, cursor, bucketEnd, revSum, expSum));
            cursor = bucketEnd.AddDays(1);
        }

        // Source summary rows (8 sources)
        var counts = new Dictionary<string, int>
        {
            ["SALE"] = paidSaleInvoices.Count,
            ["LOST_BOOK"] = lostCount,
            ["RENTAL_FEE"] = rentSlipIds.Count,
            ["EXTENSION"] = extCount,
            ["PENALTY"] = fineCount,
            ["BUYBACK"] = buybacks.Count,
            ["SUPPLIER_IMPORT"] = supplierImports.Count,
            ["PAYROLL"] = payrollByEmp.Count
        };

        var sourceRows = new List<RevenueExpenseSourceRowDto>
        {
            new("SALE", "Bán sách", $"HD-{periodTag}-*", counts["SALE"], $"{counts["SALE"]} hóa đơn",
                counterSales, null, "Tiền mặt / VietQR", "Đã hoàn tất"),
            new("LOST_BOOK", "Mất sách", $"RENT-{periodTag}-*", counts["LOST_BOOK"], $"{counts["LOST_BOOK"]} bản",
                lostBookRetained, null, "Khấu trừ cọc", "Đã quyết toán"),
            new("RENTAL_FEE", "Thuê sách", $"RENT-{periodTag}-*", counts["RENTAL_FEE"], $"{counts["RENTAL_FEE"]} phiếu",
                settledRentFees, null, "Khấu trừ cọc", "Đã quyết toán"),
            new("EXTENSION", "Gia hạn", $"EXT-{periodTag}-*", counts["EXTENSION"], $"{counts["EXTENSION"]} lượt",
                settledExtensionFees, null, "Quyết toán khi trả", "Đã quyết toán"),
            new("PENALTY", "Phạt", $"FINE-{periodTag}-*", counts["PENALTY"], $"{counts["PENALTY"]} lượt",
                settledPenalties, null, "Khấu trừ cọc", "Đã quyết toán"),
            new("BUYBACK", "Thu mua", $"BUY-{periodTag}-*", counts["BUYBACK"], $"{counts["BUYBACK"]} phiếu",
                null, buybackTotal, "Tiền mặt / CK", "Có định danh"),
            new("SUPPLIER_IMPORT", "Nhập NCC", $"INB-{periodTag}-*", counts["SUPPLIER_IMPORT"], $"{counts["SUPPLIER_IMPORT"]} phiếu",
                null, supplierTotal, "Chuyển khoản", "Có hóa đơn"),
            new("PAYROLL", "Nhân công", $"PAY-{periodTag}", counts["PAYROLL"], $"{counts["PAYROLL"]} nhân viên",
                null, payrollTotal, "Chuyển khoản", "Đã duyệt")
        };

        return new RevenueExpenseDataset(
            revenueBreakdown,
            expenseBreakdown,
            trendBuckets,
            sourceRows,
            documents,
            counts);
    }

    private (DateOnly FromVn, DateOnly ToVn) ResolvePeriod(DateOnly? from, DateOnly? to)
    {
        var todayVn = VietnamTimeHelper.TodayVietnam(timeProvider.GetUtcNow().UtcDateTime);
        var defaultFrom = new DateOnly(todayVn.Year, todayVn.Month, 1);
        var defaultTo = new DateOnly(todayVn.Year, todayVn.Month, DateTime.DaysInMonth(todayVn.Year, todayVn.Month));

        var resolvedFrom = from ?? defaultFrom;
        var resolvedTo = to ?? (from.HasValue ? todayVn : defaultTo);
        if (resolvedTo < resolvedFrom)
        {
            (resolvedFrom, resolvedTo) = (resolvedTo, resolvedFrom);
        }

        return (resolvedFrom, resolvedTo);
    }

    private async Task<bool> CheckBuybackEvidenceAsync(DateOnly fromVn, DateOnly toVn, CancellationToken cancellationToken)
    {
        var (utcStart, utcEnd) = VietnamTimeHelper.GetDateRangeUtc(fromVn, toVn);
        var buybacks = await (from r in dbContext.StockReceipts.AsNoTracking()
                              where r.SourceType == StockReceiptSourceType.CUSTOMER_BUYBACK &&
                                    r.Status == ApprovalStatus.COMPLETED
                              let effectiveAt = r.CompletedAt ?? r.ApprovedAt ?? r.CreatedAt
                              where effectiveAt >= utcStart && effectiveAt < utcEnd
                              join sel in dbContext.Customers.AsNoTracking() on r.SellerId equals sel.Id into selG
                              from sel in selG.DefaultIfEmpty()
                              select new
                              {
                                  r.SellerId,
                                  SellerName = sel != null ? sel.FullName : null,
                                  SellerPhone = sel != null ? sel.Phone : null
                              }).ToListAsync(cancellationToken);

        return buybacks.All(b =>
            b.SellerId.HasValue &&
            !string.IsNullOrWhiteSpace(b.SellerName) &&
            !string.IsNullOrWhiteSpace(b.SellerPhone));
    }

    private async Task<bool> CheckSupplierEvidenceAsync(DateOnly fromVn, DateOnly toVn, CancellationToken cancellationToken)
    {
        var (utcStart, utcEnd) = VietnamTimeHelper.GetDateRangeUtc(fromVn, toVn);
        var imports = await dbContext.StockReceipts.AsNoTracking()
            .Where(r => r.SourceType == StockReceiptSourceType.SUPPLIER &&
                        r.Status == ApprovalStatus.COMPLETED &&
                        (r.CompletedAt ?? r.ApprovedAt ?? r.CreatedAt) >= utcStart &&
                        (r.CompletedAt ?? r.ApprovedAt ?? r.CreatedAt) < utcEnd)
            .Select(r => new { r.SupplierId, r.Code })
            .ToListAsync(cancellationToken);

        return imports.All(i => i.SupplierId.HasValue && !string.IsNullOrWhiteSpace(i.Code));
    }
}
