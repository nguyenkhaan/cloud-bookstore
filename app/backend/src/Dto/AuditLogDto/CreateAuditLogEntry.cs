using System.Net;

namespace backend.src.Dto.AuditLogDto;

public record class CreateAuditLogEntry(
        string Action,
        string EntityType,
        Guid EntityId,
        object? Before,
        object? After,
        string Reason,
        AuditLogContext Context
    )
{ }
