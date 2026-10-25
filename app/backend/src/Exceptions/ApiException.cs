namespace backend.src.Exceptions;

public abstract class ApiException(string message, int statusCode, string? code = null) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
    public string? Code { get; } = code;
}