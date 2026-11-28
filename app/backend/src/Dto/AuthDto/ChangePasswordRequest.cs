using System.ComponentModel.DataAnnotations;

namespace backend.src.Dto.AuthDto;

public sealed class ChangePasswordRequest
{
    [Required, MaxLength(512)]
    public string CurrentPassword { get; init; } = string.Empty;

    [Required]
    [MaxLength(512)]
    public string NewPassword { get; init; } = string.Empty;
}
