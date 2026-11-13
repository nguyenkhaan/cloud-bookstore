using backend.src.Data;
using backend.src.Dto.CustomerDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace backend.Tests.Services;

public class CustomerHistoryServiceTests
{
    private static AppDbContext NewDb() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString("N")).Options);

    private static CustomerModel AddCustomer(AppDbContext db, long storedSpend = 0, bool flagged = false)
    {
        var customer = new CustomerModel
        {
            Phone = "0909234567", FullName = "Nguyễn Thu Hà",
            TierId = Guid.NewGuid(), EligibleSpend = storedSpend, IsFlagged = flagged
        };
        db.Customers.Add(customer);
        return customer;
    }

    private static BookCopyModel AddCopy(AppDbContext db, string barcode, string title, string? volume)
    {
        var titleModel = new TitleModel { Name = title, VolumeLabel = volume };
        var edition = new EditionModel { TitleId = titleModel.Id };
        var copy = new BookCopyModel { CopyBarcode = barcode, EditionId = edition.Id, ReceiptLineId = Guid.NewGuid() };
        db.AddRange(titleModel, edition, copy);
        return copy;
    }

    private static RentalSlipModel AddSlip(AppDbContext db, CustomerModel customer, RentalSlipStatus status,
        DateOnly? rentDate = null)
    {
        var slip = new RentalSlipModel
        {
            SlipNo = $"RENT-{Guid.NewGuid():N}"[..14], CustomerId = customer.Id, TierId = customer.TierId,
            Status = status, RentDate = rentDate ?? DateOnly.FromDateTime(DateTime.UtcNow)
        };
        db.RentalSlips.Add(slip);
        return slip;
    }

    private static RentalLineModel AddLine(AppDbContext db, RentalSlipModel slip, BookCopyModel copy,
        RentalLineStatus status, Action<RentalLineModel>? configure = null)
    {
        var line = new RentalLineModel
        {
            SlipId = slip.Id, CopyId = copy.Id, Status = status, DueAt = DateTime.UtcNow.AddDays(3)
        };
        configure?.Invoke(line);
        db.RentalLines.Add(line);
        return line;
    }

    private static ReturnModel AddReturn(AppDbContext db, RentalSlipModel slip, ReturnStatus status)
    {
        var ret = new ReturnModel
        {
            ReturnNo = "RET-" + Guid.NewGuid().ToString("N")[..8], SlipId = slip.Id, Status = status,
            SettledAt = status == ReturnStatus.SETTLED ? DateTime.UtcNow : null
        };
        db.Returns.Add(ret);
        return ret;
    }

    [Fact]
    public async Task Summary_CountsOnlyValidSpend_AndFlagsMismatchWithStoredValue()
    {
        await using var db = NewDb();
        var customer = AddCustomer(db, storedSpend: 0);
        var a = AddCopy(db, "BC-001", "Doraemon", "Tập 02");
        var b = AddCopy(db, "BC-002", "Conan", "Tập 10");
        var c = AddCopy(db, "BC-003", "Nhà giả kim", null);

        var invoice = new SaleInvoiceModel
        {
            InvoiceNo = "POS-1", CustomerId = customer.Id, Status = SaleInvoiceStatus.PAID,
            PaidAt = DateTime.UtcNow, TotalPayable = 100_000
        };
        db.SaleInvoices.Add(invoice);
        db.SaleInvoiceLines.AddRange(
            new SaleInvoiceLineModel { InvoiceId = invoice.Id, CopyId = a.Id, FinalPrice = 100_000, DiscountAmount = 5_000, Status = SaleInvoiceLineStatus.ACTIVE },
            new SaleInvoiceLineModel { InvoiceId = invoice.Id, CopyId = b.Id, FinalPrice = 50_000, Status = SaleInvoiceLineStatus.REVERSED });

        var activeSlip = AddSlip(db, customer, RentalSlipStatus.ACTIVE);
        AddLine(db, activeSlip, b, RentalLineStatus.RENTING, l => l.DepositAmount = 80_000);

        var doneSlip = AddSlip(db, customer, RentalSlipStatus.RETURNED);
        var ret = AddReturn(db, doneSlip, ReturnStatus.SETTLED);
        AddLine(db, doneSlip, c, RentalLineStatus.RETURNED, l =>
        {
            l.ReturnId = ret.Id; l.DepositAmount = 120_000;
            l.ChargedRentFee = 30_000; l.ChargedExtensionFee = 6_000;
            l.ChargedLatePenalty = 7_500; l.LateDays = 1;
        });
        await db.SaveChangesAsync();

        var summary = await new CustomerHistoryService(db).GetSummaryAsync(customer.Id);

        Assert.Equal(100_000, summary.SalesSpend);          // REVERSED line excluded
        Assert.Equal(5_000, summary.SalesDiscountTotal);
        Assert.Equal(36_000, summary.RentalSpend);          // deposit + late penalty excluded
        Assert.Equal(136_000, summary.ComputedEligibleSpend);
        Assert.True(summary.EligibleSpendMismatch);
        Assert.Equal(1, summary.HeldBookCount);
        Assert.Equal(80_000, summary.DepositHeld);
        Assert.Equal(1, summary.LateReturnCount);
        Assert.Equal(1, summary.ViolationCount);
        Assert.False(summary.BlocksNewRental);
    }

    [Fact]
    public async Task Rentals_PagesFiltersByStatus_AndMarksOverdue()
    {
        await using var db = NewDb();
        var customer = AddCustomer(db);
        var copy1 = AddCopy(db, "BC-010", "Doraemon", "Tập 02");
        var copy2 = AddCopy(db, "BC-011", "Conan", "Tập 10");

        var overdue = AddSlip(db, customer, RentalSlipStatus.ACTIVE, new DateOnly(2026, 10, 12));
        AddLine(db, overdue, copy1, RentalLineStatus.RENTING, l => { l.DueAt = DateTime.UtcNow.AddDays(-2); l.DepositAmount = 80_000; });
        var returned = AddSlip(db, customer, RentalSlipStatus.RETURNED, new DateOnly(2026, 9, 28));
        var ret = AddReturn(db, returned, ReturnStatus.SETTLED);
        AddLine(db, returned, copy2, RentalLineStatus.RETURNED, l => { l.ReturnId = ret.Id; l.RefundAmount = 81_100; l.DepositAmount = 100_000; });
        AddSlip(db, customer, RentalSlipStatus.DRAFT); // never shown
        await db.SaveChangesAsync();

        var service = new CustomerHistoryService(db);

        var page1 = await service.GetRentalsAsync(customer.Id, new CustomerHistoryQuery { PageSize = 1 });
        Assert.Equal(2, page1.TotalCount);
        Assert.Single(page1.Items);
        Assert.True(page1.Items[0].IsOverdue);
        Assert.Equal("Doraemon", page1.Items[0].Lines[0].TitleName);
        Assert.Equal("Tập 02", page1.Items[0].Lines[0].VolumeLabel);

        var onlyReturned = await service.GetRentalsAsync(customer.Id, new CustomerHistoryQuery { Status = "returned" });
        Assert.Single(onlyReturned.Items);
        Assert.Equal(81_100, onlyReturned.Items[0].RefundTotal);
        Assert.NotNull(onlyReturned.Items[0].ReturnNo);
    }

    [Fact]
    public async Task Sales_ReversedLinesAreShownButNotCounted()
    {
        await using var db = NewDb();
        var customer = AddCustomer(db);
        var a = AddCopy(db, "BC-020", "Conan", "Tập 01");
        var b = AddCopy(db, "BC-021", "Conan", "Tập 02");

        var mixed = new SaleInvoiceModel { InvoiceNo = "POS-A", CustomerId = customer.Id, Status = SaleInvoiceStatus.PAID, PaidAt = DateTime.UtcNow };
        var reversed = new SaleInvoiceModel { InvoiceNo = "POS-B", CustomerId = customer.Id, Status = SaleInvoiceStatus.PAID, PaidAt = DateTime.UtcNow.AddMinutes(-5) };
        var draft = new SaleInvoiceModel { InvoiceNo = "POS-C", CustomerId = customer.Id, Status = SaleInvoiceStatus.DRAFT };
        db.SaleInvoices.AddRange(mixed, reversed, draft);
        db.SaleInvoiceLines.AddRange(
            new SaleInvoiceLineModel { InvoiceId = mixed.Id, CopyId = a.Id, FinalPrice = 40_000, Status = SaleInvoiceLineStatus.ACTIVE },
            new SaleInvoiceLineModel { InvoiceId = mixed.Id, CopyId = b.Id, FinalPrice = 30_000, Status = SaleInvoiceLineStatus.REVERSED },
            new SaleInvoiceLineModel { InvoiceId = reversed.Id, CopyId = a.Id, FinalPrice = 25_000, Status = SaleInvoiceLineStatus.REVERSED });
        await db.SaveChangesAsync();

        var result = await new CustomerHistoryService(db).GetSalesAsync(customer.Id, new CustomerHistoryQuery());

        Assert.Equal(2, result.TotalCount);
        var first = result.Items.Single(i => i.InvoiceNo == "POS-A");
        Assert.Equal(40_000, first.CountedAmount);
        Assert.True(first.HasReversedLines);
        Assert.False(first.IsFullyReversed);
        var second = result.Items.Single(i => i.InvoiceNo == "POS-B");
        Assert.Equal(0, second.CountedAmount);
        Assert.True(second.IsFullyReversed);
    }

    [Fact]
    public async Task Buybacks_OnlyCustomerBuybackReceipts_ExcludeDraftsAndSupplierReceipts()
    {
        await using var db = NewDb();
        var customer = AddCustomer(db);
        var copy = AddCopy(db, "BC-030", "Doraemon", "Tập 03");
        await db.SaveChangesAsync();
        var edition = await db.Editions.FirstAsync();
        var nonDraft = Enum.GetValues<ApprovalStatus>().First(s => s != ApprovalStatus.DRAFT);

        var buyback = new StockReceiptModel
        {
            Code = "BUY-1", SourceType = StockReceiptSourceType.CUSTOMER_BUYBACK, SellerId = customer.Id,
            Status = nonDraft, TotalAmount = 420_000, CompletedAt = DateTime.UtcNow
        };
        var draft = new StockReceiptModel { Code = "BUY-2", SourceType = StockReceiptSourceType.CUSTOMER_BUYBACK, SellerId = customer.Id, Status = ApprovalStatus.DRAFT };
        var supplier = new StockReceiptModel { Code = "SUP-1", SourceType = StockReceiptSourceType.SUPPLIER, SellerId = customer.Id, Status = nonDraft };
        db.StockReceipts.AddRange(buyback, draft, supplier);
        db.StockReceiptLines.Add(new StockReceiptLineModel
        {
            ReceiptId = buyback.Id, EditionId = edition.Id, Quantity = 3, UnitCost = 140_000, ConditionGrade = ConditionGrade.B
        });
        await db.SaveChangesAsync();

        var service = new CustomerHistoryService(db);
        var result = await service.GetBuybacksAsync(customer.Id, new CustomerHistoryQuery());

        var item = Assert.Single(result.Items);
        Assert.Equal("BUY-1", item.Code);
        Assert.True(item.IsPaidOut);
        Assert.Equal("Doraemon", item.Lines[0].TitleName);

        var summary = await service.GetSummaryAsync(customer.Id);
        Assert.Equal(420_000, summary.BuybackPaidTotal);
        Assert.Equal(0, summary.ComputedEligibleSpend); // buyback never counts toward spend
    }

    [Fact]
    public async Task Violations_CoverSettledPenaltiesOpenOverdueAndOutstanding_AndBlockNewRental()
    {
        await using var db = NewDb();
        var customer = AddCustomer(db);
        var copies = Enumerable.Range(1, 4).Select(i => AddCopy(db, $"BC-04{i}", $"Sách {i}", null)).ToList();

        var damaged = AddSlip(db, customer, RentalSlipStatus.RETURNED);
        var damagedReturn = AddReturn(db, damaged, ReturnStatus.SETTLED);
        AddLine(db, damaged, copies[0], RentalLineStatus.RETURNED, l => { l.ReturnId = damagedReturn.Id; l.ChargedDamagePenalty = 20_000; });

        var overdue = AddSlip(db, customer, RentalSlipStatus.ACTIVE);
        AddLine(db, overdue, copies[1], RentalLineStatus.RENTING, l => l.DueAt = DateTime.UtcNow.AddDays(-1));

        var unpaid = AddSlip(db, customer, RentalSlipStatus.ACTIVE);
        var unpaidReturn = AddReturn(db, unpaid, ReturnStatus.READY);
        AddLine(db, unpaid, copies[2], RentalLineStatus.RENTING, l =>
        {
            l.ReturnId = unpaidReturn.Id; l.AdditionalAmountDue = 50_000; l.AdditionalAmountPaid = 10_000;
        });

        var clean = AddSlip(db, customer, RentalSlipStatus.RETURNED);
        var cleanReturn = AddReturn(db, clean, ReturnStatus.SETTLED);
        AddLine(db, clean, copies[3], RentalLineStatus.RETURNED, l => l.ReturnId = cleanReturn.Id);
        await db.SaveChangesAsync();

        var service = new CustomerHistoryService(db);

        var all = await service.GetViolationsAsync(customer.Id, new CustomerHistoryQuery());
        Assert.Equal(3, all.TotalCount);
        Assert.Contains(all.Items, v => v.Result == "SETTLED" && v.DamagePenalty == 20_000);
        Assert.Contains(all.Items, v => v.Result == "AWAITING_PAYMENT" && v.OutstandingAmount == 40_000);

        var open = await service.GetViolationsAsync(customer.Id, new CustomerHistoryQuery { Status = "open_overdue" });
        Assert.Single(open.Items);

        var summary = await service.GetSummaryAsync(customer.Id);
        Assert.True(summary.BlocksNewRental);
        Assert.Equal(40_000, summary.OutstandingAmount);
        Assert.Equal(1, summary.OpenOverdueCount);
    }

    [Fact]
    public async Task Validation_UnknownCustomerInvalidStatusAndInvalidRange()
    {
        await using var db = NewDb();
        var customer = AddCustomer(db);
        await db.SaveChangesAsync();
        var service = new CustomerHistoryService(db);

        await Assert.ThrowsAsync<NotFoundException>(() => service.GetSummaryAsync(Guid.NewGuid()));
        await Assert.ThrowsAsync<BadRequestException>(() =>
            service.GetRentalsAsync(customer.Id, new CustomerHistoryQuery { Status = "NOPE" }));
        await Assert.ThrowsAsync<BadRequestException>(() =>
            service.GetSalesAsync(customer.Id, new CustomerHistoryQuery
            {
                From = new DateOnly(2026, 11, 2), To = new DateOnly(2026, 11, 1)
            }));

        var empty = await service.GetRentalsAsync(customer.Id, new CustomerHistoryQuery());
        Assert.Empty(empty.Items);
        Assert.Equal(0, empty.TotalCount);
    }
}