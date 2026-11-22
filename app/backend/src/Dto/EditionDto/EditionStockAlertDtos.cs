namespace backend.src.Dto.EditionDto;

public record EditionStockAlertQuery(
    string? Search = null,
    string? Channel = null,
    string? Severity = null,
    Guid? SupplierId = null,
    bool OnlyAlerts = false
);

public record EditionStockAlertItemResponse(
    Guid EditionId,
    Guid TitleId,
    string TitleName,
    string? VolumeLabel,
    string? EditionStatement,
    string? Isbn,
    string? Publisher,
    short? PublishYear,
    long CoverPrice,
    int MinStockSale,
    int MinStockRental,
    int AvailableSale,
    int AvailableRental,
    int RentedCount,
    int TotalPhysical,
    int PendingImportCount,
    int SaleDeficit,
    int RentalDeficit,
    int SuggestedRestockCount,
    bool IsSaleLow,
    bool IsRentalLow,
    string Severity,
    string SeverityLabel,
    string SuggestionText,
    Guid? PreferredSupplierId,
    string? PreferredSupplierCode,
    string? PreferredSupplierName
);

public record EditionStockAlertDashboardResponse(
    int AlertEditionCount,
    int RentalLowEditionCount,
    int PendingImportCopiesCount,
    int PendingImportEditionCount,
    string? LatestPendingReceiptCode,
    int TotalSuggestedRestockCount,
    IReadOnlyList<EditionStockAlertItemResponse> Items
);

public record UpdateEditionThresholdsRequest(
    int? MinStockSale = null,
    int? MinStockRental = null
);
