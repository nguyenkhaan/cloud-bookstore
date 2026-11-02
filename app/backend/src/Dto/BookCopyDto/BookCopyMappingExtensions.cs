using backend.src.Models;

namespace backend.src.Dto.BookCopyDto;

public static class BookCopyMappingExtensions
{
    public static object ToAuditSnapshot(this BookCopyModel copy) => new
    {
        copy.CopyBarcode,
        copy.EditionId,
        copy.ReceiptLineId,
        Availability = copy.Availability.ToString(),
        Status = copy.Status.ToString(),
        ConditionGrade = copy.ConditionGrade.ToString(),
        copy.ConditionNote,
        copy.CostPrice,
        copy.SellingPrice,
        copy.RentalRate,
        copy.ShelfCode
    };
}