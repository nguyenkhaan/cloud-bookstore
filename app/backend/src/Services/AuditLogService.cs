using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Models;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

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
                    x.Reason
                )).ToListAsync(cancellationToken);
    }
    public async Task<AuditLogModel> CreateAuditLogEntryAsync(CreateAuditLogEntry entry , CancellationToken cancellationToken = default)
    {
        
    }
}