using backend.src.Infrastructure;
using Xunit;

namespace backend.Tests.Infrastructure;

public sealed class CsrfTokenServiceTests
{
    [Fact]
    public async Task IssueAsync_BindsTheTokenToItsAccessSession()
    {
        var service = new CsrfTokenService(new InMemoryCsrfTokenStore());

        var token = await service.IssueAsync("access-jti", TimeSpan.FromMinutes(15));

        Assert.True(await service.IsValidAsync("access-jti", token));
        Assert.False(await service.IsValidAsync("another-access-jti", token));
    }

    [Fact]
    public async Task IsValidAsync_RejectsAnIncorrectOrRevokedToken()
    {
        var service = new CsrfTokenService(new InMemoryCsrfTokenStore());
        var token = await service.IssueAsync("access-jti", TimeSpan.FromMinutes(15));

        Assert.False(await service.IsValidAsync("access-jti", $"invalid-{token}"));

        await service.RevokeAsync("access-jti");

        Assert.False(await service.IsValidAsync("access-jti", token));
    }

    private sealed class InMemoryCsrfTokenStore : ICsrfTokenStore
    {
        private readonly Dictionary<string, string> values = [];

        public Task<string?> GetAsync(string accessJti, CancellationToken cancellationToken = default)
            => Task.FromResult(values.GetValueOrDefault(accessJti));

        public Task RemoveAsync(string accessJti, CancellationToken cancellationToken = default)
        {
            values.Remove(accessJti);
            return Task.CompletedTask;
        }

        public Task StoreAsync(
            string accessJti,
            string tokenHash,
            TimeSpan lifetime,
            CancellationToken cancellationToken = default)
        {
            values[accessJti] = tokenHash;
            return Task.CompletedTask;
        }
    }
}
