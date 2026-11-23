using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace backend.src.Infrastructure;

public sealed class RedisReadinessHealthCheck(
    RedisService redisService,
    ILogger<RedisReadinessHealthCheck> logger) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return await redisService.PingAsync(cancellationToken)
                ? HealthCheckResult.Healthy("Redis is reachable.")
                : HealthCheckResult.Unhealthy("Upstash Redis returned an unexpected response.");
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Redis readiness check failed.");
            return HealthCheckResult.Unhealthy("Redis is unavailable.", exception);
        }
    }
}
