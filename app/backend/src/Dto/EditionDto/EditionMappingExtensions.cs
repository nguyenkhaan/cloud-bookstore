using backend.src.Models;

namespace backend.src.Dto.EditionDto;

public static class EditionMappingExtensions
{
    public static EditionResponse ToResponse(
        this EditionModel edition,
        string? titleName,
        string? confirmedByName,
        int copiesCount,
        string? imageUrl)
    {
        return new EditionResponse(
            edition.Id,
            edition.Isbn,
            edition.TitleId,
            titleName,
            edition.EditionStatement,
            edition.PrintingStatement,
            edition.Format,
            edition.Publisher,
            edition.PublishYear,
            edition.CoverPrice,
            edition.MinStockSale,
            edition.MinStockRental,
            imageUrl,
            edition.MetadataSource,
            edition.MetadataConfirmedBy,
            confirmedByName,
            edition.MetadataConfirmedAt,
            edition.IsActive,
            copiesCount
        );
    }
}
