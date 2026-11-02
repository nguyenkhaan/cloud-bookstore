using backend.src.Models.Enums;

namespace backend.src.Dto.BookCopyDto;

public record BookCopyLabelResponse(
    Guid CopyId,
    string CopyBarcode,
    string? Isbn,
    string TitleName,
    string? VolumeLabel,
    string? SeriesName,
    string? Author,
    string? Publisher,
    short? PublishYear,
    ConditionGrade ConditionGrade,
    BookChannelAvailability Availability,
    long? SellingPrice,
    long? RentalRate,
    string? ShelfCode,
    bool IsReprint,
    int PrintCount,
    DateTime GeneratedAt
);