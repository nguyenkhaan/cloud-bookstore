using System.ComponentModel.DataAnnotations;
using backend.src.Dto.UploadDto;
using backend.src.Models.Enums;

namespace backend.src.Dto.BookCopyDto;

public record UpdateBookCopyRequest(
    [Required(ErrorMessage = "ConditionGrade không được để trống.")]
    ConditionGrade? ConditionGrade,

    [Required(ErrorMessage = "Availability không được để trống.")]
    BookChannelAvailability? Availability,

    [Required(ErrorMessage = "Lý do thay đổi không được để trống.")]
    [MaxLength(500, ErrorMessage = "Lý do không được vượt quá 500 ký tự.")]
    string Reason,

    string? ConditionNote = null,

    [Range(0, long.MaxValue, ErrorMessage = "Giá bán (SellingPrice) phải lớn hơn hoặc bằng 0.")]
    long? SellingPrice = null,

    [Range(0, long.MaxValue, ErrorMessage = "Giá thuê (RentalRate) phải lớn hơn hoặc bằng 0.")]
    long? RentalRate = null,

    [MaxLength(30, ErrorMessage = "Vị trí kệ không được vượt quá 30 ký tự.")]
    string? ShelfCode = null,

    CloudinaryUploadResultRequest? ImageUpload = null
);