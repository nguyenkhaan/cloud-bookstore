using System.ComponentModel.DataAnnotations;

namespace backend.src.Dto.CustomerDto;

public class CreateCustomerRequest
{
    [Required(ErrorMessage = "Họ và tên không được để trống")]
    [MaxLength(150, ErrorMessage = "Họ và tên tối đa 150 ký tự")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Số điện thoại không được để trống")]
    public string Phone { get; set; } = string.Empty;

    [EmailAddress(ErrorMessage = "Email không đúng định dạng")]
    [MaxLength(255)]
    public string? Email { get; set; }

    [MaxLength(20)]
    public string? NationalId { get; set; }

    public string? Address { get; set; }
}
