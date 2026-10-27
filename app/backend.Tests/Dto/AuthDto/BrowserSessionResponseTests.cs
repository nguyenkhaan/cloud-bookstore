using System.Text.Json;
using backend.src.Dto.AuthDto;
using Xunit;

namespace backend.Tests.Dto.AuthDto;

public sealed class BrowserSessionResponseTests
{
    [Fact]
    public void Serialize_ExposesOnlyTheCsrfToken()
    {
        var json = JsonSerializer.Serialize(
            new BrowserSessionResponse("csrf-token"),
            new JsonSerializerOptions(JsonSerializerDefaults.Web));

        Assert.Contains("csrfToken", json, StringComparison.Ordinal);
        Assert.DoesNotContain("accessToken", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("refreshToken", json, StringComparison.OrdinalIgnoreCase);
    }
}
