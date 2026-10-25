using backend.src.Services;

namespace backend.Tests.Fakes;

public class FakeSessionStore : ISessionStore, ILoginThrottle
{
    private readonly Dictionary<string, string> _access = new();
    private readonly Dictionary<string, string> _refresh = new();
    private readonly Dictionary<Guid, List<(string Kind, string Jti)>> _byUser = new();
    private readonly Dictionary<string, long> _fails = new();
    private readonly Dictionary<string, DateTime> _locks = new();

    public Task CreateAsync(Guid userId, string accessJti, TimeSpan accessTtl, string refreshJti, TimeSpan refreshTtl)
    {
        _access[accessJti] = refreshJti;
        _refresh[refreshJti] = accessJti;
        if (!_byUser.TryGetValue(userId, out var list)) _byUser[userId] = list = new();
        list.Add(("a", accessJti));
        list.Add(("r", refreshJti));
        return Task.CompletedTask;
    }

    public Task<bool> IsAccessActiveAsync(string accessJti) => Task.FromResult(_access.ContainsKey(accessJti));

    public Task<bool> RevokeByAccessAsync(string accessJti)
    {
        if (!_access.Remove(accessJti, out var refresh)) return Task.FromResult(false);
        _refresh.Remove(refresh);
        return Task.FromResult(true);
    }

    public Task<bool> RevokeByRefreshAsync(string refreshJti)
    {
        if (!_refresh.Remove(refreshJti, out var access)) return Task.FromResult(false);
        _access.Remove(access);
        return Task.FromResult(true);
    }

    public Task RevokeAllAsync(Guid userId)
    {
        if (_byUser.Remove(userId, out var list))
            foreach (var (kind, jti) in list)
                if (kind == "a") _access.Remove(jti); else _refresh.Remove(jti);
        return Task.CompletedTask;
    }

    public Task<TimeSpan?> GetLockRemainingAsync(string email) =>
        Task.FromResult<TimeSpan?>(_locks.TryGetValue(email, out var until) && until > DateTime.UtcNow
            ? until - DateTime.UtcNow : null);

    public Task<long> RecordFailureAsync(string email, TimeSpan window)
    {
        _fails[email] = _fails.GetValueOrDefault(email) + 1;
        return Task.FromResult(_fails[email]);
    }

    public Task LockAsync(string email, TimeSpan duration)
    {
        _locks[email] = DateTime.UtcNow + duration;
        _fails.Remove(email);
        return Task.CompletedTask;
    }

    public Task ResetAsync(string email)
    {
        _fails.Remove(email);
        return Task.CompletedTask;
    }
}