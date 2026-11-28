namespace backend.src.Helpers;

internal static class UserAgentParser
{
    public static (string Name, string Type) Parse(string userAgent)
    {
        bool Has(string keyword) => userAgent.Contains(keyword, StringComparison.OrdinalIgnoreCase);

        var browser = Has("Edg") ? "Edge"
            : Has("OPR/") ? "Opera"
            : Has("Firefox/") || Has("FxiOS/") ? "Firefox"
            : Has("Chrome/") || Has("CriOS/") ? "Chrome"
            : Has("Safari/") ? "Safari"
            : "Trình duyệt không xác định";
        var operatingSystem = Has("Android") ? "Android"
            : Has("iPhone") || Has("iPad") ? "iOS"
            : Has("Windows") ? "Windows"
            : Has("Macintosh") ? "macOS"
            : Has("CrOS") ? "ChromeOS"
            : Has("Linux") ? "Linux"
            : null;
        var deviceType = operatingSystem is "Android" or "iOS" || Has("Mobile") ? "mobile"
            : operatingSystem is "macOS" or "ChromeOS" ? "laptop"
            : "desktop";

        return (operatingSystem is null ? browser : $"{browser} · {operatingSystem}", deviceType);
    }
}
