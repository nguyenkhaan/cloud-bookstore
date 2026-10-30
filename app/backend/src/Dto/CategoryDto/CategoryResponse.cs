namespace backend.src.Dto.CategoryDto;

public record CategoryResponse(
    Guid Id,
    Guid? ParentId,
    string? ParentName,
    string Name,
    bool IsActive
);