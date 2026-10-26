using System.IdentityModel.Tokens.Jwt;
using backend.src.Bases.Enums;

namespace backend.src.Infrastructure;

public sealed class TokenJtiStore(RedisService redisService)
{
    public async Task StoreRegistrationVerificationAsync(
        string token,
        CancellationToken cancellationToken = default)
    {
        var jwt = ReadToken(token);
        if (!Guid.TryParse(jwt.Subject, out var employeeId))
        {
            throw new InvalidOperationException("Verification token subject is not a valid employee ID.");
        }

        await redisService.SetAsync(
            RedisKeyManager.ForCurrentRegistrationVerification(employeeId),
            jwt.Id,
            GetRemainingLifetime(jwt),
            cancellationToken);
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
        => redisService.GetAsync<string>(RedisKeyManager.ForToken(TokenType.REFRESH, refreshJti), cancellationToken);

    public async Task<bool> IsRegistrationVerificationActiveAsync(
        Guid employeeId,
        string tokenId,
        CancellationToken cancellationToken = default)
    {
        var currentTokenId = await redisService.GetAsync<string>(
            RedisKeyManager.ForCurrentRegistrationVerification(employeeId),
            cancellationToken);

        return string.Equals(currentTokenId, tokenId, StringComparison.Ordinal);
    }

    public async Task<bool> RevokeRegistrationVerificationAsync(
        Guid employeeId,
        string tokenId,
        CancellationToken cancellationToken = default)
    {
        if (!await IsRegistrationVerificationActiveAsync(employeeId, tokenId, cancellationToken))
        {
            return false;
        }

        return await redisService.DeleteAsync(
            RedisKeyManager.ForCurrentRegistrationVerification(employeeId),
            cancellationToken);
    }

    private async Task StoreAsync(JwtSecurityToken jwt, TokenType type, string value, CancellationToken cancellationToken)
    {
        await redisService.SetAsync(
            RedisKeyManager.ForToken(type, jwt.Id),
            value,
            GetRemainingLifetime(jwt),
            cancellationToken);
    }

    public Task<bool> IsActiveAsync(string jti, TokenType type, CancellationToken cancellationToken = default)
        => redisService.ExistsAsync(RedisKeyManager.ForToken(type, jti), cancellationToken);

    public Task<long> RevokeLoginAsync(string accessJti, string refreshJti, CancellationToken cancellationToken = default)
        => redisService.DeleteManyAsync(
            [
                RedisKeyManager.ForToken(TokenType.ACCESS, accessJti),
                RedisKeyManager.ForToken(TokenType.REFRESH, refreshJti)
            ],
            cancellationToken);

    private static TimeSpan GetRemainingLifetime(JwtSecurityToken jwt)
    {
        var remainingLifetime = jwt.ValidTo - DateTime.UtcNow;
        if (remainingLifetime <= TimeSpan.Zero)
        {
            throw new InvalidOperationException("JWT has already expired.");
        }

        return remainingLifetime;
    }

    private static JwtSecurityToken ReadToken(string token)
    {
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        if (string.IsNullOrWhiteSpace(jwt.Id) || string.IsNullOrWhiteSpace(jwt.Subject))
        {
            throw new InvalidOperationException("JWT is missing its JTI or subject.");
        }

        return jwt;
    }
}
