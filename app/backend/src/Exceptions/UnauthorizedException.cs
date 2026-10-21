namespace backend.src.Exceptions;

public sealed class UnauthorizedException(string message) : Exception(message)
{
}
