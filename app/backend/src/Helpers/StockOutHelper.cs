using System.Text.Json;
using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.Common;
using backend.src.Dto.StockOutDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Helpers;

public record StockOutStoredLinePayload(
    Guid CopyId,
    string CopyBarcode,
    string TitleName,
    string ConditionGrade,
    string? ConditionNote,
    long CostPrice,
    string TargetStatus,
    string? LineReason
);

public record StockOutStoredSlipPayload(
    string RequestType,
    string ReferenceCode,
    string TitleName,
    long Amount,
    string StockOutType,
    string StockOutTypeLabel,
    string TargetStatus,
    string Reason,
    string? EvidenceFileName,
    IReadOnlyList<StockOutStoredLinePayload> Lines
);

public static class StockOutHelper
{
    public const string AuditEntityType = "DISPOSAL_REVERSAL_APPROVAL";
    public const string BookCopyAuditEntityType = "BookCopy";
    public const string ActionCreated = "STOCK_OUT_CREATED";
    public const string ActionApproved = "REVERSAL_APPROVED";
    public const string ActionRejected = "REVERSAL_REJECTED";
    public const string ActionConfirmed = "STOCK_OUT_CONFIRMED";
    public const string ActionBookCopyStatusChange = "BOOK_COPY_STATUS_CHANGE";

    private static readonly HashSet<BookCopyStatus> BlockedSourceStatuses =
    [
        BookCopyStatus.RENTED,
        BookCopyStatus.SOLD,
        BookCopyStatus.DISPOSED,
        BookCopyStatus.INVENTORY_LOCKED
    ];

    public static (string NormalizedType, string Label, BookCopyStatus TargetStatus) ResolveStockOutType(string? rawType)
    {
        var normalized = string.IsNullOrWhiteSpace(rawType)
            ? "DISPOSAL_DAMAGED"
            : rawType.Trim().ToUpperInvariant();

        return normalized switch
        {
            "DISPOSAL_DAMAGED" => ("DISPOSAL_DAMAGED", "Xuất hủy sách hư hỏng", BookCopyStatus.DISPOSED),
            "DISCONTINUED_CIRCULATION" => ("DISCONTINUED_CIRCULATION", "Ngừng lưu hành / kinh doanh", BookCopyStatus.DISCONTINUED),
            "LOST_WRITE_OFF" => ("LOST_WRITE_OFF", "Xuất xóa sổ sách thất lạc", BookCopyStatus.LOST),
            "RETURN_SUPPLIER" => ("RETURN_SUPPLIER", "Xuất trả nhà cung cấp", BookCopyStatus.DISPOSED),
            _ => throw new BadRequestException($"Loại xuất kho '{rawType}' không hợp lệ.")
        };
    }

    public static string ValidateReason(string? rawReason)
    {
        if (string.IsNullOrWhiteSpace(rawReason))
        {
            throw new BadRequestException("Lý do nghiệp vụ xuất kho không được để trống.");
        }

        var trimmed = rawReason.Trim();
        if (trimmed.Length > 500)
        {
            throw new BadRequestException("Lý do nghiệp vụ không được vượt quá 500 ký tự.");
        }

        return trimmed;
    }

    public static async Task<List<(BookCopyModel Copy, string TitleName, string? LineReason)>> ValidateAndLoadCopiesAsync(
        AppDbContext dbContext,
        IReadOnlyList<StockOutLineRequest>? lines,
        CancellationToken cancellationToken = default)
    {
        if (lines is null || lines.Count == 0)
        {
            throw new BadRequestException("Phiếu xuất kho phải có ít nhất 1 bản sách (CopyBarcode).");
        }

        var normalizedBarcodes = new List<string>(lines.Count);
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var line in lines)
        {
            var code = BookCopyValidator.NormalizeBarcode(line.CopyBarcode)
                ?? throw new BadRequestException("CopyBarcode trong danh sách xuất kho không được để trống.");

            if (!seen.Add(code))
            {
                throw new BadRequestException($"Mã vạch '{code}' bị lặp lại trong cùng một phiếu xuất kho.");
            }

            normalizedBarcodes.Add(code);
        }

        var copyRows = await (from c in dbContext.BookCopies
                              where normalizedBarcodes.Contains(c.CopyBarcode)
                              join e in dbContext.Editions.AsNoTracking() on c.EditionId equals e.Id
                              join t in dbContext.Titles.AsNoTracking() on e.TitleId equals t.Id
                              select new
                              {
                                  Copy = c,
                                  TitleName = t.Name,
                                  t.VolumeLabel
                              }).ToListAsync(cancellationToken);

