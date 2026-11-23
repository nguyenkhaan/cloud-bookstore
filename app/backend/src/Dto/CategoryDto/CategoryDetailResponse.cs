namespace backend.src.Dto.CategoryDto;

public record CategoryDetailResponse(
    Guid Id,
    Guid? ParentId,
    string? ParentName,
    string Name,
    bool IsActive,
    IReadOnlyList<CategoryResponse> SubCategories
);