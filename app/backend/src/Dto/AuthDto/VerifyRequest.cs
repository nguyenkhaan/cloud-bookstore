using System.ComponentModel.DataAnnotations;

namespace backend.src.Dto.AuthDto;

public class VerifyRequest
{
    [Required]
    public string Token { get; set; } = string.Empty;
}
