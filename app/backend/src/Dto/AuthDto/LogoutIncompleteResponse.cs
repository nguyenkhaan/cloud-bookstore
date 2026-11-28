namespace backend.src.Dto.AuthDto;

public sealed record LogoutIncompleteResponse(
    string Code,
    bool CookiesCleared,
    bool RevocationCompleted,
    string Message);
