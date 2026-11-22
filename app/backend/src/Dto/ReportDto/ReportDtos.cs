using backend.src.Dto.Common;
using backend.src.Models.Enums;

namespace backend.src.Dto.ReportDto;

// ============================================================================
// SCR-REP-01: Business Overview Dashboard
// ============================================================================

public record OverviewTrendPointDto(
    DateOnly Date,
    string Label,
    long SalesAmount,
    long RentalAndPenaltyAmount,
    long TotalAmount
);

public record OverviewRevenueStructureDto(
    long SalesAmount,
    long RentalFeeAmount,
    long PenaltyAmount,
    long LostBookAmount,
    long TotalAmount,
    decimal SalesPct,
    decimal RentalFeePct,
    decimal PenaltyPct,
    decimal LostBookPct
);

public record TopRentedTitleDto(
    Guid TitleId,
    string TitleName,
    string? VolumeLabel,
    string DisplayName,
    int RentalCount
);

public record OverviewAttentionDto(
    int OverdueSlipCount,
    int OverdueOver7DaysCustomerCount,
    int LowStockEditionCount,
    int OutOfStockEditionCount,
    int PendingReceiptCopyCount,
    int VietQrPendingOrFailedCount,
    decimal VietQrTargetPct
);

public record LowStockAlertRowDto(
    Guid EditionId,
    Guid TitleId,
    string DisplayTitle,
    int SaleAvailable,
    int MinStockSale,
    int RentalAvailable,
    int MinStockRental,
    int TotalAvailable,
    int TotalMinRequired,
    int SuggestedReplenishQty
);

public record OverdueCustomerRowDto(
    Guid SlipId,
    string SlipNo,
    Guid CustomerId,
    string CustomerName,
    string CustomerPhone,
    DateTime EarliestDueAt,
    int DaysOverdue,
    int ActiveCopyCount
);

public record OverviewReportResponse(
    DateOnly DateVn,
    DateTime GeneratedAtUtc,
    string TrendRange,
    bool IsCashierScoped,
    string StoreScopeLabel,
    long TotalSettledRevenueToday,
    long SalesRevenueToday,
    long RentalRevenueToday,
    long CashDrawerBalance,
    int ActiveCashSessionCount,
    long HeldDepositsBalance,
    int CirculatingRentalSlipCount,
    int OverdueRentalSlipCount,
    decimal VietQrSuccessRatePct,
    int VietQrSucceededCount,
    int VietQrTotalCount,
    long TrendTotalAmount,
    IReadOnlyList<OverviewTrendPointDto> TrendPoints,
    OverviewRevenueStructureDto RevenueStructure,
    IReadOnlyList<TopRentedTitleDto> TopRentedTitles,
    OverviewAttentionDto Attention,
    IReadOnlyList<LowStockAlertRowDto> LowStockAlerts,
    IReadOnlyList<OverdueCustomerRowDto> OverdueCustomers
);

// ============================================================================
// SCR-REP-02: Multi-source Revenue & Expense Report
// ============================================================================

public record RevenueExpenseQuery(
    DateOnly? From = null,
    DateOnly? To = null,
    string? Source = null,
    PaymentMethod? Method = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 10
);

public record RevenueBreakdownDto(
    long CounterSales,
    long LostBookRetained,
    long SettledRentFees,
    long SettledExtensionFees,
    long SettledPenalties
);

public record ExpenseBreakdownDto(
    long CustomerBuyback,
    long SupplierImport,
    long ApprovedPayroll,
    string PayrollPeriodCode
);

public record RevenueExpenseTrendBucketDto(
    string Label,
    DateOnly FromDate,
    DateOnly ToDate,
    long RevenueAmount,
    long ExpenseAmount
);

public record RevenueExpenseSourceRowDto(
    string SourceKey,
    string SourceLabel,
    string CodePattern,
    int DocumentCount,
    string QuantityLabel,
    long? RevenueAmount,
    long? ExpenseAmount,
    string PaymentChannelLabel,
    string StatusLabel
);

public record RevenueExpenseDocumentRowDto(
    Guid DocumentId,
    string DocumentCode,
    DateTime OccurredAt,
    string SourceKey,
    string SourceLabel,
    string CounterpartyName,
    long Amount,
    string PaymentMethodLabel,
    string StatusLabel
);

public record RevenueExpenseReportResponse(
    DateOnly FromDate,
    DateOnly ToDate,
    string StoreScopeLabel,
    long TotalRevenue,
    long TotalExpense,
    long NetOperatingDifference,
    RevenueBreakdownDto RevenueBreakdown,
    ExpenseBreakdownDto ExpenseBreakdown,
    IReadOnlyList<RevenueExpenseTrendBucketDto> TrendBuckets,
    PagedResult<RevenueExpenseSourceRowDto> Sources
);

// ============================================================================
// SCR-REP-03: Deposit Reconciliation Report
// ============================================================================

public record DepositReconciliationQuery(
    DateOnly? From = null,
    DateOnly? To = null,
    string? Status = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 10
);

public record DepositReconciliationSlipRowDto(
    Guid SlipId,
    string SlipNo,
    Guid CustomerId,
    string CustomerName,
    string CustomerPhone,
    long DepositCollected,
    long SettledDeduction,
    long RefundedAmount,
    long CurrentlyHeld,
    string StatusCode,
    string StatusLabel,
    DateTime? DueAt
);

public record DepositReconciliationReportResponse(
    DateOnly FromDate,
    DateOnly ToDate,
    long OpeningDepositBalance,
    long CollectedInPeriod,
    long RefundedInPeriod,
    long DeductedFeeInPeriod,
    long LostRetainedInPeriod,
    long DeductedAndLostTotalInPeriod,
    long ClosingDepositBalance,
    int TotalActiveObligationSlips,
    long CashObligationAmount,
    long BankObligationAmount,
    long SuggestedCashActualBalance,
    string? AlertBannerMessage,
    PagedResult<DepositReconciliationSlipRowDto> Slips
);

// ============================================================================
// SCR-REP-04: Automatic Tax Declaration Report
// ============================================================================

public record TaxDeclarationQuery(
    string PeriodType = "MONTH",
    int? Year = null,
    int? PeriodValue = null
);

public record TaxRevenueItemDto(
    string ItemKey,
    string Title,
    string RecognitionRule,
    string SourceTrace,
    int DocumentCount,
    long Amount
);

public record TaxExpenseItemDto(
    string ItemKey,
    string Title,
    string RequiredDocuments,
    string SourceTrace,
    int DocumentCount,
    long Amount,
    bool IsVerified
);

public record TaxExcludedItemDto(
    string ItemKey,
    string Title,
    long Amount,
    string TreatmentNote
);

public record TaxDeclarationReportResponse(
    string PeriodType,
    int Year,
    int PeriodValue,
    DateOnly FromDate,
    DateOnly ToDate,
    string PeriodLabel,
    string StoreScopeLabel,
    DateTime GeneratedAtUtc,
    long TotalTaxableRevenue,
    long TotalEligibleExpense,
    long NetDifference,
    bool HasFullSourceReconciliation,
    IReadOnlyList<TaxRevenueItemDto> RevenueItems,
    IReadOnlyList<TaxExpenseItemDto> ExpenseItems,
    IReadOnlyList<TaxExcludedItemDto> ExcludedItems
);
