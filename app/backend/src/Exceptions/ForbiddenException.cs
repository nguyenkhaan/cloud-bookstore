namespace backend.src.Exceptions;

public sealed class ForbiddenException(string message, string? code = null)
    : ApiException(message, StatusCodes.Status403Forbidden, code);