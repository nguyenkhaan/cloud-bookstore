using System.ComponentModel.DataAnnotations;

namespace backend.src.Dto.AuthDto;

public sealed class ResendVerificationRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}
