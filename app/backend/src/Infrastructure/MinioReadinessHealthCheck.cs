using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace backend.src.Infrastructure;

public sealed class MinioReadinessHealthCheck(
    IMinioService minioService,
    ILogger<MinioReadinessHealthCheck> logger) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return await minioService.BucketExistsAsync(cancellationToken)
                ? HealthCheckResult.Healthy("MinIO bucket is reachable.")
                : HealthCheckResult.Unhealthy("MinIO bucket does not exist.");
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "MinIO readiness check failed.");
            return HealthCheckResult.Unhealthy("MinIO is unavailable.", exception);
        }
    }
}