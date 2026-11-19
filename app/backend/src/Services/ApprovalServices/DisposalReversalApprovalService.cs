using backend.src.Data;
using backend.src.Dto.ApprovalDto;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.Common;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services.ApprovalServices;

public class DisposalReversalApprovalService(
    AppDbContext dbContext,
    AuditLogService auditLogService)
{
    public const string AuditEntityType = "DISPOSAL_REVERSAL_APPROVAL";

    public async Task<PagedResult<DisposalReversalApprovalItemResponse>> GetPagedAsync(
        ApprovalQuery query,
        CancellationToken cancellationToken = default)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var rawLogs = await dbContext.AuditLogs
            .AsNoTracking()
            .Where(a => a.EntityType == AuditEntityType)
            .OrderByDescending(a => a.OccurredAt)
            .ToListAsync(cancellationToken);

        var grouped = rawLogs.GroupBy(l => l.EntityId != Guid.Empty ? l.EntityId : l.Id).ToList();

        var actorIds = rawLogs.Where(a => a.ActorId.HasValue).Select(a => a.ActorId!.Value).Distinct().ToList();
        var actors = await dbContext.Employees
            .AsNoTracking()
            .Where(e => actorIds.Contains(e.Id))
            .ToDictionaryAsync(e => e.Id, e => e.FullName, cancellationToken);

        var allItems = grouped.Select(group =>
        {
            var logs = group.OrderByDescending(l => l.OccurredAt).ToList();
            var latest = logs[0];
            var original = logs.Last();

            var status = ApprovalStatus.PENDING_APPROVAL;
            if (latest.Action.EndsWith("_APPROVED")) status = ApprovalStatus.APPROVED;
            else if (latest.Action.EndsWith("_REJECTED")) status = ApprovalStatus.REJECTED;

            string requestType = "HỦY_HÓA_ĐƠN_BÁN";
            string refCode = "INV-000000";
            string title = "Giao dịch bán lẻ";
            long amount = 0;

            try
            {
                if (!string.IsNullOrWhiteSpace(original.AfterData))
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(original.AfterData);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("RequestType", out var prop)) requestType = prop.GetString() ?? requestType;
                    if (root.TryGetProperty("ReferenceCode", out prop)) refCode = prop.GetString() ?? refCode;
                    if (root.TryGetProperty("TitleName", out prop)) title = prop.GetString() ?? title;
                    if (root.TryGetProperty("Amount", out prop)) amount = prop.GetInt64();
                }
            }
            catch
            {
                // Fallback
            }

            actors.TryGetValue(original.ActorId ?? Guid.Empty, out var creatorName);
            actors.TryGetValue(latest.ActorId ?? Guid.Empty, out var resolverName);

            var targetId = original.EntityId != Guid.Empty ? original.EntityId : original.Id;

            return new DisposalReversalApprovalItemResponse(
                targetId,
                requestType,
                refCode,
                title,
                amount,
                original.Reason ?? string.Empty,
                status,
                original.ActorId ?? Guid.Empty,
                creatorName ?? "Nhân viên",
                original.OccurredAt,
                status != ApprovalStatus.PENDING_APPROVAL ? latest.ActorId : null,
                status != ApprovalStatus.PENDING_APPROVAL ? resolverName : null,
                status != ApprovalStatus.PENDING_APPROVAL ? latest.OccurredAt : null,
                status == ApprovalStatus.REJECTED ? latest.Reason : null
            );
        }).AsEnumerable();

        if (query.Status.HasValue)
        {
            allItems = allItems.Where(i => i.Status == query.Status.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            allItems = allItems.Where(i =>
                i.ReferenceCode.ToLower().Contains(term) ||
                i.TitleName.ToLower().Contains(term) ||
                i.Reason.ToLower().Contains(term));
        }

        var totalCount = allItems.Count();
        var items = allItems
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return new PagedResult<DisposalReversalApprovalItemResponse>(items, totalCount, page, pageSize);
    }

    public async Task<DisposalReversalApprovalDetailResponse> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var logs = await dbContext.AuditLogs
            .AsNoTracking()
            .Where(a => (a.Id == id || a.EntityId == id) && a.EntityType == AuditEntityType)
            .OrderByDescending(a => a.OccurredAt)
            .ToListAsync(cancellationToken);

        if (logs.Count == 0)
            throw new NotFoundException($"Không tìm thấy yêu cầu: {id}");

        var latest = logs[0];
        var original = logs.Last();

        var status = ApprovalStatus.PENDING_APPROVAL;
        if (latest.Action.EndsWith("_APPROVED")) status = ApprovalStatus.APPROVED;
        else if (latest.Action.EndsWith("_REJECTED")) status = ApprovalStatus.REJECTED;

        string requestType = "HỦY_HÓA_ĐƠN_BÁN";
        string refCode = "INV-000000";
        string title = "Giao dịch bán lẻ";
        long amount = 0;
        string? details = null;

        try
        {
            if (!string.IsNullOrWhiteSpace(original.AfterData))
            {
                using var doc = System.Text.Json.JsonDocument.Parse(original.AfterData);
                var root = doc.RootElement;
                if (root.TryGetProperty("RequestType", out var prop)) requestType = prop.GetString() ?? requestType;
                if (root.TryGetProperty("ReferenceCode", out prop)) refCode = prop.GetString() ?? refCode;
                if (root.TryGetProperty("TitleName", out prop)) title = prop.GetString() ?? title;
                if (root.TryGetProperty("Amount", out prop)) amount = prop.GetInt64();
                if (root.TryGetProperty("Details", out prop)) details = prop.GetString();
            }
        }
        catch
        {
            // Fallback
        }

        var actorIds = logs.Where(a => a.ActorId.HasValue).Select(a => a.ActorId!.Value).Distinct().ToList();
        var actors = await dbContext.Employees
            .AsNoTracking()
            .Where(e => actorIds.Contains(e.Id))
            .ToDictionaryAsync(e => e.Id, cancellationToken);

        actors.TryGetValue(original.ActorId ?? Guid.Empty, out var creator);
        actors.TryGetValue(latest.ActorId ?? Guid.Empty, out var resolver);

        var auditItems = logs.Select(l => new ApprovalAuditItem(
            l.Id,
            l.OccurredAt,
            l.ActorId,
            l.ActorId.HasValue && actors.TryGetValue(l.ActorId.Value, out var emp) ? emp.FullName : null,
            l.Action,
            l.BeforeData,
            l.AfterData,
            l.Reason
        )).ToList();

        var targetId = original.EntityId != Guid.Empty ? original.EntityId : original.Id;

        return new DisposalReversalApprovalDetailResponse(
            targetId,
            requestType,
            refCode,
            title,
            amount,
            original.Reason ?? string.Empty,
            status,
            original.ActorId ?? Guid.Empty,
            creator?.FullName ?? "Nhân viên",
            original.OccurredAt,
            status != ApprovalStatus.PENDING_APPROVAL ? latest.ActorId : null,
            status != ApprovalStatus.PENDING_APPROVAL ? resolver?.FullName : null,
            status != ApprovalStatus.PENDING_APPROVAL ? latest.OccurredAt : null,
            status == ApprovalStatus.REJECTED ? latest.Reason : null,
            details,
            auditItems
        );
    }

    public async Task<DisposalReversalApprovalDetailResponse> UpdateStatusAsync(
        Guid id,
        UpdateApprovalStatusRequestDto dto,
        bool isAdmin,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        if (!isAdmin)
        {
            throw new ForbiddenException("Chỉ Quản trị viên (Admin) mới có quyền phê duyệt hủy hóa đơn hoặc xuất hủy sách.");
        }

        var actorId = auditContext.ActorId
            ?? throw new ForbiddenException("Không xác định được danh tính người phê duyệt.");

        var original = await dbContext.AuditLogs
            .FirstOrDefaultAsync(a => (a.Id == id || a.EntityId == id) && a.EntityType == AuditEntityType, cancellationToken)
            ?? throw new NotFoundException($"Không tìm thấy yêu cầu: {id}");

        if (dto.Status != ApprovalStatus.APPROVED && dto.Status != ApprovalStatus.REJECTED)
        {
            throw new BadRequestException("Trạng thái xử lý phải là APPROVED hoặc REJECTED.");
        }

        if (dto.Status == ApprovalStatus.REJECTED && string.IsNullOrWhiteSpace(dto.Reason))
        {
            throw new BadRequestException("Bắt buộc phải nhập lý do khi từ chối yêu cầu.");
        }

        var targetId = original.EntityId != Guid.Empty ? original.EntityId : original.Id;
        var action = dto.Status == ApprovalStatus.APPROVED ? "REVERSAL_APPROVED" : "REVERSAL_REJECTED";

        await auditLogService.CreateAuditLogEntryAsync(new CreateAuditLogEntry(
            action,
            AuditEntityType,
            targetId,
            original.AfterData,
            System.Text.Json.JsonSerializer.Serialize(new { Status = dto.Status, ApprovedBy = actorId, Reason = dto.Reason }),
            dto.Reason ?? (dto.Status == ApprovalStatus.APPROVED ? "Chấp thuận phê duyệt" : "Từ chối yêu cầu"),
            auditContext
        ), cancellationToken);

        return await GetByIdAsync(targetId, cancellationToken);
    }

    public async Task<DisposalReversalApprovalDetailResponse> CreateAsync(
        CreateDisposalReversalApprovalRequestDto dto,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var actorId = auditContext.ActorId
            ?? throw new ForbiddenException("Không xác định được danh tính người lập yêu cầu.");

        var entryId = Guid.NewGuid();
        var snapshot = System.Text.Json.JsonSerializer.Serialize(new
        {
            dto.RequestType,
            dto.ReferenceCode,
            TitleName = dto.RequestType == "HỦY_HÓA_ĐƠN_BÁN" ? "Hóa đơn bán lẻ" : "Xuất hủy sách tổn thất",
            dto.Amount,
            dto.Details
        });

        await auditLogService.CreateAuditLogEntryAsync(new CreateAuditLogEntry(
            "REVERSAL_CREATED",
            AuditEntityType,
            entryId,
            null,
            snapshot,
            dto.Reason,
            auditContext
        ), cancellationToken);

        return await GetByIdAsync(entryId, cancellationToken);
    }
}
