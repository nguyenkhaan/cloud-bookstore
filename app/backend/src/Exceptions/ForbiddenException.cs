namespace backend.src.Exceptions;

public sealed class ForbiddenException(string message) : Exception(message)
{
}
