using System.Net;
using System.Text;
using System.Text.Json;
using backend.src.Services;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace backend.Tests.Services;

public class RedisServiceTests
{
    [Fact]
    public async Task SetAsync_SendsJsonValueAndExpiry()
    {
        var handler = new StubHandler("{\"result\":\"OK\"}");
        var service = CreateService(handler);

        await service.SetAsync("book:1", new BookCacheItem("Cloud Bookstore"), TimeSpan.FromSeconds(30));

        using var command = JsonDocument.Parse(handler.Body!);
        var items = command.RootElement.EnumerateArray().ToArray();
        Assert.Equal("SET", items[0].GetString());
        Assert.Equal("book:1", items[1].GetString());
        Assert.Equal("{\"name\":\"Cloud Bookstore\"}", items[2].GetString());
        Assert.Equal("PX", items[3].GetString());
        Assert.Equal("30000", items[4].GetString());
        Assert.Equal("Bearer test-token", handler.Authorization);
    }

    [Fact]
    public async Task GetAsync_DeserializesStoredValue()
    {
        var handler = new StubHandler("{\"result\":\"{\\\"name\\\":\\\"Cloud Bookstore\\\"}\"}");
        var service = CreateService(handler);

        var result = await service.GetAsync<BookCacheItem>("book:1");

        Assert.Equal("Cloud Bookstore", result?.Name);
        Assert.Equal("[\"GET\",\"book:1\"]", handler.Body);
    }

    [Fact]
    public async Task GetAsync_ReturnsNullForMissingKey()
    {
        var service = CreateService(new StubHandler("{\"result\":null}"));

        Assert.Null(await service.GetAsync<BookCacheItem>("missing"));
    }

    [Theory]
    [InlineData("DEL", "{\"result\":1}")]
    [InlineData("EXISTS", "{\"result\":1}")]
    public async Task KeyCommands_ReturnTrueWhenRedisReturnsOne(string command, string response)
    {
        var handler = new StubHandler(response);
        var service = CreateService(handler);

        var result = command == "DEL"
            ? await service.DeleteAsync("book:1")
            : await service.ExistsAsync("book:1");

        Assert.True(result);
        Assert.Equal($"[\"{command}\",\"book:1\"]", handler.Body);
    }

    [Fact]
    public async Task PingAsync_ReturnsTrueForPong()
    {
        var service = CreateService(new StubHandler("{\"result\":\"PONG\"}"));

        Assert.True(await service.PingAsync());
    }

    [Fact]
    public async Task GetAsync_ThrowsForUpstashError()
    {
        var service = CreateService(new StubHandler("{\"error\":\"WRONGPASS\"}"));

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.GetAsync<BookCacheItem>("book:1"));
    }

    private static RedisService CreateService(HttpMessageHandler handler)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["UpstashRedis:RestUrl"] = "https://redis.example.test",
                ["UpstashRedis:RestToken"] = "test-token"
            })
            .Build();
        return new RedisService(new HttpClient(handler), configuration);
    }

    private sealed record BookCacheItem(string Name);

    private sealed class StubHandler(string responseBody) : HttpMessageHandler
    {
        public string? Body { get; private set; }
        public string? Authorization { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Body = await request.Content!.ReadAsStringAsync(cancellationToken);
            Authorization = request.Headers.Authorization?.ToString();
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseBody, Encoding.UTF8, "application/json")
            };
        }
    }
}
