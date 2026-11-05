using backend.src.Dto.AuthDto;

namespace backend.src.Services;

public sealed record BrowserAuthenticationSession(
    string AccessToken,
    string RefreshToken,
    string CsrfToken,
    BrowserSessionUser? User = null);

