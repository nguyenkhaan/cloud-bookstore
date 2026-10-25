namespace backend.src.Services;

public interface IEmailHealthCheck
{
    Task<bool> IsHealthyAsync(CancellationToken cancellationToken);
}
