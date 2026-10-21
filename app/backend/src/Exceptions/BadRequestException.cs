namespace backend.src.Exceptions;

public sealed class BadRequestException(string message) : Exception(message)
{
}
