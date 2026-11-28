using System.ComponentModel.DataAnnotations;

namespace backend.src.Dto.AuthDto;

public sealed class UpdateProfileRequest
{
    [Required, MinLength(2), MaxLength(200)]
    public string FullName { get; init; } = string.Empty;

    [Required, RegularExpression(@"^0[0-9]{9}$", ErrorMessage = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.")]
    public string Phone { get; init; } = string.Empty;
}
