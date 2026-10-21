namespace backend.src.Exceptions;

public sealed class InternalServerErrorException(string message) : Exception(message)
{
}
