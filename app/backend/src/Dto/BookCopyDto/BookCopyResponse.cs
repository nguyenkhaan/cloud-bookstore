using backend.src.Models.Enums;

namespace backend.src.Dto.BookCopyDto;

public record BookCopyResponse(
    Guid Id,
    string CopyBarcode,
    Guid EditionId,
    string? Isbn,
    string? EditionStatement,
    string? PrintingStatement,
    string? Publisher,
    short? PublishYear,
    Guid TitleId,
    string TitleName,
    string? VolumeLabel,
    string? Author,
    Guid? SeriesId,
    string? SeriesName,
    Guid? CategoryId,
    string? CategoryName,
    ConditionGrade ConditionGrade,
    BookCopyStatus Status,
    BookChannelAvailability Availability,
    long? SellingPrice,
    long? RentalRate,
    string? ShelfCode,
    DateTime CreatedAt
);