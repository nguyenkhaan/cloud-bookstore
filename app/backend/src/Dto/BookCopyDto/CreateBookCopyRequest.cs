using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;

namespace backend.src.Dto.BookCopyDto;

public record CreateBookCopyRequest(
    [Required(ErrorMessage = "EditionId không được để trống.")]
    Guid EditionId,

    [Required(ErrorMessage = "ReceiptLineId không được để trống.")]
    Guid ReceiptLineId,

    ConditionGrade? ConditionGrade = null,

    BookChannelAvailability? Availability = null,

    string? ConditionNote = null,

    [Range(0, long.MaxValue, ErrorMessage = "Giá bán (SellingPrice) phải lớn hơn hoặc bằng 0.")]
    long? SellingPrice = null,

    [Range(0, long.MaxValue, ErrorMessage = "Giá thuê (RentalRate) phải lớn hơn hoặc bằng 0.")]
    long? RentalRate = null,

    [MaxLength(30, ErrorMessage = "Vị trí kệ không được vượt quá 30 ký tự.")]
    string? ShelfCode = null,

    [MaxLength(500, ErrorMessage = "Lý do không được vượt quá 500 ký tự.")]
    string? Reason = null
);