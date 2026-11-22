using System.ComponentModel.DataAnnotations;

namespace backend.src.Dto.BookCopyDto;

public record UpdateBookCopyShelfRequest(
    [MaxLength(30, ErrorMessage = "Vị trí kệ không được vượt quá 30 ký tự.")]
    string? ShelfCode,

    [Required(ErrorMessage = "Lý do chuyển vị trí kệ không được để trống.")]
    [MaxLength(500, ErrorMessage = "Lý do không được vượt quá 500 ký tự.")]
    string Reason
);
