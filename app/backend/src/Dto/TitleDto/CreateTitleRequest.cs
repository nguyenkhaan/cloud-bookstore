using System.ComponentModel.DataAnnotations;

namespace backend.src.Dto.TitleDto;

public record CreateTitleRequest(
    [Required(ErrorMessage = "Tên đầu sách không được để trống.")]
    [MaxLength(255, ErrorMessage = "Tên đầu sách không được vượt quá 255 ký tự.")]
    string Name,

    Guid? SeriesId = null,

    [MaxLength(30, ErrorMessage = "Nhãn tập không được vượt quá 30 ký tự.")]
    string? VolumeLabel = null,

    Guid? CategoryId = null,

    [MaxLength(255, ErrorMessage = "Tên tác giả không được vượt quá 255 ký tự.")]
    string? Author = null,

    short? OriginalPublishYear = null,

    string? Description = null,

    bool IsActive = true
);