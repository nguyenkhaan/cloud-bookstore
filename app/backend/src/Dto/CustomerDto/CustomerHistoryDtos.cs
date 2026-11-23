namespace backend.src.Dto.CustomerDto;

public class CustomerHistoryQuery
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Status { get; set; }
    public DateOnly? From { get; set; }
    public DateOnly? To { get; set; }
}

public record CustomerLatestDocument(Guid Id, string No, DateTime At, long Amount);

public record CustomerHistorySummaryResponse(
    int RentalCount,
    int SaleCount,
    int BuybackCount,
    int ViolationCount,
    int HeldBookCount,
    int ActiveSlipCount,
    long DepositHeld,
    int LateReturnCount,
    int OpenOverdueCount,
    long OutstandingAmount,
    bool BlocksNewRental,
    long SalesSpend,
    long SalesDiscountTotal,
    long RentalSpend,
    long ComputedEligibleSpend,
    long StoredEligibleSpend,
    bool EligibleSpendMismatch,
    long BuybackPaidTotal,
    CustomerLatestDocument? LatestSale,
    CustomerLatestDocument? LatestBuyback);

public record RentalLineSummary(
    Guid LineId, Guid CopyId, string CopyBarcode, string TitleName,
    string? VolumeLabel, string Status, long DepositAmount);

public record CustomerRentalHistoryItem(
    Guid SlipId,
    string SlipNo,
    string Status,
    DateOnly RentDate,
    DateTime? ActivatedAt,
    DateTime? DueAt,
    int ExtensionCount,
    int LateDays,
    bool IsOverdue,
    long DepositTotal,
    long RefundTotal,
    long OutstandingAmount,
    long CountedSpend,
    Guid? ReturnId,
    string? ReturnNo,
    string? ReturnStatus,
    DateTime? ReturnedAt,
    IReadOnlyList<RentalLineSummary> Lines);

public record SaleLineSummary(
    Guid LineId, Guid CopyId, string CopyBarcode, string TitleName,
    string? VolumeLabel, long ListPrice, long FinalPrice, string Status);

public record CustomerSaleHistoryItem(
    Guid InvoiceId,
    string? InvoiceNo,
    string Status,
    DateTime OccurredAt,
    long Subtotal,
    long DiscountTotal,
    long TotalPayable,
    long CountedAmount,
    bool HasReversedLines,
    bool IsFullyReversed,
    IReadOnlyList<SaleLineSummary> Lines);

public record BuybackLineSummary(
    string TitleName, string? VolumeLabel, string ConditionGrade, int Quantity, long UnitCost);

public record CustomerBuybackHistoryItem(
    Guid ReceiptId,
    string Code,
    string Status,
    DateTime OccurredAt,
    long TotalAmount,
    bool IsPaidOut,
    bool NeedsApproval,
    IReadOnlyList<BuybackLineSummary> Lines);

public record CustomerViolationItem(
    Guid LineId,
    Guid SlipId,
    string SlipNo,
    Guid? ReturnId,
    string? ReturnNo,
    Guid CopyId,
    string CopyBarcode,
    string TitleName,
    string? VolumeLabel,
    DateTime OccurredAt,
    DateTime DueAt,
    string Result,
    int LateDays,
    long LatePenalty,
    long DamagePenalty,
    long LostRetainedAmount,
    long OutstandingAmount);