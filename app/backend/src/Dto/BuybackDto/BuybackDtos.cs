using backend.src.Models.Enums;

namespace backend.src.Dto.BuybackDto;

public record BuybackQuery(
    string? Search = null,
    ApprovalStatus? Status = null,
    int Page = 1,
    int PageSize = 20
)
{
    public int Page { get; init; } = Page < 1 ? 1 : Page;
    public int PageSize { get; init; } = PageSize < 1 ? 20 : (PageSize > 100 ? 100 : PageSize);
}

public record BuybackIsbnLookupResponse(
    Guid EditionId,
    Guid TitleId,
    string TitleName,
    string? Author,
    string? Publisher,
    short? PublishYear,
    string? Isbn,
    long CoverPrice,
    long GradeAMinPrice,
    long GradeAMaxPrice,
    long GradeBMinPrice,
    long GradeBMaxPrice,
    long GradeCMinPrice,
    long GradeCMaxPrice,
    long GradeDMinPrice,
    long GradeDMaxPrice
);

public record CreateCustomerBuybackLineRequest(
    Guid? EditionId = null,
    string? Isbn = null,
    string? TitleName = null,
    ConditionGrade ConditionGrade = ConditionGrade.B,
    long AgreedBuyPrice = 0,
    long ExpectedSellingPrice = 0,
    int Quantity = 1,
    string? ConditionNote = null
);

public record CreateCustomerBuybackRequest(
    string? SellerName,
    string? SellerPhone,
    PaymentMethod PayoutMethod = PaymentMethod.CASH,
    string? ExceedReason = null,
    string? ManagerPin = null,
    bool CompleteImmediately = false,
    IReadOnlyList<CreateCustomerBuybackLineRequest>? Lines = null
);

public record CompleteCustomerBuybackRequest(
    PaymentMethod PayoutMethod = PaymentMethod.CASH,
    string? ManagerPin = null,
    string? Note = null
);

public record CustomerBuybackLineResponse(
    Guid Id,
    Guid EditionId,
    string TitleName,
    string? Isbn,
    ConditionGrade ConditionGrade,
    long CoverPrice,
    long AgreedBuyPrice,
    long ExpectedSellingPrice,
    int Quantity,
    bool OverSingleLimit,
    IReadOnlyList<string> Barcodes,
    BookCopyStatus? CopyStatus
);

public record CustomerBuybackDetailResponse(
    Guid Id,
    string Code,
    Guid? SellerId,
    string SellerName,
    string SellerPhone,
    ApprovalStatus Status,
    bool NeedsApproval,
    long TotalAmount,
    int TotalCopies,
    int GeneratedCopyCount,
    PaymentMethod PayoutMethod,
    string? PaymentNo,
    long CashDrawerBefore,
    long CashDrawerAfter,
    string? Note,
    Guid CreatedBy,
    string CreatedByName,
    DateTime CreatedAt,
    Guid? ApprovedBy,
    string? ApprovedByName,
    DateTime? ApprovedAt,
    DateTime? CompletedAt,
    IReadOnlyList<CustomerBuybackLineResponse> Lines
);
