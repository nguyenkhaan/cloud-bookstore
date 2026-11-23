using backend.src.Data;
using backend.src.Dto.Common;
using backend.src.Dto.InventoryAdjustmentDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Helpers;

/// <summary>
/// Provides filtered queries, stats projections, detail assembly, and entity lookups for inventory adjustments.
/// </summary>
public static class InventoryAdjustmentQueryHelper
{
    public const string RetentionSettingKey = "inventory_adjustment.retention_days";
    public const int DefaultRetentionDays = 365;

    public static async Task<PagedResult<InventoryAdjustmentRequestResponse>> GetPagedAsync(
        AppDbContext dbContext,
        InventoryAdjustmentQuery query,
        CancellationToken cancellationToken = default)
    {
        ValidateQuery(query);

        var rows = from r in dbContext.InventoryAdjustmentRequests.AsNoTracking()
                   join c in dbContext.InventoryChecks.AsNoTracking() on r.InventoryCheckId equals c.Id
                   join bc in dbContext.BookCopies.AsNoTracking() on c.CopyId equals bc.Id
                   join e in dbContext.Editions.AsNoTracking() on bc.EditionId equals e.Id
                   join t in dbContext.Titles.AsNoTracking() on e.TitleId equals t.Id
                   join reqEmp in dbContext.Employees.AsNoTracking() on r.RequestedBy equals reqEmp.Id
                   join appEmp in dbContext.Employees.AsNoTracking() on r.ApprovedBy equals appEmp.Id into appGroup
                   from appEmp in appGroup.DefaultIfEmpty()
                   select new AdjustmentListRow
                   {
                       Request = r,
                       Check = c,
                       Copy = bc,
                       Title = t,
                       Requester = reqEmp,
                       Approver = appEmp
                   };

        rows = ApplyFilters(rows, query);

        var totalCount = await rows.CountAsync(cancellationToken);

        var items = await rows
            .OrderBy(x => x.Request.Status == InventoryAdjustmentStatus.PENDING_APPROVAL ? 0 :
                          x.Request.Status == InventoryAdjustmentStatus.APPROVED ? 1 : 2)
            .ThenByDescending(x => x.Request.RequestedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(x => new InventoryAdjustmentRequestResponse(
                x.Request.Id,
                x.Request.InventoryCheckId,
                x.Check.CheckCode,
                x.Copy.Id,
                x.Copy.CopyBarcode,
                x.Title.Name,
                x.Copy.Status,
                x.Check.ExpectedStatus,
                x.Check.ObservedStatus,
                x.Request.RequestedStatus,
                x.Check.VarianceType,
                x.Check.IsFound,
                x.Request.Reason,
                x.Request.Status,
                x.Request.RequestedBy,
                x.Requester.FullName,
                x.Request.RequestedAt,
                x.Request.ApprovedBy,
                x.Approver != null ? x.Approver.FullName : null,
                x.Request.ApprovedAt,
                x.Request.RejectionReason,
                x.Request.AppliedAt))
            .ToListAsync(cancellationToken);

        return new PagedResult<InventoryAdjustmentRequestResponse>(items, totalCount, query.Page, query.PageSize);
    }

    public static async Task<InventoryAdjustmentStatsResponse> GetStatsAsync(
        AppDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        var counts = await dbContext.InventoryAdjustmentRequests
            .AsNoTracking()
            .GroupBy(r => r.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Status, x => x.Count, cancellationToken);

        var pending = counts.GetValueOrDefault(InventoryAdjustmentStatus.PENDING_APPROVAL);
        var approved = counts.GetValueOrDefault(InventoryAdjustmentStatus.APPROVED);
        var applied = counts.GetValueOrDefault(InventoryAdjustmentStatus.APPLIED);
        var rejected = counts.GetValueOrDefault(InventoryAdjustmentStatus.REJECTED);
        var cancelled = counts.GetValueOrDefault(InventoryAdjustmentStatus.CANCELLED);

        return new InventoryAdjustmentStatsResponse(
            pending,
            approved,
            applied,
            rejected,
            cancelled,
            pending + approved + applied + rejected + cancelled);
    }

    public static async Task<InventoryAdjustmentRequestDetailResponse> GetDetailAsync(
        AppDbContext dbContext,
        Guid id,
        DateTime utcNow,
        CancellationToken cancellationToken = default)
    {
        var row = await (from r in dbContext.InventoryAdjustmentRequests.AsNoTracking()
                         where r.Id == id
                         join c in dbContext.InventoryChecks.AsNoTracking() on r.InventoryCheckId equals c.Id
                         join chkEmp in dbContext.Employees.AsNoTracking() on c.CheckedBy equals chkEmp.Id
                         join bc in dbContext.BookCopies.AsNoTracking() on c.CopyId equals bc.Id
                         join e in dbContext.Editions.AsNoTracking() on bc.EditionId equals e.Id
                         join t in dbContext.Titles.AsNoTracking() on e.TitleId equals t.Id
                         join reqEmp in dbContext.Employees.AsNoTracking() on r.RequestedBy equals reqEmp.Id
                         join appEmp in dbContext.Employees.AsNoTracking() on r.ApprovedBy equals appEmp.Id into appGroup
                         from appEmp in appGroup.DefaultIfEmpty()
                         select new { r, c, chkEmp, bc, e, t, reqEmp, appEmp })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException($"Yêu cầu điều chỉnh kho với ID '{id}' không tồn tại.");

        var historyRows = await (from a in dbContext.AuditLogs.AsNoTracking()
                                 where a.EntityType == InventoryAdjustmentAuditHelper.AuditEntityType && a.EntityId == id
                                 join actor in dbContext.Employees.AsNoTracking() on a.ActorId equals actor.Id into actorGroup
                                 from actor in actorGroup.DefaultIfEmpty()
                                 orderby a.OccurredAt descending
                                 select new InventoryAdjustmentAuditItem(
                                     a.Id,
                                     a.OccurredAt,
                                     a.ActorId,
                                     actor != null ? actor.FullName : null,
                                     a.Action,
                                     a.BeforeData,
                                     a.AfterData,
                                     a.Reason))
            .ToListAsync(cancellationToken);

        var retentionDays = await GetRetentionDaysAsync(dbContext, cancellationToken);
        var retainUntil = InventoryAdjustmentValidator.ComputeRetainUntil(row.r, retentionDays);
        var canDelete = InventoryAdjustmentValidator.CanDeleteByRetention(row.r, retentionDays, utcNow);

        return new InventoryAdjustmentRequestDetailResponse(
            row.r.Id,
            row.r.InventoryCheckId,
            row.c.CheckCode,
            row.c.Note,
            row.c.CheckedAt,
            row.c.CheckedBy,
            row.chkEmp.FullName,
            row.bc.Id,
            row.bc.CopyBarcode,
            row.e.Id,
            row.e.Isbn,
            row.t.Name,
            row.bc.Status,
            row.c.ExpectedStatus,
            row.c.ObservedStatus,
            row.r.RequestedStatus,
            row.c.VarianceType,
            row.c.IsFound,
            row.r.Reason,
            row.r.Status,
            row.r.RequestedBy,
            row.reqEmp.FullName,
            row.r.RequestedAt,
            row.r.ApprovedBy,
            row.appEmp != null ? row.appEmp.FullName : null,
            row.r.ApprovedAt,
            row.r.RejectionReason,
            row.r.AppliedAt,
            canDelete,
            retainUntil,
            historyRows);
    }

    public static async Task<BookCopyModel> ResolveBookCopyAsync(
        AppDbContext dbContext,
        Guid? copyId,
        string? copyBarcode,
        CancellationToken cancellationToken = default)
    {
        if (copyId.HasValue && copyId.Value != Guid.Empty)
        {
            return await dbContext.BookCopies
                .FirstOrDefaultAsync(c => c.Id == copyId.Value, cancellationToken)
                ?? throw new NotFoundException($"Bản sách với ID '{copyId.Value}' không tồn tại.");
        }

        var normalizedBarcode = BookCopyValidator.NormalizeBarcode(copyBarcode);
        if (normalizedBarcode is not null)
        {
            return await dbContext.BookCopies
                .FirstOrDefaultAsync(c => c.CopyBarcode == normalizedBarcode, cancellationToken)
                ?? throw new NotFoundException($"Không tìm thấy bản sách với CopyBarcode '{normalizedBarcode}'.");
        }

        throw new BadRequestException("Vui lòng cung cấp bản sách (CopyId hoặc CopyBarcode).");
    }

    public static async Task<int> GetRetentionDaysAsync(
        AppDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        var setting = await dbContext.SystemSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == RetentionSettingKey, cancellationToken);

        if (setting is null || setting.Value < 1)
        {
            return DefaultRetentionDays;
        }

        return (int)Math.Truncate(setting.Value);
    }

