using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;

namespace backend.src.Dto.BookCopyDto;

public record UpdateBookCopyStatusRequest(
    [Required(ErrorMessage = "Status không được để trống.")]
    BookCopyStatus? Status,

    [Required(ErrorMessage = "Lý do chuyển trạng thái không được để trống.")]
    [MaxLength(500, ErrorMessage = "Lý do không được vượt quá 500 ký tự.")]
    string Reason
);