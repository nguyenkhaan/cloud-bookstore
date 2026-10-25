namespace backend.src.Exceptions;

public sealed class InternalServerErrorException(string message, string? code = null)
    : ApiException(message, StatusCodes.Status500InternalServerError, code);