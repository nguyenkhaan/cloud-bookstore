namespace backend.src.Exceptions;

public sealed class NotFoundException(string message, string? code = null)
    : ApiException(message, StatusCodes.Status404NotFound, code);