    private static void ValidateQuery(InventoryAdjustmentQuery query)
    {
        if (query.Page < 1)
        {
            throw new BadRequestException("Số trang (Page) phải lớn hơn hoặc bằng 1.");
        }

        if (query.PageSize is < 1 or > 100)
        {
            throw new BadRequestException("Kích thước trang (PageSize) phải nằm trong khoảng từ 1 đến 100.");
        }

        if (query.From.HasValue && query.To.HasValue && query.From.Value > query.To.Value)
        {
            throw new BadRequestException("Khoảng thời gian lọc không hợp lệ (From phải nhỏ hơn hoặc bằng To).");
        }
    }

    private static IQueryable<AdjustmentListRow> ApplyFilters(
        IQueryable<AdjustmentListRow> rows,
        InventoryAdjustmentQuery query)
    {
        if (query.Status.HasValue)
        {
            var status = query.Status.Value;
            rows = rows.Where(x => x.Request.Status == status);
        }

        if (query.RequestedStatus.HasValue)
        {
            var requestedStatus = query.RequestedStatus.Value;
            rows = rows.Where(x => x.Request.RequestedStatus == requestedStatus);
        }

        if (query.VarianceType.HasValue)
        {
            var varianceType = query.VarianceType.Value;
            rows = rows.Where(x => x.Check.VarianceType == varianceType);
        }

        if (query.CopyId.HasValue)
        {
            var copyId = query.CopyId.Value;
            rows = rows.Where(x => x.Check.CopyId == copyId);
        }

        if (query.RequestedBy.HasValue)
        {
            var requestedBy = query.RequestedBy.Value;
            rows = rows.Where(x => x.Request.RequestedBy == requestedBy);
        }

        if (query.From.HasValue)
        {
            var from = query.From.Value;
            rows = rows.Where(x => x.Request.RequestedAt >= from);
        }

        if (query.To.HasValue)
        {
            var to = query.To.Value;
            rows = rows.Where(x => x.Request.RequestedAt <= to);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            rows = rows.Where(x =>
                x.Check.CheckCode.ToLower().Contains(term) ||
                x.Copy.CopyBarcode.ToLower().Contains(term) ||
                x.Title.Name.ToLower().Contains(term) ||
                x.Request.Reason.ToLower().Contains(term) ||
                x.Requester.FullName.ToLower().Contains(term));
        }

        return rows;
    }

    private sealed class AdjustmentListRow
    {
        public InventoryAdjustmentRequestModel Request { get; init; } = null!;
        public InventoryCheckModel Check { get; init; } = null!;
        public BookCopyModel Copy { get; init; } = null!;
        public TitleModel Title { get; init; } = null!;
        public EmployeeModel Requester { get; init; } = null!;
        public EmployeeModel? Approver { get; init; }
    }
}
