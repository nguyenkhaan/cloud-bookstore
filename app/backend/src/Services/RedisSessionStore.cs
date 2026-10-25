using StackExchange.Redis;

namespace backend.src.Services;

public class RedisSessionStore(IConnectionMultiplexer redis) : ISessionStore, ILoginThrottle
{
    private IDatabase Db => redis.GetDatabase();
    private static string A(string jti) => $"auth:access:{jti}";
    private static string R(string jti) => $"auth:refresh:{jti}";
    private static string U(Guid id) => $"auth:user:{id}";
    private const string GetDelScript =
        "local v = redis.call('GET', KEYS[1]) if v then redis.call('DEL', KEYS[1]) end return v";

    private async Task<string?> GetAndDeleteAsync(string key)
    {
        var result = await Db.ScriptEvaluateAsync(GetDelScript, [(RedisKey)key]);
        return result.IsNull ? null : (string?)result;
    }

    public async Task CreateAsync(Guid userId, string accessJti, TimeSpan accessTtl, string refreshJti, TimeSpan refreshTtl)
    {
        var tx = Db.CreateTransaction();
        _ = tx.StringSetAsync(A(accessJti), refreshJti, accessTtl);   // value = jti của cặp
        _ = tx.StringSetAsync(R(refreshJti), accessJti, refreshTtl);
        _ = tx.SetAddAsync(U(userId), [$"a:{accessJti}", $"r:{refreshJti}"]);
        _ = tx.KeyExpireAsync(U(userId), refreshTtl);
        await tx.ExecuteAsync();
    }

    public Task<bool> IsAccessActiveAsync(string jti) => Db.KeyExistsAsync(A(jti));

    public async Task<bool> RevokeByAccessAsync(string accessJti)
    {
        var refresh = await GetAndDeleteAsync(A(accessJti));
        if (refresh is null) return false;
        await Db.KeyDeleteAsync(R(refresh));
        return true;
    }

    public async Task<bool> RevokeByRefreshAsync(string refreshJti)
    {
        var access = await GetAndDeleteAsync(R(refreshJti));
        if (access is null) return false;
        await Db.KeyDeleteAsync(A(access));
        return true;
    }

    public async Task RevokeAllAsync(Guid userId)
    {
        var members = await Db.SetMembersAsync(U(userId));
        var keys = members.Select(m => m.ToString()).Select(m =>
            (RedisKey)(m.StartsWith("a:") ? A(m[2..]) : R(m[2..]))).ToArray();
        if (keys.Length > 0) await Db.KeyDeleteAsync(keys);
        await Db.KeyDeleteAsync(U(userId));
    }

    // --- throttle ---
    private static string F(string e) => $"auth:fail:{e}";
    private static string L(string e) => $"auth:lock:{e}";

    public async Task<TimeSpan?> GetLockRemainingAsync(string email) => await Db.KeyTimeToLiveAsync(L(email));

    public async Task<long> RecordFailureAsync(string email, TimeSpan window)
    {
        var n = await Db.StringIncrementAsync(F(email));
        if (n == 1) await Db.KeyExpireAsync(F(email), window);
        return n;
    }

    public async Task LockAsync(string email, TimeSpan duration)
    {
        await Db.StringSetAsync(L(email), "1", duration);
        await Db.KeyDeleteAsync(F(email));
    }

    public Task ResetAsync(string email) => Db.KeyDeleteAsync(F(email));
}