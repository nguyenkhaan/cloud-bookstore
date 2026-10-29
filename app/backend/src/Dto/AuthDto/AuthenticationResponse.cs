namespace backend.src.Dto.AuthDto;

public sealed record AuthenticationResponse(
    string AccessToken,
    string RefreshToken,
    string CsrfToken);
