using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace backend.src.Services;

public sealed class RedisReadinessHealthCheck(
    IConfiguration configuration,
    IHttpClientFactory httpClientFactory,
    ILogger<RedisReadinessHealthCheck> logger) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var restUrl = configuration["UpstashRedis:RestUrl"];
        var restToken = configuration["UpstashRedis:RestToken"];
        if (string.IsNullOrWhiteSpace(restUrl) || string.IsNullOrWhiteSpace(restToken))
        {
            return HealthCheckResult.Unhealthy("Upstash Redis REST configuration is missing.");
        }

        try
        {
            if (!Uri.TryCreate(restUrl, UriKind.Absolute, out var endpoint))
            {
                return HealthCheckResult.Unhealthy("Upstash Redis REST URL is invalid.");
            }

            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
            {
                Content = new StringContent("[\"PING\"]", Encoding.UTF8, "application/json")
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", restToken);

            var client = httpClientFactory.CreateClient();
            using var response = await client.SendAsync(request, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return HealthCheckResult.Unhealthy($"Upstash Redis returned HTTP {(int)response.StatusCode}.");
            }

            using var document = JsonDocument.Parse(responseBody);
            if (document.RootElement.TryGetProperty("result", out var result)
                && string.Equals(result.GetString(), "PONG", StringComparison.OrdinalIgnoreCase))
            {
                return HealthCheckResult.Healthy("Redis is reachable.");
            }

            return HealthCheckResult.Unhealthy("Upstash Redis returned an unexpected response.");
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Redis readiness check failed.");
            return HealthCheckResult.Unhealthy("Redis is unavailable.", exception);
        }
    }
}
