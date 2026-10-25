namespace backend.src.Exceptions;

public sealed class ConflictException(string message, string? code = null)
    : ApiException(message, StatusCodes.Status409Conflict, code);