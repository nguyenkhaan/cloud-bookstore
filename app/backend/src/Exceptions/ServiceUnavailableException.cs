namespace backend.src.Exceptions;

public sealed class ServiceUnavailableException(string message, Exception innerException) : Exception(message, innerException)
{
}
