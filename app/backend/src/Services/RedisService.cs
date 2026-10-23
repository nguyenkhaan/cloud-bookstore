using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace backend.src.Services;

public sealed class RedisService(HttpClient httpClient, IConfiguration configuration)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        var result = await ExecuteAsync(["GET", ValidateKey(key)], cancellationToken);
        if (result.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
        {
            return default;
        }

        if (result.ValueKind != JsonValueKind.String)
        {
            throw new InvalidOperationException("Redis returned an invalid value for GET.");
        }

        return JsonSerializer.Deserialize<T>(result.GetString()!, JsonOptions);
    }

    public async Task SetAsync<T>(
        string key,
        T value,
        TimeSpan? expiry = null,
        CancellationToken cancellationToken = default)
    {
        var command = new List<string> { "SET", ValidateKey(key), JsonSerializer.Serialize(value, JsonOptions) };
        if (expiry is not null)
        {
            if (expiry <= TimeSpan.Zero)
            {
                throw new ArgumentOutOfRangeException(nameof(expiry), "Expiry must be greater than zero.");
            }

            command.Add("PX");
            command.Add(Math.Ceiling(expiry.Value.TotalMilliseconds).ToString(System.Globalization.CultureInfo.InvariantCulture));
        }

        var result = await ExecuteAsync(command, cancellationToken);
        if (result.ValueKind != JsonValueKind.String || !string.Equals(result.GetString(), "OK", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Redis did not confirm the value was stored.");
        }
    }

    public async Task<bool> DeleteAsync(string key, CancellationToken cancellationToken = default)
    {
        var result = await ExecuteAsync(["DEL", ValidateKey(key)], cancellationToken);
        return GetIntegerResult(result, "DEL") > 0;
    }

    public async Task<bool> ExistsAsync(string key, CancellationToken cancellationToken = default)
    {
        var result = await ExecuteAsync(["EXISTS", ValidateKey(key)], cancellationToken);
        return GetIntegerResult(result, "EXISTS") > 0;
    }

    public async Task<bool> PingAsync(CancellationToken cancellationToken = default)
    {
        var result = await ExecuteAsync(["PING"], cancellationToken);
        return result.ValueKind == JsonValueKind.String
            && string.Equals(result.GetString(), "PONG", StringComparison.OrdinalIgnoreCase);
    }

    private async Task<JsonElement> ExecuteAsync(IReadOnlyCollection<string> command, CancellationToken cancellationToken)
    {
        var restUrl = configuration["UpstashRedis:RestUrl"];
        var restToken = configuration["UpstashRedis:RestToken"];
        if (string.IsNullOrWhiteSpace(restUrl) || string.IsNullOrWhiteSpace(restToken))
        {
            throw new InvalidOperationException("Upstash Redis REST configuration is missing.");
        }

        if (!Uri.TryCreate(restUrl, UriKind.Absolute, out var endpoint))
        {
            throw new InvalidOperationException("Upstash Redis REST URL is invalid.");
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = new StringContent(JsonSerializer.Serialize(command), Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", restToken);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException($"Upstash Redis returned HTTP {(int)response.StatusCode}.");
        }

        using var document = JsonDocument.Parse(responseBody);
        if (document.RootElement.TryGetProperty("error", out var error))
        {
            throw new InvalidOperationException($"Upstash Redis returned an error: {error.GetString()}");
        }

        if (!document.RootElement.TryGetProperty("result", out var result))
        {
            throw new InvalidOperationException("Upstash Redis response did not contain a result.");
        }

        return result.Clone();
    }

    private static string ValidateKey(string key)
    {
        return !string.IsNullOrWhiteSpace(key)
            ? key
            : throw new ArgumentException("Redis key is required.", nameof(key));
    }

    private static long GetIntegerResult(JsonElement result, string command)
    {
        return result.ValueKind == JsonValueKind.Number && result.TryGetInt64(out var value)
            ? value
            : throw new InvalidOperationException($"Redis returned an invalid value for {command}.");
    }
}
