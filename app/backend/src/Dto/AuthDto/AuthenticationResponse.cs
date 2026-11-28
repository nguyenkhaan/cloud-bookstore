namespace backend.src.Dto.AuthDto;

public sealed record AuthenticationResponse(string CsrfToken, BrowserSessionUser? User = null);

