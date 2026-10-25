namespace backend.src.Services;

public record LoginPolicy(int MaxAttempts, TimeSpan Window, TimeSpan LockDuration);

public class SettingService(IConfiguration configuration)
{
    public List<string> GetEmailDomains()
    {
        string? domains = configuration["AppSettings:AllowedEmailDomains"];
        if (string.IsNullOrEmpty(domains)) return [];
        return domains
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(domain => domain.Trim())
            .Where(domain => !string.IsNullOrWhiteSpace(domain))
            .ToList();
    }

    public LoginPolicy GetLoginPolicy() => new(
        configuration.GetValue("Auth:MaxFailedAttempts", 5),
        TimeSpan.FromMinutes(configuration.GetValue("Auth:FailWindowMinutes", 15)),
        TimeSpan.FromMinutes(configuration.GetValue("Auth:LockMinutes", 15)));
}