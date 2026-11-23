using System.ComponentModel.DataAnnotations;

namespace backend.src.Dto.CategoryDto;

public record UpdateCategoryStatusRequest(
    [Required] bool IsActive
);