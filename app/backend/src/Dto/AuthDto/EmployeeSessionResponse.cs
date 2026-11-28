namespace backend.src.Dto.AuthDto;

public sealed record EmployeeSessionResponse(
    Guid Id,
    string DeviceName,
    string DeviceType,
    bool IsCurrent,
    DateTime CreatedAt,
    DateTime LastActiveAt,
    DateTime ExpiresAt,
    string Status);
