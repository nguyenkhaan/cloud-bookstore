using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using System.Text.Json;
using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.Common;
using backend.src.Exceptions;
using backend.src.Helpers;
using backend.src.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

public class AuditLogService(AppDbContext dbContext, IHttpContextAccessor? httpContextAccessor = null)
{
    private static readonly string[] InventoryEntityTypesLower =
    [
        "bookcopy", "book_copy", "bookcopies", "book_copies",
        "bookseries", "book_series",
        "title", "titles",
        "edition", "editions",
        "category", "categories",
        "stockreceipt", "stock_receipt", "stockreceipts", "stock_receipts",
        "inventorycheck", "inventory_check", "inventorychecks", "inventory_checks",
        "inventoryadjustment", "inventory_adjustment",
        "inventoryadjustmentrequest", "inventory_adjustment_request",
        "buybackapproval", "buyback_approval",
        "supplier", "suppliers"
    ];

    public static bool IsInventoryScopedEntity(string? entityType)
    {
        if (string.IsNullOrWhiteSpace(entityType))
        {
            return false;
        }

        var normalized = entityType.Trim().ToLowerInvariant();
        return InventoryEntityTypesLower.Contains(normalized);
    }

    public async Task<PagedResult<AuditLogResponse>> SearchPagedAsync(
        AuditLogQuery query,
        bool restrictToInventoryScope = false,
        CancellationToken cancellationToken = default)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize > 0 ? query.PageSize : query.Limit, 1, 100);

        var logs = dbContext.AuditLogs.AsNoTracking().AsQueryable();

        if (restrictToInventoryScope)
        {
            logs = logs.Where(x => InventoryEntityTypesLower.Contains(x.EntityType.ToLower()));
        }

        if (query.ActorId.HasValue)
        {
            logs = logs.Where(x => x.ActorId == query.ActorId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Action))
        {
            var action = query.Action.Trim().ToLower();
            logs = logs.Where(x => x.Action.ToLower() == action);
        }

        if (!string.IsNullOrWhiteSpace(query.EntityType))
        {
            var entityType = query.EntityType.Trim().ToLower();
            logs = logs.Where(x => x.EntityType.ToLower() == entityType);
        }

        if (query.EntityId.HasValue)
        {
            logs = logs.Where(x => x.EntityId == query.EntityId.Value);
        }

        if (query.From.HasValue)
        {
            var fromUtc = VietnamTimeHelper.ConvertVnStartOfDayToUtc(query.From.Value);
            logs = logs.Where(x => x.OccurredAt >= fromUtc);
        }

        if (query.To.HasValue)
        {
            var toUtc = VietnamTimeHelper.ConvertVnStartOfDayToUtc(query.To.Value);
            logs = logs.Where(x => x.OccurredAt <= toUtc);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            var lower = term.ToLower();

            var matchingActorIds = await dbContext.Employees.AsNoTracking()
                .Where(e => e.FullName.ToLower().Contains(lower) || e.Email.ToLower().Contains(lower))
                .Select(e => e.Id)
                .ToListAsync(cancellationToken);

            var matchingEntityIds = new List<Guid>();
            if (Guid.TryParse(term, out var parsedGuid))
            {
                matchingEntityIds.Add(parsedGuid);
            }

            matchingEntityIds.AddRange(await dbContext.BookCopies.AsNoTracking()
                .Where(c => c.CopyBarcode.ToLower().Contains(lower))
                .Select(c => c.Id)
                .ToListAsync(cancellationToken));

            matchingEntityIds.AddRange(await dbContext.StockReceipts.AsNoTracking()
                .Where(r => r.Code.ToLower().Contains(lower))
                .Select(r => r.Id)
                .ToListAsync(cancellationToken));

            matchingEntityIds.AddRange(await dbContext.InventoryChecks.AsNoTracking()
                .Where(ic => ic.CheckCode.ToLower().Contains(lower))
                .Select(ic => ic.Id)
                .ToListAsync(cancellationToken));

            matchingEntityIds.AddRange(await dbContext.Titles.AsNoTracking()
                .Where(t => t.Name.ToLower().Contains(lower))
                .Select(t => t.Id)
                .ToListAsync(cancellationToken));

            if (!restrictToInventoryScope)
            {
                matchingEntityIds.AddRange(await dbContext.SaleInvoices.AsNoTracking()
                    .Where(s => s.InvoiceNo != null && s.InvoiceNo.ToLower().Contains(lower))
                    .Select(s => s.Id)
                    .ToListAsync(cancellationToken));

                matchingEntityIds.AddRange(await dbContext.RentalSlips.AsNoTracking()
                    .Where(s => s.SlipNo.ToLower().Contains(lower))
                    .Select(s => s.Id)
                    .ToListAsync(cancellationToken));

                matchingEntityIds.AddRange(await dbContext.Customers.AsNoTracking()
                    .Where(c => c.FullName.ToLower().Contains(lower) || c.Phone.ToLower().Contains(lower))
                    .Select(c => c.Id)
                    .ToListAsync(cancellationToken));
            }

            var distinctMatchedIds = matchingEntityIds.Distinct().ToList();

            logs = logs.Where(x =>
                x.Action.ToLower().Contains(lower) ||
                x.EntityType.ToLower().Contains(lower) ||
                (x.Reason != null && x.Reason.ToLower().Contains(lower)) ||
                (x.CorrelationId != null && x.CorrelationId.ToLower().Contains(lower)) ||
                (x.ActorId.HasValue && matchingActorIds.Contains(x.ActorId.Value)) ||
                distinctMatchedIds.Contains(x.EntityId) ||
                distinctMatchedIds.Contains(x.Id));
        }

        var totalCount = await logs.CountAsync(cancellationToken);

        var skip = query.Offset > 0 && query.Page <= 1
            ? query.Offset
            : (page - 1) * pageSize;

        var rows = await logs
            .OrderByDescending(x => x.OccurredAt)
            .ThenByDescending(x => x.Id)
            .Skip(skip)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = await MapResponsesAsync(rows, cancellationToken);
        return new PagedResult<AuditLogResponse>(items, totalCount, page, pageSize);
    }

    public async Task<AuditLogDetailResponse> GetByIdWithRelatedAsync(
        Guid id,
        bool restrictToInventoryScope = false,
        CancellationToken cancellationToken = default)
    {
        var entry = await dbContext.AuditLogs.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Không tìm thấy nhật ký kiểm toán '{id}'.");

        if (restrictToInventoryScope && !IsInventoryScopedEntity(entry.EntityType))
        {
            throw new ForbiddenException("Quản lý kho chỉ được xem nhật ký thuộc phân hệ kho & bản sách.");
        }

        var relatedRaw = await dbContext.AuditLogs.AsNoTracking()
            .Where(x => x.EntityType == entry.EntityType && x.EntityId == entry.EntityId)
            .OrderByDescending(x => x.OccurredAt)
            .Take(15)
            .ToListAsync(cancellationToken);

        var chronological = relatedRaw.OrderBy(x => x.OccurredAt).ThenBy(x => x.Id).ToList();
        var mappedAll = await MapResponsesAsync(
            chronological.Any(x => x.Id == entry.Id) ? chronological : [entry, .. chronological],
            cancellationToken);

        var targetDto = mappedAll.First(x => x.Id == entry.Id);
        var relatedDtos = mappedAll.Where(x => chronological.Any(c => c.Id == x.Id)).ToList();

        return new AuditLogDetailResponse(targetDto, relatedDtos);
    }

    public async Task<AuditLogMetadataResponse> GetMetadataAsync(
        bool restrictToInventoryScope = false,
        CancellationToken cancellationToken = default)
    {
        var query = dbContext.AuditLogs.AsNoTracking().AsQueryable();
        if (restrictToInventoryScope)
        {
            query = query.Where(x => InventoryEntityTypesLower.Contains(x.EntityType.ToLower()));
        }

        var entityTypes = await query
            .Select(x => x.EntityType)
            .Distinct()
            .OrderBy(x => x)
            .ToListAsync(cancellationToken);

        var actions = await query
            .Select(x => x.Action)
            .Distinct()
            .OrderBy(x => x)
            .ToListAsync(cancellationToken);

        return new AuditLogMetadataResponse(entityTypes, actions, restrictToInventoryScope);
    }

    public async Task<List<AuditLogResponse>> SearchAsync(
        AuditLogQuery query,
        CancellationToken cancellationToken = default)
    {
        var paged = await SearchPagedAsync(query, restrictToInventoryScope: false, cancellationToken);
        return paged.Items.ToList();
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

        var httpContext = httpContextAccessor?.HttpContext;
        var resolvedIp = entry.Context.IpAddress ?? httpContext?.Connection.RemoteIpAddress;
        var resolvedUserAgent = Truncate(
            entry.Context.UserAgent ?? httpContext?.Request.Headers.UserAgent.ToString(),
            255);
        var resolvedCorrelationId = Truncate(
            entry.Context.CorrelationId ?? Activity.Current?.Id ?? httpContext?.TraceIdentifier,
            80);

        var auditLog = new AuditLogModel
        {
            ActorId = entry.Context.ActorId,
            IpAddress = resolvedIp,
            UserAgent = resolvedUserAgent,
            CorrelationId = resolvedCorrelationId,
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

    private async Task<List<AuditLogResponse>> MapResponsesAsync(
        IReadOnlyList<AuditLogModel> rows,
        CancellationToken cancellationToken)
    {
        if (rows.Count == 0)
        {
            return [];
        }

        var actorIds = rows.Where(x => x.ActorId.HasValue).Select(x => x.ActorId!.Value).Distinct().ToList();
        var actors = actorIds.Count == 0
            ? new Dictionary<Guid, ActorSummary>()
            : await dbContext.Employees.AsNoTracking()
                .Include(e => e.Role)
                .Where(e => actorIds.Contains(e.Id))
                .ToDictionaryAsync(
                    e => e.Id,
                    e => new ActorSummary(e.FullName, e.Email, e.Role != null ? e.Role.RoleName.ToString() : string.Empty),
                    cancellationToken);

        var entityLabels = await ResolveEntityLabelsAsync(rows, cancellationToken);

        return rows.Select(x =>
        {
            ActorSummary? actor = null;
            var hasActor = x.ActorId.HasValue && actors.TryGetValue(x.ActorId.Value, out actor);
            var vnTime = VietnamTimeHelper.ToVietnamTime(x.OccurredAt);
            var logCode = $"LOG-{vnTime:yyyyMMdd}-{x.Id.ToString("N")[..4].ToUpperInvariant()}";
            entityLabels.TryGetValue((x.EntityType, x.EntityId), out var entityLabel);

            return new AuditLogResponse(
                x.Id,
                logCode,
                x.OccurredAt,
                x.ActorId,
                hasActor ? actor!.FullName : null,
                hasActor ? actor!.RoleName : null,
                hasActor ? actor!.Email : null,
                x.IpAddress?.ToString(),
                x.UserAgent,
                x.CorrelationId,
                x.Action,
                x.EntityType,
                x.EntityId,
                entityLabel,
                x.BeforeData,
                x.AfterData,
                x.Reason);
        }).ToList();
    }

    private sealed record ActorSummary(string FullName, string Email, string RoleName);

    private async Task<Dictionary<(string EntityType, Guid EntityId), string>> ResolveEntityLabelsAsync(
        IReadOnlyList<AuditLogModel> rows,
        CancellationToken cancellationToken)
    {
        var result = new Dictionary<(string, Guid), string>();
        var byNormType = rows
            .GroupBy(r => r.EntityType.Trim().ToLowerInvariant())
            .ToDictionary(g => g.Key, g => g.ToList());

        async Task LoadAsync<T>(string[] keys, Func<List<Guid>, Task<Dictionary<Guid, string>>> loader)
        {
            var matched = new List<AuditLogModel>();
            foreach (var key in keys)
            {
                if (byNormType.TryGetValue(key, out var list))
                {
                    matched.AddRange(list);
                }
            }

            if (matched.Count == 0)
            {
                return;
            }

            var ids = matched.Select(m => m.EntityId).Distinct().ToList();
            var labels = await loader(ids);
            foreach (var item in matched)
            {
                if (labels.TryGetValue(item.EntityId, out var label) && !string.IsNullOrWhiteSpace(label))
                {
                    result[(item.EntityType, item.EntityId)] = label;
                }
            }
        }

        await LoadAsync<BookCopyModel>(["bookcopy", "book_copy"], async ids =>
            await dbContext.BookCopies.AsNoTracking()
                .Where(c => ids.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => c.CopyBarcode, cancellationToken));

        await LoadAsync<BookSeriesModel>(["bookseries", "book_series"], async ids =>
            await dbContext.BookSeries.AsNoTracking()
                .Where(s => ids.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id, s => s.Name, cancellationToken));

        await LoadAsync<TitleModel>(["title", "titles"], async ids =>
            await dbContext.Titles.AsNoTracking()
                .Where(t => ids.Contains(t.Id))
                .ToDictionaryAsync(t => t.Id, t => string.IsNullOrWhiteSpace(t.VolumeLabel) ? t.Name : $"{t.Name} · {t.VolumeLabel}", cancellationToken));

        await LoadAsync<EditionModel>(["edition", "editions"], async ids =>
            await dbContext.Editions.AsNoTracking()
                .Where(e => ids.Contains(e.Id))
                .Join(dbContext.Titles.AsNoTracking(), e => e.TitleId, t => t.Id, (e, t) => new { e.Id, Label = e.Isbn ?? t.Name })
                .ToDictionaryAsync(x => x.Id, x => x.Label, cancellationToken));

        await LoadAsync<CategoryModel>(["category", "categories"], async ids =>
            await dbContext.Categories.AsNoTracking()
                .Where(c => ids.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => c.Name, cancellationToken));

        await LoadAsync<StockReceiptModel>(["stockreceipt", "stock_receipt", "buyback_approval", "buybackapproval"], async ids =>
            await dbContext.StockReceipts.AsNoTracking()
                .Where(r => ids.Contains(r.Id))
                .ToDictionaryAsync(r => r.Id, r => r.Code, cancellationToken));

        await LoadAsync<InventoryCheckModel>(["inventorycheck", "inventory_check"], async ids =>
            await dbContext.InventoryChecks.AsNoTracking()
                .Where(c => ids.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => c.CheckCode, cancellationToken));

        await LoadAsync<InventoryAdjustmentRequestModel>(["inventory_adjustment", "inventoryadjustment", "inventoryadjustmentrequest"], async ids =>
            await dbContext.InventoryAdjustmentRequests.AsNoTracking()
                .Where(a => ids.Contains(a.Id))
                .Join(dbContext.InventoryChecks.AsNoTracking(), a => a.InventoryCheckId, c => c.Id, (a, c) => new { a.Id, c.CheckCode })
                .ToDictionaryAsync(x => x.Id, x => x.CheckCode, cancellationToken));

        await LoadAsync<SaleInvoiceModel>(["saleinvoice", "sale_invoice"], async ids =>
            await dbContext.SaleInvoices.AsNoTracking()
                .Where(s => ids.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id, s => s.InvoiceNo ?? $"INV-{s.Id.ToString("N")[..6].ToUpperInvariant()}", cancellationToken));

        await LoadAsync<RentalSlipModel>(["rentalslip", "rental_slip"], async ids =>
            await dbContext.RentalSlips.AsNoTracking()
                .Where(s => ids.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id, s => s.SlipNo, cancellationToken));

        await LoadAsync<CustomerModel>(["customer", "customers"], async ids =>
            await dbContext.Customers.AsNoTracking()
                .Where(c => ids.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => $"{c.FullName} ({c.Phone})", cancellationToken));

        await LoadAsync<EmployeeModel>(["employee", "employees"], async ids =>
            await dbContext.Employees.AsNoTracking()
                .Where(e => ids.Contains(e.Id))
                .ToDictionaryAsync(e => e.Id, e => e.FullName, cancellationToken));

        return result;
    }

    private static string? Truncate(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }
}
