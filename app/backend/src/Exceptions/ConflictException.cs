namespace backend.src.Exceptions;

public sealed class ConflictException(string message) : Exception(message)
{
}
