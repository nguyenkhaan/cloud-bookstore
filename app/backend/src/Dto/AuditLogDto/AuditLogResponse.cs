namespace backend.src.Dto.AuditLogDto;

public record class AuditLogResponse(
    Guid Id,
    string LogCode,
    DateTime OccurredAt,
    Guid? ActorId,
    string? ActorName,
    string? ActorRole,
    string? ActorEmail,
    string? IpAddress,
    string? UserAgent,
    string? CorrelationId,
    string Action,
    string EntityType,
    Guid EntityId,
    string? EntityLabel,
    string? BeforeData,
    string? AfterData,
    string? Reason);

public record class AuditLogDetailResponse(
    AuditLogResponse Log,
    IReadOnlyList<AuditLogResponse> RelatedEvents);

public record class AuditLogMetadataResponse(
    IReadOnlyList<string> EntityTypes,
    IReadOnlyList<string> Actions,
    bool IsInventoryScoped);
