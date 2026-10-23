using System.ComponentModel.DataAnnotations;

namespace backend.src.Dto.AuthDto;

public sealed class LogoutRequest
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}
