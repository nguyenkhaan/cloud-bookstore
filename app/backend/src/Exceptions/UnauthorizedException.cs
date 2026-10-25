namespace backend.src.Exceptions;

public sealed class UnauthorizedException(string message, string? code = null)
    : ApiException(message, StatusCodes.Status401Unauthorized, code);