using System.ComponentModel.DataAnnotations;

namespace backend.src.Dto.CategoryDto;

public record CreateCategoryRequest(
    [Required(ErrorMessage = "Tên thể loại không được để trống.")]
    [MaxLength(100, ErrorMessage = "Tên thể loại không được vượt quá 100 ký tự.")]
    string Name,

    Guid? ParentId = null,

    bool IsActive = true
);