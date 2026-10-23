using System.IdentityModel.Tokens.Jwt;
using backend.src.Bases.Enums;

namespace backend.src.Services;

public sealed class TokenJtiStore(RedisService redisService)
{
    public async Task StoreAsync(string token, TokenType type, CancellationToken cancellationToken = default)
    {
        var jwt = ReadToken(token);
        await StoreAsync(jwt, type, jwt.Subject, cancellationToken);
    }

    public async Task StoreLoginAsync(string accessToken, string refreshToken, CancellationToken cancellationToken = default)
    {
        var access = ReadToken(accessToken);
        var refresh = ReadToken(refreshToken);
        if (!string.Equals(access.Subject, refresh.Subject, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Login tokens have different subjects.");
        }

        await StoreAsync(access, TokenType.ACCESS, access.Subject, cancellationToken);
        await StoreAsync(refresh, TokenType.REFRESH, access.Id, cancellationToken);
    }

    public Task<string?> GetAccessJtiForRefreshAsync(string refreshJti, CancellationToken cancellationToken = default)
        => redisService.GetAsync<string>(Key(TokenType.REFRESH, refreshJti), cancellationToken);

    private async Task StoreAsync(JwtSecurityToken jwt, TokenType type, string value, CancellationToken cancellationToken)
    {
        var lifetime = jwt.ValidTo - DateTime.UtcNow;
        if (lifetime <= TimeSpan.Zero)
        {
            throw new InvalidOperationException("JWT has already expired.");
        }

        await redisService.SetAsync(Key(type, jwt.Id), value, lifetime, cancellationToken);
    }

    public Task<bool> IsActiveAsync(string jti, TokenType type, CancellationToken cancellationToken = default)
        => redisService.ExistsAsync(Key(type, jti), cancellationToken);

    public Task<bool> RevokeAsync(string jti, TokenType type, CancellationToken cancellationToken = default)
        => redisService.DeleteAsync(Key(type, jti), cancellationToken);

    public Task<long> RevokeLoginAsync(string accessJti, string refreshJti, CancellationToken cancellationToken = default)
        => redisService.DeleteManyAsync(
            [Key(TokenType.ACCESS, accessJti), Key(TokenType.REFRESH, refreshJti)],
            cancellationToken);

    private static JwtSecurityToken ReadToken(string token)
    {
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        if (string.IsNullOrWhiteSpace(jwt.Id) || string.IsNullOrWhiteSpace(jwt.Subject))
        {
            throw new InvalidOperationException("JWT is missing its JTI or subject.");
        }

        return jwt;
    }

    private static string Key(TokenType type, string jti)
    {
        if (string.IsNullOrWhiteSpace(jti))
        {
            throw new ArgumentException("JWT ID is required.", nameof(jti));
        }

        return $"auth:{type.ToString().ToLowerInvariant()}:{jti}";
    }
}
