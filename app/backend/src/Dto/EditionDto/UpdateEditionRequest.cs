using System.ComponentModel.DataAnnotations;
using backend.src.Models.Enums;

namespace backend.src.Dto.EditionDto;

public record UpdateEditionRequest(
    Guid? TitleId = null,

    [MaxLength(20, ErrorMessage = "ISBN không được vượt quá 20 ký tự.")]
    string? Isbn = null,

    [MaxLength(100, ErrorMessage = "Thông tin ấn bản không được vượt quá 100 ký tự.")]
    string? EditionStatement = null,

    [MaxLength(100, ErrorMessage = "Thông tin lần in không được vượt quá 100 ký tự.")]
    string? PrintingStatement = null,

    [MaxLength(100, ErrorMessage = "Định dạng không được vượt quá 100 ký tự.")]
    string? Format = null,

    [MaxLength(255, ErrorMessage = "Nhà xuất bản không được vượt quá 255 ký tự.")]
    string? Publisher = null,

    [Range(1000, 2100, ErrorMessage = "Năm xuất bản không hợp lệ.")]
    short? PublishYear = null,

    [Range(0, long.MaxValue, ErrorMessage = "Giá bìa phải lớn hơn hoặc bằng 0.")]
    long CoverPrice = 0,

    [Range(0, int.MaxValue, ErrorMessage = "Ngưỡng tồn tối thiểu kênh bán phải lớn hơn hoặc bằng 0.")]
    int MinStockSale = 0,

    [Range(0, int.MaxValue, ErrorMessage = "Ngưỡng tồn tối thiểu kênh thuê phải lớn hơn hoặc bằng 0.")]
    int MinStockRental = 0,

    string? CoverImageUrl = null,

    MetadataSource? MetadataSource = null,

    Guid? MetadataConfirmedBy = null,

    bool? IsActive = null
);