using System.ComponentModel.DataAnnotations;

namespace backend.src.Dto.AuthDto;

public sealed class ForgotPasswordRequest
{
    [Required, EmailAddress]
    public string Email { get; init; } = string.Empty;
}
