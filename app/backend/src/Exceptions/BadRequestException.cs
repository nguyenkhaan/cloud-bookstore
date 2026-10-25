namespace backend.src.Exceptions;

public sealed class BadRequestException(string message, string? code = null)
    : ApiException(message, StatusCodes.Status400BadRequest, code);