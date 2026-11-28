using System.ComponentModel.DataAnnotations;

namespace backend.src.Dto.AuthDto;

public record class LoginRequest(
    [Required, MaxLength(320)] string Email,
    [Required, MaxLength(512)] string Password);
