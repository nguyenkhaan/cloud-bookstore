using System.ComponentModel.DataAnnotations;

namespace backend.src.Dto.BookCopyDto;

public record BookCopyLabelRequest(
    [MaxLength(500, ErrorMessage = "Lý do không được vượt quá 500 ký tự.")]
    string? Reason = null
);