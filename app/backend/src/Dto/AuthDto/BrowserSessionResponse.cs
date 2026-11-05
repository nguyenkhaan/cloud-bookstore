namespace backend.src.Dto.AuthDto;

public sealed record BrowserSessionUser(
    Guid Id,
    string Email,
    string FullName,
    string Role);

public sealed record BrowserSessionResponse(
    string CsrfToken,
    BrowserSessionUser? User = null);

