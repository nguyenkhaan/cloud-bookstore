using StackExchange.Redis;

namespace backend.src.Services;

public interface ISessionStore
{
    Task CreateAsync(Guid userId, string accessJti, TimeSpan accessTtl, string refreshJti, TimeSpan refreshTtl);
    Task<bool> IsAccessActiveAsync(string accessJti);
    Task<bool> RevokeByAccessAsync(string accessJti);   // xóa luôn refresh đi kèm
    Task<bool> RevokeByRefreshAsync(string refreshJti); // atomic: dùng cho rotation
    Task RevokeAllAsync(Guid userId);                   // dùng khi khóa tài khoản / đổi role
}

public interface ILoginThrottle
{
    Task<TimeSpan?> GetLockRemainingAsync(string email);
    Task<long> RecordFailureAsync(string email, TimeSpan window);
    Task LockAsync(string email, TimeSpan duration);
    Task ResetAsync(string email);
}