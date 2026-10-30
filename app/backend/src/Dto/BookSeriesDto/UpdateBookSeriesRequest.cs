using System.ComponentModel.DataAnnotations;

namespace backend.src.Dto.BookSeriesDto;

public record UpdateBookSeriesRequest(
    [Required(ErrorMessage = "Tên bộ sách không được để trống.")]
    [MaxLength(255, ErrorMessage = "Tên bộ sách không được vượt quá 255 ký tự.")]
    string Name,

    string? Description = null,

    bool? IsActive = null
);