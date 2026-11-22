using backend.src.Controllers;
using backend.src.Data;
using backend.src.Dto.ReportDto;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services.ReportServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Xunit;

namespace backend.Tests.Services;

public sealed class ReportsServiceTests
{
    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"ReportsTestDb_{Guid.NewGuid():N}")
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new AppDbContext(options);
    }

    private sealed class FixedTimeProvider(DateTime utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(DateTime.SpecifyKind(utcNow, DateTimeKind.Utc));
    }

    [Fact]
    public async Task EmptyDatabase_ReturnsZeroedReportsSafely()
    {
        await using var db = CreateDbContext();
        var service = new ReportsService(db, new FixedTimeProvider(new DateTime(2026, 10, 18, 5, 0, 0, DateTimeKind.Utc)));

        var overview = await service.GetOverviewAsync(new DateOnly(2026, 10, 18), "week", null, false);
        Assert.Equal(0, overview.TotalSettledRevenueToday);
        Assert.Equal(0m, overview.VietQrSuccessRatePct);
        Assert.Equal(7, overview.TrendPoints.Count);

        var revExp = await service.GetRevenueExpenseAsync(new RevenueExpenseQuery(new DateOnly(2026, 10, 1), new DateOnly(2026, 10, 31)));
        Assert.Equal(0, revExp.TotalRevenue);
        Assert.Equal(0, revExp.TotalExpense);
        Assert.Equal(0, revExp.NetOperatingDifference);

        var deposit = await service.GetDepositReconciliationAsync(new DepositReconciliationQuery(new DateOnly(2026, 10, 1), new DateOnly(2026, 10, 31)));
        Assert.Equal(0, deposit.OpeningDepositBalance);
        Assert.Equal(0, deposit.ClosingDepositBalance);

        var tax = await service.GetTaxDeclarationAsync(new TaxDeclarationQuery("MONTH", 2026, 10));
        Assert.Equal(0, tax.TotalTaxableRevenue);
        Assert.Equal(0, tax.TotalEligibleExpense);
    }

    [Fact]
    public async Task Overview_RespectsVietnamUtc7BoundariesAndReversedExclusionAndLowStockDualChannel()
    {
        await using var db = CreateDbContext();

        var cashier1 = Guid.NewGuid();
        var cashier2 = Guid.NewGuid();
        var customer = new CustomerModel { Id = Guid.NewGuid(), FullName = "Lê Ngọc Mai", Phone = "0908888888", TierId = Guid.NewGuid() };

        var title = new TitleModel { Id = Guid.NewGuid(), Name = "Conan", VolumeLabel = "Tập 10", IsActive = true };
        var edition = new EditionModel { Id = Guid.NewGuid(), TitleId = title.Id, MinStockSale = 3, MinStockRental = 4, IsActive = true };
        // 2 BOTH + 1 SALE_ONLY => SaleAvailable = 3 (OK >= 3), RentalAvailable = 2 (LOW < 4)
        var copy1 = new BookCopyModel { Id = Guid.NewGuid(), CopyBarcode = "BC01", EditionId = edition.Id, ReceiptLineId = Guid.NewGuid(), Status = BookCopyStatus.AVAILABLE, Availability = BookChannelAvailability.BOTH };
        var copy2 = new BookCopyModel { Id = Guid.NewGuid(), CopyBarcode = "BC02", EditionId = edition.Id, ReceiptLineId = Guid.NewGuid(), Status = BookCopyStatus.AVAILABLE, Availability = BookChannelAvailability.BOTH };
        var copy3 = new BookCopyModel { Id = Guid.NewGuid(), CopyBarcode = "BC03", EditionId = edition.Id, ReceiptLineId = Guid.NewGuid(), Status = BookCopyStatus.AVAILABLE, Availability = BookChannelAvailability.SALE_ONLY };

        var session1 = new CashSessionModel { Id = Guid.NewGuid(), OpenedBy = cashier1, OpeningBalance = 1_000_000, Status = CashSessionStatus.OPEN };

        // Paid at 2026-10-18 16:30 UTC == 2026-10-18 23:30 VN -> belongs to 2026-10-18
        var invTodayVn = new SaleInvoiceModel { Id = Guid.NewGuid(), InvoiceNo = "HD-01", CashSessionId = session1.Id, Status = SaleInvoiceStatus.PAID, CreatedBy = cashier1, PaidAt = new DateTime(2026, 10, 18, 16, 30, 0, DateTimeKind.Utc) };
        var lineActive = new SaleInvoiceLineModel { Id = Guid.NewGuid(), InvoiceId = invTodayVn.Id, CopyId = copy1.Id, FinalPrice = 100_000, Status = SaleInvoiceLineStatus.ACTIVE };
        var lineReversed = new SaleInvoiceLineModel { Id = Guid.NewGuid(), InvoiceId = invTodayVn.Id, CopyId = copy2.Id, FinalPrice = 50_000, Status = SaleInvoiceLineStatus.REVERSED };

        // Paid at 2026-10-18 17:30 UTC == 2026-10-19 00:30 VN -> belongs to 2026-10-19 (must NOT count on 2026-10-18)
        var invNextVn = new SaleInvoiceModel { Id = Guid.NewGuid(), InvoiceNo = "HD-02", CashSessionId = session1.Id, Status = SaleInvoiceStatus.PAID, CreatedBy = cashier2, PaidAt = new DateTime(2026, 10, 18, 17, 30, 0, DateTimeKind.Utc) };
        var lineNextVn = new SaleInvoiceLineModel { Id = Guid.NewGuid(), InvoiceId = invNextVn.Id, CopyId = copy3.Id, FinalPrice = 200_000, Status = SaleInvoiceLineStatus.ACTIVE };

        // Cash payment in session1
        var cashPay = new PaymentModel
        {
            Id = Guid.NewGuid(),
            PaymentNo = "TT-01",
            IdempotencyKey = "k1",
            Direction = PaymentDirection.IN,
            PaymentType = PaymentType.SALE,
            Method = PaymentMethod.CASH,
            Amount = 100_000,
            Status = PaymentStatus.SUCCEEDED,
            CashSessionId = session1.Id,
            SaleInvoiceId = invTodayVn.Id,
            CreatedBy = cashier1,
            CreatedAt = new DateTime(2026, 10, 18, 16, 30, 0, DateTimeKind.Utc)
        };

        db.AddRange(customer, title, edition, copy1, copy2, copy3, session1, invTodayVn, lineActive, lineReversed, invNextVn, lineNextVn, cashPay);
        await db.SaveChangesAsync();

        var service = new ReportsService(db, new FixedTimeProvider(new DateTime(2026, 10, 18, 16, 45, 0, DateTimeKind.Utc)));

        // Day 2026-10-18 VN: only lineActive (100,000), NOT lineReversed, NOT lineNextVn
        var overview18 = await service.GetOverviewAsync(new DateOnly(2026, 10, 18), "week", cashier1, isCashierScoped: false);
        Assert.Equal(100_000, overview18.SalesRevenueToday);
        Assert.Equal(1_100_000, overview18.CashDrawerBalance);
        Assert.Single(overview18.LowStockAlerts);
        Assert.Equal(3, overview18.LowStockAlerts[0].SaleAvailable);
        Assert.Equal(2, overview18.LowStockAlerts[0].RentalAvailable);
        Assert.Equal(2, overview18.LowStockAlerts[0].SuggestedReplenishQty);

        // Cashier2 scoped sees 0 revenue and 0 open drawers for 2026-10-18
        var cashier2Overview = await service.GetOverviewAsync(new DateOnly(2026, 10, 18), "week", cashier2, isCashierScoped: true);
        Assert.Equal(0, cashier2Overview.SalesRevenueToday);
        Assert.Equal(0, cashier2Overview.CashDrawerBalance);

        // Day 2026-10-19 VN sees lineNextVn (200,000)
        var overview19 = await service.GetOverviewAsync(new DateOnly(2026, 10, 19), "week", cashier1, isCashierScoped: false);
        Assert.Equal(200_000, overview19.SalesRevenueToday);
    }

    [Fact]
    public async Task RevenueExpenseDepositAndTax_MaintainExactAccountingIdentities()
    {
        await using var db = CreateDbContext();

        var customer = new CustomerModel { Id = Guid.NewGuid(), FullName = "Trần Văn Nam", Phone = "0909123456", TierId = Guid.NewGuid() };
        var supplier = new SupplierModel { Id = Guid.NewGuid(), Name = "NXB Kim Đồng", TaxCode = "0101234567" };
        var role = new RoleModel { Id = Guid.NewGuid(), RoleName = RoleName.CASHIER };
        var employee = new EmployeeModel { Id = Guid.NewGuid(), FullName = "Nhân Viên A", Email = "a@b.c", Password = "x", Phone = "0901", RoleId = role.Id, Role = role };
        var session = new CashSessionModel { Id = Guid.NewGuid(), OpenedBy = employee.Id, OpeningBalance = 500_000, Status = CashSessionStatus.OPEN };

        // Pre-period active slip (opened 2026-09-25 VN = 2026-09-25T05:00Z, deposit 150,000, settled in October 2026)
        var slipPrev = new RentalSlipModel { Id = Guid.NewGuid(), SlipNo = "RENT-001", CustomerId = customer.Id, TierId = customer.TierId, Status = RentalSlipStatus.RETURNED, CreatedBy = employee.Id, ActivatedAt = new DateTime(2026, 9, 25, 5, 0, 0, DateTimeKind.Utc) };
        var retPrev = new ReturnModel { Id = Guid.NewGuid(), ReturnNo = "RET-001", SlipId = slipPrev.Id, Status = ReturnStatus.SETTLED, CreatedBy = employee.Id, ReturnedAt = new DateTime(2026, 10, 5, 5, 0, 0, DateTimeKind.Utc), SettledAt = new DateTime(2026, 10, 5, 5, 0, 0, DateTimeKind.Utc) };
        var linePrev = new RentalLineModel
        {
            Id = Guid.NewGuid(),
            SlipId = slipPrev.Id,
            CopyId = Guid.NewGuid(),
            DepositAmount = 150_000,
            DueAt = new DateTime(2026, 10, 2, 10, 0, 0, DateTimeKind.Utc),
            Status = RentalLineStatus.RETURNED,
            ReturnId = retPrev.Id,
            ChargedRentFee = 40_000,
            ChargedExtensionFee = 10_000,
            ChargedLatePenalty = 15_000,
            ChargedDamagePenalty = 5_000,
            LostRetainedAmount = 0,
            RefundAmount = 80_000
        };

        // In-period active slip (opened 2026-10-10 VN, still RENTING, deposit 200,000 via BANK_TRANSFER)
        var slipCurr = new RentalSlipModel { Id = Guid.NewGuid(), SlipNo = "RENT-002", CustomerId = customer.Id, TierId = customer.TierId, Status = RentalSlipStatus.ACTIVE, CreatedBy = employee.Id, ActivatedAt = new DateTime(2026, 10, 10, 5, 0, 0, DateTimeKind.Utc) };
        var lineCurr = new RentalLineModel
        {
            Id = Guid.NewGuid(),
            SlipId = slipCurr.Id,
            CopyId = Guid.NewGuid(),
            DepositAmount = 200_000,
            DueAt = new DateTime(2026, 10, 17, 10, 0, 0, DateTimeKind.Utc),
            Status = RentalLineStatus.RENTING
        };
        var depositBankPay = new PaymentModel
        {
            Id = Guid.NewGuid(),
            PaymentNo = "TT-DEP-2",
            IdempotencyKey = "dep-2",
            Direction = PaymentDirection.IN,
            PaymentType = PaymentType.RENTAL_DEPOSIT,
            Method = PaymentMethod.BANK_TRANSFER,
            Amount = 200_000,
            Status = PaymentStatus.SUCCEEDED,
            RentalSlipId = slipCurr.Id,
            CreatedBy = employee.Id,
            CreatedAt = new DateTime(2026, 10, 10, 5, 0, 0, DateTimeKind.Utc)
        };

        // Sale in October: 120,000
        var saleInv = new SaleInvoiceModel { Id = Guid.NewGuid(), InvoiceNo = "HD-010", CashSessionId = session.Id, Status = SaleInvoiceStatus.PAID, CustomerId = customer.Id, CreatedBy = employee.Id, PaidAt = new DateTime(2026, 10, 12, 8, 0, 0, DateTimeKind.Utc) };
        var saleLine = new SaleInvoiceLineModel { Id = Guid.NewGuid(), InvoiceId = saleInv.Id, CopyId = Guid.NewGuid(), FinalPrice = 120_000, Status = SaleInvoiceLineStatus.ACTIVE };

        // Expenses in October: Buyback 30,000 + Supplier 50,000 + Payroll 40,000 (plus unapproved payroll 99,000 ignored)
        var buybackReceipt = new StockReceiptModel { Id = Guid.NewGuid(), Code = "BUY-01", SourceType = StockReceiptSourceType.CUSTOMER_BUYBACK, SellerId = customer.Id, Status = ApprovalStatus.COMPLETED, TotalAmount = 30_000, CreatedBy = employee.Id, CompletedAt = new DateTime(2026, 10, 8, 5, 0, 0, DateTimeKind.Utc) };
        var supplierReceipt = new StockReceiptModel { Id = Guid.NewGuid(), Code = "INB-01", SourceType = StockReceiptSourceType.SUPPLIER, SupplierId = supplier.Id, Status = ApprovalStatus.COMPLETED, TotalAmount = 50_000, CreatedBy = employee.Id, CompletedAt = new DateTime(2026, 10, 9, 5, 0, 0, DateTimeKind.Utc) };
        var approvedWork = new EmployeeWorkRecordModel { Id = Guid.NewGuid(), EmployeeId = employee.Id, WorkDate = new DateOnly(2026, 10, 15), ShiftNo = 1, ShiftSalary = 40_000, ApprovedBy = employee.Id, ApprovedAt = new DateTime(2026, 10, 16, 5, 0, 0, DateTimeKind.Utc) };
        var unapprovedWork = new EmployeeWorkRecordModel { Id = Guid.NewGuid(), EmployeeId = employee.Id, WorkDate = new DateOnly(2026, 10, 16), ShiftNo = 1, ShiftSalary = 99_000, ApprovedBy = null, PaymentStatus = WorkRecordPaymentStatus.UNPAID };

        db.AddRange(customer, supplier, role, employee, session, slipPrev, retPrev, linePrev, slipCurr, lineCurr, depositBankPay, saleInv, saleLine, buybackReceipt, supplierReceipt, approvedWork, unapprovedWork);
        await db.SaveChangesAsync();

        var service = new ReportsService(db, new FixedTimeProvider(new DateTime(2026, 10, 20, 5, 0, 0, DateTimeKind.Utc)));

        // SCR-REP-02
        var revExp = await service.GetRevenueExpenseAsync(new RevenueExpenseQuery(new DateOnly(2026, 10, 1), new DateOnly(2026, 10, 31)));
        Assert.Equal(120_000 + 40_000 + 10_000 + 20_000, revExp.TotalRevenue); // 190,000
        Assert.Equal(30_000 + 50_000 + 40_000, revExp.TotalExpense); // 120,000 (unapproved 99k excluded)
        Assert.Equal(70_000, revExp.NetOperatingDifference);

        // SCR-REP-03
        var deposit = await service.GetDepositReconciliationAsync(new DepositReconciliationQuery(new DateOnly(2026, 10, 1), new DateOnly(2026, 10, 31)));
        Assert.Equal(150_000, deposit.OpeningDepositBalance);
        Assert.Equal(200_000, deposit.CollectedInPeriod);
        Assert.Equal(80_000, deposit.RefundedInPeriod);
        Assert.Equal(70_000, deposit.DeductedFeeInPeriod);
        Assert.Equal(0, deposit.LostRetainedInPeriod);
        Assert.Equal(200_000, deposit.ClosingDepositBalance); // 150k + 200k - 80k - 70k = 200k
        Assert.Equal(0, deposit.CashObligationAmount);
        Assert.Equal(200_000, deposit.BankObligationAmount);

        // SCR-REP-04
        var tax = await service.GetTaxDeclarationAsync(new TaxDeclarationQuery("MONTH", 2026, 10));
        Assert.Equal(190_000, tax.TotalTaxableRevenue);
        Assert.Equal(120_000, tax.TotalEligibleExpense);
        Assert.Equal(70_000, tax.NetDifference);
        Assert.True(tax.HasFullSourceReconciliation);
        Assert.Equal(200_000, tax.ExcludedItems.First(x => x.ItemKey == "DEPOSIT_COLLECTED").Amount);
        Assert.Equal(80_000, tax.ExcludedItems.First(x => x.ItemKey == "DEPOSIT_REFUNDED").Amount);
        Assert.Equal(200_000, tax.ExcludedItems.First(x => x.ItemKey == "DEPOSIT_CLOSING").Amount);
    }

    [Fact]
    public void ReportsController_EnforcesAdminOnlyForFinancialAndTaxReports()
    {
        var overviewAuth = typeof(ReportsController).GetMethod(nameof(ReportsController.GetOverview))!
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .Single();
        Assert.Null(overviewAuth.Roles); // All authenticated roles allowed

        string[] adminMethods =
        [
            nameof(ReportsController.GetRevenueExpense),
            nameof(ReportsController.GetRevenueExpenseDocuments),
            nameof(ReportsController.GetDepositReconciliation),
            nameof(ReportsController.GetTaxDeclaration)
        ];

        foreach (var methodName in adminMethods)
        {
            var attr = typeof(ReportsController).GetMethod(methodName)!
                .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
                .Cast<AuthorizeAttribute>()
                .Single();
            Assert.Equal(nameof(RoleName.ADMIN), attr.Roles);
        }
    }
}
