using System.ComponentModel.DataAnnotations;

namespace backend.src.Dto.AuthDto;

public sealed class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; init; } = string.Empty;

    [Required, MinLength(12), MaxLength(128)]
    public string NewPassword { get; init; } = string.Empty;
}
