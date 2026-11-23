using System.Security.Cryptography;
using Microsoft.AspNetCore.WebUtilities;

namespace backend.src.Infrastructure;

/// <summary>
/// Per-session synchronizer CSRF token. The token is an HMAC of the access-token JTI, so every
/// read of the same session (another tab, a reload) returns the same token instead of rotating
/// it and invalidating copies held elsewhere. Redis still holds its hash: a session is only
/// valid while that entry exists, and logout removes it.
/// </summary>
public sealed class CsrfTokenService(ICsrfTokenStore tokenStore, CsrfTokenSigningKey signingKey)
{
    public async Task<string> IssueAsync(
        string accessJti,
        TimeSpan lifetime,
        CancellationToken cancellationToken = default)
    {
        var token = WebEncoders.Base64UrlEncode(
            HMACSHA256.HashData(signingKey.Value, System.Text.Encoding.UTF8.GetBytes(accessJti)));
        await tokenStore.StoreAsync(accessJti, HashToken(token), lifetime, cancellationToken);
        return token;
    }

    public async Task<bool> IsValidAsync(
        string accessJti,
        string? presentedToken,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accessJti) || string.IsNullOrWhiteSpace(presentedToken))
        {
            return false;
        }

        var storedHash = await tokenStore.GetAsync(accessJti, cancellationToken);
        if (string.IsNullOrWhiteSpace(storedHash))
        {
            return false;
        }

        try
        {
            var expectedHash = Convert.FromBase64String(storedHash);
            var actualHash = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(presentedToken));
            return CryptographicOperations.FixedTimeEquals(expectedHash, actualHash);
        }
        catch (FormatException)
        {
            return false;
        }
    }

    public Task RevokeAsync(string accessJti, CancellationToken cancellationToken = default)
        => tokenStore.RemoveAsync(accessJti, cancellationToken);

    private static string HashToken(string token)
        => Convert.ToBase64String(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token)));
}
