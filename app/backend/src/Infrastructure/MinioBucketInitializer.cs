namespace backend.src.Infrastructure;

public sealed class MinioBucketInitializer(
    IMinioService minioService,
    ILogger<MinioBucketInitializer> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            await minioService.EnsureBucketAsync(cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "MinIO bucket initialization failed. Uploads will retry on demand.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}