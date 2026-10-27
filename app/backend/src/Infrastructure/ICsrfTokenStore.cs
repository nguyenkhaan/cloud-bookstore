namespace backend.src.Infrastructure;

public interface ICsrfTokenStore
{
    Task StoreAsync(
        string accessJti,
        string tokenHash,
        TimeSpan lifetime,
        CancellationToken cancellationToken = default);

    Task<string?> GetAsync(string accessJti, CancellationToken cancellationToken = default);

    Task RemoveAsync(string accessJti, CancellationToken cancellationToken = default);
}
