namespace backend.src.Dto.AuthDto;

public record class LoginResponse(string AccessToken, string RefreshToken);