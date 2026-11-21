using backend.src.Models.Enums;

namespace backend.src.Dto.StockReceiptDto;

public record StockReceiptQuery(
    string? Search = null,
    Guid? SupplierId = null,
    ApprovalStatus? Status = null,
    StockReceiptSourceType? SourceType = null,
    int Page = 1,
    int PageSize = 20
)
{
    public int Page { get; init; } = Page < 1 ? 1 : Page;
    public int PageSize { get; init; } = PageSize < 1 ? 20 : (PageSize > 100 ? 100 : PageSize);
}

public record StockReceiptSummaryResponse(
    Guid Id,
    string Code,
    StockReceiptSourceType SourceType,
    Guid? SupplierId,
    string? SupplierCode,
    string? SupplierName,
    ApprovalStatus Status,
    long TotalAmount,
    int LineCount,
    int TotalCopies,
    int GeneratedCopyCount,
    string? Note,
    Guid CreatedBy,
    string? CreatedByName,
    DateTime CreatedAt,
    DateTime? CompletedAt
);

public record StockReceiptLineResponse(
    Guid Id,
    Guid EditionId,
    Guid TitleId,
    string TitleName,
    string? VolumeLabel,
    string? Isbn,
    string? Publisher,
    short? PublishYear,
    string? EditionStatement,
    string? Format,
    long CoverPrice,
    int Quantity,
    long UnitCost,
    ConditionGrade ConditionGrade,
    string? ConditionNote,
    BookChannelAvailability Availability,
    long? SellingPrice,
    long? RentalRate,
    int GeneratedCopyCount,
    string? FirstBarcode,
    string? LastBarcode,
    IReadOnlyList<string> Barcodes,
    BookCopyStatus? CopyStatus
);

public record StockReceiptDetailResponse(
    Guid Id,
    string Code,
    StockReceiptSourceType SourceType,
    Guid? SupplierId,
    string? SupplierCode,
    string? SupplierName,
    ApprovalStatus Status,
    long TotalAmount,
    int LineCount,
    int TotalCopies,
    int GeneratedCopyCount,
    string? Note,
    Guid CreatedBy,
    string? CreatedByName,
    DateTime CreatedAt,
    DateTime? CompletedAt,
    IReadOnlyList<StockReceiptLineResponse> Lines
);

public record CreateStockReceiptLineRequest(
    Guid EditionId,
    int Quantity = 1,
    long UnitCost = 0,
    ConditionGrade ConditionGrade = ConditionGrade.A,
    BookChannelAvailability Availability = BookChannelAvailability.BOTH,
    string? ConditionNote = null
);

public record CreateStockReceiptRequest(
    Guid SupplierId,
    string? Note = null,
    IReadOnlyList<CreateStockReceiptLineRequest>? Lines = null
);

public record UpdateStockReceiptRequest(
    Guid SupplierId,
    string? Note = null,
    IReadOnlyList<CreateStockReceiptLineRequest>? Lines = null
);

public record CompleteStockReceiptLinePricingRequest(
    Guid? LineId = null,
    Guid? EditionId = null,
    long? SellingPrice = null,
    long? RentalRate = null,
    BookChannelAvailability? Availability = null,
    string? ShelfCode = null
);

public record CompleteStockReceiptRequest(
    bool ActivateImmediately = true,
    string? Note = null,
    IReadOnlyList<CompleteStockReceiptLinePricingRequest>? Lines = null
);

public record ActivateStockReceiptCopiesRequest(
    IReadOnlyList<CompleteStockReceiptLinePricingRequest>? Lines = null
);
