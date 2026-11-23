using backend.src.Infrastructure;
using Xunit;

namespace backend.Tests.Infrastructure;

public sealed class CsrfTokenServiceTests
{
    private static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(30);

    [Fact]
    public async Task IssueAsync_returns_the_same_token_for_the_same_session()
    {
        var service = CreateService(new InMemoryCsrfTokenStore());

        var first = await service.IssueAsync("jti-1", Lifetime);
        var second = await service.IssueAsync("jti-1", Lifetime);

        Assert.Equal(first, second);
    }

    [Fact]
    public async Task Token_issued_earlier_stays_valid_after_session_is_read_again()
    {
        var service = CreateService(new InMemoryCsrfTokenStore());

        var tabA = await service.IssueAsync("jti-1", Lifetime);
        _ = await service.IssueAsync("jti-1", Lifetime);

        Assert.True(await service.IsValidAsync("jti-1", tabA));
    }

    [Fact]
    public async Task Tokens_differ_between_sessions_and_do_not_cross_validate()
    {
        var service = CreateService(new InMemoryCsrfTokenStore());

        var tokenA = await service.IssueAsync("jti-a", Lifetime);
        var tokenB = await service.IssueAsync("jti-b", Lifetime);

        Assert.NotEqual(tokenA, tokenB);
        Assert.False(await service.IsValidAsync("jti-b", tokenA));
    }

    [Fact]
    public async Task Different_signing_secrets_produce_different_tokens()
    {
        var store = new InMemoryCsrfTokenStore();
        var tokenA = await new CsrfTokenService(store, CsrfTokenSigningKey.FromSecret("secret-a-0123456789")).IssueAsync("jti-1", Lifetime);
        var tokenB = await new CsrfTokenService(store, CsrfTokenSigningKey.FromSecret("secret-b-0123456789")).IssueAsync("jti-1", Lifetime);

        Assert.NotEqual(tokenA, tokenB);
    }

    [Fact]
    public async Task Revoked_session_token_is_no_longer_valid()
    {
        var service = CreateService(new InMemoryCsrfTokenStore());
        var token = await service.IssueAsync("jti-1", Lifetime);

        await service.RevokeAsync("jti-1");

        Assert.False(await service.IsValidAsync("jti-1", token));
    }

    [Fact]
    public async Task Never_issued_session_rejects_a_correctly_derived_token()
    {
        var store = new InMemoryCsrfTokenStore();
        var issuer = CreateService(store);
        var token = await issuer.IssueAsync("jti-1", Lifetime);
        await issuer.RevokeAsync("jti-1");

        Assert.False(await CreateService(store).IsValidAsync("jti-1", token));
    }

    internal static CsrfTokenService CreateService(ICsrfTokenStore store)
        => new(store, CsrfTokenSigningKey.FromSecret("unit-test-access-secret-0123456789"));
}

internal sealed class InMemoryCsrfTokenStore : ICsrfTokenStore
{
    private readonly Dictionary<string, string> values = new();

    public Task StoreAsync(string accessJti, string tokenHash, TimeSpan lifetime, CancellationToken cancellationToken = default)
    {
        values[accessJti] = tokenHash;
        return Task.CompletedTask;
    }

    public Task<string?> GetAsync(string accessJti, CancellationToken cancellationToken = default)
        => Task.FromResult(values.TryGetValue(accessJti, out var value) ? value : null);

    public Task RemoveAsync(string accessJti, CancellationToken cancellationToken = default)
    {
        values.Remove(accessJti);
        return Task.CompletedTask;
    }
}
