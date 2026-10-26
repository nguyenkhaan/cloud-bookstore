namespace backend.src.Dto.AuditLogDto;

public record class AuditLogResponse(
    Guid Id,
    DateTime OccurredAt,
    Guid? ActorId,
    string Action,
    string EntityType,
    Guid EntityId,
    string? BeforeData,
    string? AfterData,
    string? Reason) { }
