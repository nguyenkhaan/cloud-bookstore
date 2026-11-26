namespace backend.src.Models;

public sealed class EmployeeSessionModel
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EmployeeId { get; set; }
    public string DeviceName { get; set; } = string.Empty;
    public string DeviceType { get; set; } = string.Empty;
    public string AccessJti { get; set; } = string.Empty;
    public string RefreshJti { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime LastActiveAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
}
