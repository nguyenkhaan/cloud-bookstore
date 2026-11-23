namespace backend.src.Dto.AuditLogDto;

public record class AuditLogQuery(
    Guid? ActorId = null,
    string? Action = null,
    string? EntityType = null,
    Guid? EntityId = null,
    DateTime? From = null,
    DateTime? To = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 20,
    int Limit = 50,
    int Offset = 0);
