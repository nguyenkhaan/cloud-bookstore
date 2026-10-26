using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Models;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace backend.src.Services;

public class AuditLogService(AppDbContext dbContext)
{
    public async Task<List<AuditLogResponse>> SearchAsync(AuditLogQuery query, CancellationToken cancellationToken = default)
    {
        var logs = dbContext.AuditLogs.AsQueryable();
        if (query.ActorId.HasValue) logs = logs.Where(x => x.ActorId == query.ActorId);
        if (!string.IsNullOrWhiteSpace(query.Action)) logs = logs.Where(x => x.Action == query.Action);
        if (!string.IsNullOrWhiteSpace(query.EntityType)) logs = logs.Where(x => x.EntityType == query.EntityType);
        if (query.EntityId.HasValue) logs = logs.Where(x => x.EntityId == query.EntityId);
        if (query.From.HasValue) logs = logs.Where(x => x.OccurredAt >= query.From.Value);

        if (query.To.HasValue)
            logs = logs.Where(x => x.OccurredAt <= query.To.Value);
        return await logs.OrderByDescending(x => x.OccurredAt)
                .Skip(query.Offset)
                .Take(query.Limit)
                .Select(x => new AuditLogResponse(
                    x.Id,
                    x.OccurredAt,
                    x.ActorId,
                    x.Action,
                    x.EntityType,
                    x.EntityId,
                    x.BeforeData,
                    x.AfterData,
                    x.Reason
                )).ToListAsync(cancellationToken);
    }
    public async Task<AuditLogModel> CreateAuditLogEntryAsync(
        CreateAuditLogEntry entry,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(entry.Action))
            throw new ValidationException("Audit action is required.");
        if (string.IsNullOrWhiteSpace(entry.EntityType))
            throw new ValidationException("Audit entity type is required.");
        if (entry.Action.Length > 60)
            throw new ValidationException("Audit action cannot exceed 60 characters.");
        if (entry.EntityType.Length > 60)
            throw new ValidationException("Audit entity type cannot exceed 60 characters.");
        if (string.IsNullOrWhiteSpace(entry.Reason))
            throw new ValidationException("Audit reason is required.");
        var auditLog = new AuditLogModel
        {
            ActorId = entry.Context.ActorId,
            IpAddress = entry.Context.IpAddress,
            Action = entry.Action.Trim(),
            EntityType = entry.EntityType.Trim(),
            EntityId = entry.EntityId,
            BeforeData = entry.Before is null
                ? null
                : JsonSerializer.Serialize(entry.Before),
            AfterData = entry.After is null
                ? null
                : JsonSerializer.Serialize(entry.After),
            Reason = entry.Reason.Trim(),
            OccurredAt = DateTime.UtcNow
        };

        dbContext.AuditLogs.Add(auditLog);
        await dbContext.SaveChangesAsync(cancellationToken);
        return auditLog;
    }
}
