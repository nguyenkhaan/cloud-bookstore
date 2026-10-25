namespace backend.src.Dto.AuthDto;

public record ProfileResponse(Guid Id, string Email, string FullName, string Role);