using System.ComponentModel.DataAnnotations;
namespace backend.src.Dto.AuthDto;

public class RegisterRequest
{
    private string phone = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    [Required]
    [MaxLength(200)]
    public string FullName { get; set; } = string.Empty;
    [Required]
    [MaxLength(512)]
    public string Password { get; set; } = string.Empty;
    [Required]
    [RegularExpression(@"^0[0-9]{9}$", ErrorMessage = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.")]
    public string Phone { get => phone; set => phone = value?.Trim() ?? string.Empty; }
}