        var rowByBarcode = copyRows.ToDictionary(x => x.Copy.CopyBarcode, StringComparer.OrdinalIgnoreCase);

        var result = new List<(BookCopyModel Copy, string TitleName, string? LineReason)>(lines.Count);

        foreach (var line in lines)
        {
            var code = BookCopyValidator.NormalizeBarcode(line.CopyBarcode)!;
            if (!rowByBarcode.TryGetValue(code, out var row))
            {
                throw new NotFoundException($"Không tìm thấy bản sách vật lý có CopyBarcode '{code}'.");
            }

            if (BlockedSourceStatuses.Contains(row.Copy.Status))
            {
                throw new ConflictException(
                    $"Không thể xuất kho bản sách '{row.Copy.CopyBarcode}' vì đang ở trạng thái {row.Copy.Status}.");
            }

            await BookCopyValidator.EnsureNoActiveReferenceAsync(dbContext, row.Copy.Id, cancellationToken);

            var fullTitle = string.IsNullOrWhiteSpace(row.VolumeLabel)
                ? row.TitleName
                : $"{row.TitleName} - {row.VolumeLabel}";

            var lineReason = string.IsNullOrWhiteSpace(line.LineReason) ? null : line.LineReason.Trim();
            result.Add((row.Copy, fullTitle, lineReason));
        }

