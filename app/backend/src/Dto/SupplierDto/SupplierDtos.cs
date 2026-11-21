namespace backend.src.Dto.SupplierDto;

public record SupplierQuery(
    string? Search = null,
    bool? IsActive = null,
    bool? HasPending = null,
    int Page = 1,
    int PageSize = 20
)
{
    public int Page { get; init; } = Page < 1 ? 1 : Page;
    public int PageSize { get; init; } = PageSize < 1 ? 20 : (PageSize > 100 ? 100 : PageSize);
}

public record SupplierResponse(
    Guid Id,
    string Code,
    string Name,
    string? Phone,
    string? Address,
    string? TaxCode,
    bool IsActive,
    int ReceiptCount,
    long TotalImportAmount,
    long PendingAmount,
    int PendingReceiptCount
);

public record SupplierStatsResponse(
    int ActiveCount,
    int InactiveCount,
    int TotalCount,
    long TotalImportAmount,
    long TotalPendingAmount,
    int PendingReceiptCount
);

public record CreateSupplierRequest(
    string Name,
    string? Phone = null,
    string? Address = null,
    string? TaxCode = null,
    bool IsActive = true
);

public record UpdateSupplierRequest(
    string Name,
    string? Phone = null,
    string? Address = null,
    string? TaxCode = null,
    bool? IsActive = null
);

public record UpdateSupplierStatusRequest(
    bool IsActive
);
