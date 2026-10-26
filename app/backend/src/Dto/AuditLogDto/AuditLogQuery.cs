namespace backend.src.Dto.AuditLogDto;

public record class AuditLogQuery(
    Guid? ActorId,
    string? Action,
    string? EntityType,
    Guid? EntityId,
    DateTime? From,
    DateTime? To,
    int Limit = 50,
    int Offset = 0 ) { }
