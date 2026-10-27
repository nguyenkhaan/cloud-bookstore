namespace backend.src.Infrastructure;

public sealed class RedisCsrfTokenStore(RedisService redisService) : ICsrfTokenStore
{
    public Task StoreAsync(
        string accessJti,
        string tokenHash,
        TimeSpan lifetime,
        CancellationToken cancellationToken = default)
        => redisService.SetAsync(
            RedisKeyManager.ForCsrf(accessJti),
            tokenHash,
            lifetime,
            cancellationToken);

    public Task<string?> GetAsync(string accessJti, CancellationToken cancellationToken = default)
        => redisService.GetAsync<string>(RedisKeyManager.ForCsrf(accessJti), cancellationToken);

    public async Task RemoveAsync(string accessJti, CancellationToken cancellationToken = default)
    {
        await redisService.DeleteAsync(RedisKeyManager.ForCsrf(accessJti), cancellationToken);
    }
}
