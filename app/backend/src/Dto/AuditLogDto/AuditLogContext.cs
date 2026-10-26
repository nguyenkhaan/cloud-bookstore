using System.Net;

namespace backend.src.Dto.AuditLogDto;

public record class AuditLogContext(
    Guid? ActorId,
    IPAddress? IpAddress)
{ }