        return result;
    }

    public static async Task<PagedResult<StockOutDetailResponse>> GetPagedAsync(
        AppDbContext dbContext,
        StockOutQuery query,
        CancellationToken cancellationToken = default)
    {
        var rawLogs = await dbContext.AuditLogs.AsNoTracking()
            .Where(a => a.EntityType == AuditEntityType)
            .OrderByDescending(a => a.OccurredAt)
            .ToListAsync(cancellationToken);

        var stockOutGroups = rawLogs
            .GroupBy(l => l.EntityId != Guid.Empty ? l.EntityId : l.Id)
            .Where(g => g.Any(l => l.Action == ActionCreated || IsStockOutPayload(l.AfterData)))
            .ToList();

        var actorIds = rawLogs
            .Where(a => a.ActorId.HasValue)
            .Select(a => a.ActorId!.Value)
            .Distinct()
            .ToList();

        var actors = actorIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await dbContext.Employees.AsNoTracking()
                .Where(e => actorIds.Contains(e.Id))
                .ToDictionaryAsync(e => e.Id, e => e.FullName, cancellationToken);

        var allCopyIds = new HashSet<Guid>();
        var parsedGroupPayloads = new List<(Guid SlipId, List<AuditLogModel> Logs, StockOutStoredSlipPayload Payload)>();

        foreach (var group in stockOutGroups)
        {
            var logs = group.OrderBy(l => l.OccurredAt).ToList();
            var origin = logs.First();
            var payload = TryParsePayload(origin.AfterData, origin.Reason);
            if (payload is null) continue;

            foreach (var line in payload.Lines)
            {
                if (line.CopyId != Guid.Empty)
                {
                    allCopyIds.Add(line.CopyId);
                }
            }

            parsedGroupPayloads.Add((group.Key, logs, payload));
        }

        var currentCopyStatuses = allCopyIds.Count == 0
            ? new Dictionary<Guid, BookCopyStatus>()
            : await dbContext.BookCopies.AsNoTracking()
                .Where(c => allCopyIds.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => c.Status, cancellationToken);

        var items = parsedGroupPayloads
            .Select(g => BuildDetailFromLogs(g.SlipId, g.Logs, g.Payload, actors, currentCopyStatuses))
            .OrderByDescending(x => x.CreatedAt)
            .AsEnumerable();

        if (query.Status.HasValue)
        {
            items = items.Where(x => x.Status == query.Status.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var q = query.Search.Trim().ToLowerInvariant();
            items = items.Where(x =>
                x.Code.ToLowerInvariant().Contains(q) ||
                x.Reason.ToLowerInvariant().Contains(q) ||
                x.Lines.Any(l => l.CopyBarcode.ToLowerInvariant().Contains(q) || l.TitleName.ToLowerInvariant().Contains(q)));
        }

        var materialized = items.ToList();
        var totalCount = materialized.Count;
        var paged = materialized
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToList();

        return new PagedResult<StockOutDetailResponse>(paged, totalCount, query.Page, query.PageSize);
    }

    public static async Task<StockOutDetailResponse> GetByIdAsync(
        AppDbContext dbContext,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var logs = await dbContext.AuditLogs.AsNoTracking()
            .Where(a => a.EntityType == AuditEntityType && (a.EntityId == id || a.Id == id))
            .OrderBy(a => a.OccurredAt)
            .ToListAsync(cancellationToken);

        if (logs.Count == 0)
        {
            throw new NotFoundException($"Không tìm thấy phiếu xuất kho với ID '{id}'.");
        }

        var origin = logs.First();
        var payload = TryParsePayload(origin.AfterData, origin.Reason)
            ?? throw new NotFoundException($"Không tìm thấy dữ liệu phiếu xuất kho với ID '{id}'.");

        var actorIds = logs
            .Where(a => a.ActorId.HasValue)
            .Select(a => a.ActorId!.Value)
            .Distinct()
            .ToList();

        var actors = actorIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await dbContext.Employees.AsNoTracking()
                .Where(e => actorIds.Contains(e.Id))
                .ToDictionaryAsync(e => e.Id, e => e.FullName, cancellationToken);

        var copyIds = payload.Lines.Where(l => l.CopyId != Guid.Empty).Select(l => l.CopyId).ToList();
        var currentCopyStatuses = copyIds.Count == 0
            ? new Dictionary<Guid, BookCopyStatus>()
            : await dbContext.BookCopies.AsNoTracking()
                .Where(c => copyIds.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => c.Status, cancellationToken);

        var slipId = origin.EntityId != Guid.Empty ? origin.EntityId : origin.Id;
        return BuildDetailFromLogs(slipId, logs, payload, actors, currentCopyStatuses);
    }

    private static StockOutDetailResponse BuildDetailFromLogs(
        Guid slipId,
        IReadOnlyList<AuditLogModel> chronologicalLogs,
        StockOutStoredSlipPayload payload,
        IReadOnlyDictionary<Guid, string> actors,
        IReadOnlyDictionary<Guid, BookCopyStatus> currentCopyStatuses)
    {
        var origin = chronologicalLogs[0];
        var latest = chronologicalLogs[^1];

        var status = ApprovalStatus.PENDING_APPROVAL;
        if (chronologicalLogs.Any(l => l.Action == ActionConfirmed))
        {
            status = ApprovalStatus.COMPLETED;
        }
        else if (latest.Action.EndsWith("_APPROVED", StringComparison.Ordinal))
        {
            status = ApprovalStatus.APPROVED;
        }
        else if (latest.Action.EndsWith("_REJECTED", StringComparison.Ordinal))
        {
            status = ApprovalStatus.REJECTED;
        }

        var approvalLog = chronologicalLogs.LastOrDefault(l =>
            l.Action.EndsWith("_APPROVED", StringComparison.Ordinal) ||
            l.Action.EndsWith("_REJECTED", StringComparison.Ordinal) ||
            l.Action == ActionConfirmed);

        var creatorId = origin.ActorId ?? Guid.Empty;
        var creatorName = actors.GetValueOrDefault(creatorId, "Nhân viên kho");

        var approverId = approvalLog?.ActorId;
        var approverName = approverId.HasValue
            ? actors.GetValueOrDefault(approverId.Value, "Quản lý")
            : null;

        var lines = payload.Lines.Select(l =>
        {
            var currentStatus = currentCopyStatuses.TryGetValue(l.CopyId, out var st)
                ? st.ToString()
                : l.TargetStatus;

            return new StockOutLineResponse(
                l.CopyId,
                l.CopyBarcode,
                l.TitleName,
                l.ConditionGrade,
                l.ConditionNote,
                l.CostPrice,
                currentStatus,
                l.TargetStatus,
                l.LineReason);
        }).ToList();

        var history = chronologicalLogs.Select(l =>
        {
            var actorName = l.ActorId.HasValue
                ? actors.GetValueOrDefault(l.ActorId.Value, "Nhân viên")
                : "Hệ thống";

            var actionLabel = l.Action switch
            {
                ActionCreated => "Lập phiếu xuất & gửi phê duyệt",
                ActionApproved => "Quản lý phê duyệt phiếu xuất",
                ActionRejected => "Quản lý từ chối phiếu xuất",
                ActionConfirmed => "Xác nhận xuất kho & cập nhật trạng thái sách",
                _ => l.Action
            };

            return new StockOutHistoryItemResponse(
                l.Id,
                l.OccurredAt,
                l.ActorId,
                actorName,
                actionLabel,
                l.Reason);
        }).ToList();

        return new StockOutDetailResponse(
            slipId,
            payload.ReferenceCode,
            payload.StockOutType,
            payload.StockOutTypeLabel,
            status,
            payload.Reason,
            payload.EvidenceFileName,
            lines.Count,
            payload.Amount,
            creatorId,
            creatorName,
            origin.OccurredAt,
            approverId,
            approverName,
            approvalLog?.OccurredAt,
            lines,
            history);
    }

    private static bool IsStockOutPayload(string? afterData)
    {
        if (string.IsNullOrWhiteSpace(afterData)) return false;
        return afterData.Contains("\"StockOutType\"", StringComparison.Ordinal) ||
               afterData.Contains("XUẤT_HỦY", StringComparison.OrdinalIgnoreCase) ||
               afterData.Contains("DISPOSAL", StringComparison.OrdinalIgnoreCase);
    }

    private static StockOutStoredSlipPayload? TryParsePayload(string? afterData, string? fallbackReason)
    {
        if (string.IsNullOrWhiteSpace(afterData)) return null;

        try
        {
            using var doc = JsonDocument.Parse(afterData);
            var root = doc.RootElement;

            var refCode = root.TryGetProperty("ReferenceCode", out var rc)
                ? rc.GetString() ?? "OUT-000001"
                : "OUT-000001";
            var stockOutType = root.TryGetProperty("StockOutType", out var st)
                ? st.GetString() ?? "DISPOSAL_DAMAGED"
                : "DISPOSAL_DAMAGED";
            var (normalizedType, typeLabel, targetStatus) = ResolveStockOutType(stockOutType);

            var amount = root.TryGetProperty("Amount", out var am) && am.TryGetInt64(out var parsedAmt)
                ? parsedAmt
                : 0L;
            var reason = root.TryGetProperty("Reason", out var rs)
                ? rs.GetString() ?? fallbackReason ?? string.Empty
                : fallbackReason ?? string.Empty;
            var evidence = root.TryGetProperty("EvidenceFileName", out var ev)
                ? ev.GetString()
                : null;
            var titleName = root.TryGetProperty("TitleName", out var tn)
                ? tn.GetString() ?? typeLabel
                : typeLabel;
            var reqType = root.TryGetProperty("RequestType", out var rt)
                ? rt.GetString() ?? "XUẤT_HỦY_SÁCH"
                : "XUẤT_HỦY_SÁCH";

            var lines = new List<StockOutStoredLinePayload>();
            if (root.TryGetProperty("Lines", out var linesElem) && linesElem.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in linesElem.EnumerateArray())
                {
                    var copyId = item.TryGetProperty("CopyId", out var cid) && Guid.TryParse(cid.GetString(), out var g)
                        ? g
                        : Guid.Empty;
                    var barcode = item.TryGetProperty("CopyBarcode", out var bc)
                        ? bc.GetString() ?? string.Empty
                        : string.Empty;
                    var lineTitle = item.TryGetProperty("TitleName", out var lt)
                        ? lt.GetString() ?? "Bản sách"
                        : "Bản sách";
                    var grade = item.TryGetProperty("ConditionGrade", out var cg)
                        ? cg.GetString() ?? "A"
                        : "A";
                    var note = item.TryGetProperty("ConditionNote", out var cn)
                        ? cn.GetString()
                        : null;
                    var cost = item.TryGetProperty("CostPrice", out var cp) && cp.TryGetInt64(out var parsedCost)
                        ? parsedCost
                        : 0L;
                    var lineTarget = item.TryGetProperty("TargetStatus", out var ts)
                        ? ts.GetString() ?? targetStatus.ToString()
                        : targetStatus.ToString();
                    var lineReason = item.TryGetProperty("LineReason", out var lr)
                        ? lr.GetString()
                        : null;

                    lines.Add(new StockOutStoredLinePayload(
                        copyId,
                        barcode,
                        lineTitle,
                        grade,
                        note,
                        cost,
                        lineTarget,
                        lineReason));
                }
            }

            return new StockOutStoredSlipPayload(
                reqType,
                refCode,
                titleName,
                amount,
                normalizedType,
                typeLabel,
                targetStatus.ToString(),
                reason,
                evidence,
                lines);
        }
        catch
        {
            return null;
        }
    }
}
