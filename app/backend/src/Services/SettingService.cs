namespace backend.src.Services;

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

}
