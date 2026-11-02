using backend.src.Models.Enums;

namespace backend.src.Dto.BookCopyDto;

public record BookCopyDetailResponse(
    Guid Id,
    string CopyBarcode,
    // Ấn bản
    Guid EditionId,
    string? Isbn,
    string? EditionStatement,
    string? PrintingStatement,
    string? Format,
    string? Publisher,
    short? PublishYear,
    long CoverPrice,
    string? CoverImageUrl,
    bool EditionIsActive,
    // Đầu sách / bộ / thể loại
    Guid TitleId,
    string TitleName,
    string? VolumeLabel,
    string? Author,
    Guid? SeriesId,
    string? SeriesName,
    Guid? CategoryId,
    string? CategoryName,
    // Bản vật lý
    ConditionGrade ConditionGrade,
    string? ConditionNote,
    BookCopyStatus Status,
    BookChannelAvailability Availability,
    long? CostPrice,
    long? SellingPrice,
    long? RentalRate,
    string? ShelfCode,
    DateTime CreatedAt,
    // Nguồn nhập
    Guid ReceiptLineId,
    Guid ReceiptId,
    string ReceiptCode,
    StockReceiptSourceType SourceType,
    Guid? SupplierId,
    string? SupplierName,
    Guid? SellerId,
    DateTime? ReceiptCompletedAt
);