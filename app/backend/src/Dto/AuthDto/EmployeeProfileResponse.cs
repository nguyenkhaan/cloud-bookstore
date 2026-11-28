namespace backend.src.Dto.AuthDto;

public sealed record EmployeeProfileResponse(
    Guid Id,
    string Email,
    string FullName,
    string Phone,
    string Role,
    string Status,
    string? AvatarUrl,
    DateTime CreatedAt,
    DateTime? PasswordChangedAt);
