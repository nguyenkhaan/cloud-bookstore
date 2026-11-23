using System.Text.Json;
using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.Common;
using backend.src.Dto.StockOutDto;
using backend.src.Exceptions;
using backend.src.Helpers;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

public class StockOutService(
    AppDbContext dbContext,
    AuditLogService auditLogService)
{
    public Task<PagedResult<StockOutDetailResponse>> GetStockOutsAsync(
        StockOutQuery query,
        CancellationToken cancellationToken = default)
        => StockOutHelper.GetPagedAsync(dbContext, query, cancellationToken);

    public Task<StockOutDetailResponse> GetStockOutByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
        => StockOutHelper.GetByIdAsync(dbContext, id, cancellationToken);

    public async Task<StockOutDetailResponse> CreateStockOutAsync(
        CreateStockOutRequest request,
        bool isAdmin,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var actorId = await StockReceiptValidator.ResolveActorIdAsync(dbContext, auditContext, cancellationToken);
        var effectiveAuditCtx = new AuditLogContext(actorId, auditContext.IpAddress);

        var (normalizedType, typeLabel, targetStatus) = StockOutHelper.ResolveStockOutType(request.StockOutType);
        var reason = StockOutHelper.ValidateReason(request.Reason);
        var resolvedCopies = await StockOutHelper.ValidateAndLoadCopiesAsync(dbContext, request.Lines, cancellationToken);

        var existingCount = await dbContext.AuditLogs.AsNoTracking()
            .CountAsync(a => a.EntityType == StockOutHelper.AuditEntityType && a.Action == StockOutHelper.ActionCreated, cancellationToken);

        var slipId = Guid.NewGuid();
        var slipCode = $"OUT-{DateTime.UtcNow:yyyyMMdd}-{(existingCount + 1):D3}";
        var totalCost = resolvedCopies.Sum(x => x.Copy.CostPrice > 0 ? x.Copy.CostPrice : (x.Copy.SellingPrice ?? 35000L));

        var storedLines = resolvedCopies.Select(x => new StockOutStoredLinePayload(
            x.Copy.Id,
            x.Copy.CopyBarcode,
            x.TitleName,
            x.Copy.ConditionGrade.ToString(),
            x.Copy.ConditionNote,
            x.Copy.CostPrice > 0 ? x.Copy.CostPrice : (x.Copy.SellingPrice ?? 35000L),
            targetStatus.ToString(),
            x.LineReason)).ToList();

        var summaryTitle = $"{typeLabel} ({storedLines.Count} bản: {string.Join(", ", storedLines.Take(2).Select(l => l.CopyBarcode))})";

        var payload = new StockOutStoredSlipPayload(
            RequestType: "XUẤT_HỦY_SÁCH",
            ReferenceCode: slipCode,
            TitleName: summaryTitle,
            Amount: totalCost,
            StockOutType: normalizedType,
            StockOutTypeLabel: typeLabel,
            TargetStatus: targetStatus.ToString(),
            Reason: reason,
            EvidenceFileName: string.IsNullOrWhiteSpace(request.EvidenceFileName) ? null : request.EvidenceFileName.Trim(),
            Lines: storedLines);

        await auditLogService.CreateAuditLogEntryAsync(
            new CreateAuditLogEntry(
                StockOutHelper.ActionCreated,
                StockOutHelper.AuditEntityType,
                slipId,
                null,
                JsonSerializer.Serialize(payload),
                reason,
                effectiveAuditCtx),
            cancellationToken);

        if (isAdmin)
        {
            await auditLogService.CreateAuditLogEntryAsync(
                new CreateAuditLogEntry(
                    StockOutHelper.ActionApproved,
                    StockOutHelper.AuditEntityType,
                    slipId,
                    null,
                    JsonSerializer.Serialize(new { Status = ApprovalStatus.APPROVED.ToString(), ApprovedBy = actorId }),
                    "Quản trị viên lập và phê duyệt phiếu xuất kho",
                    effectiveAuditCtx),
                cancellationToken);
        }

        return await StockOutHelper.GetByIdAsync(dbContext, slipId, cancellationToken);
    }

    public async Task<StockOutDetailResponse> ConfirmStockOutAsync(
        Guid id,
        bool isAdmin,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var actorId = await StockReceiptValidator.ResolveActorIdAsync(dbContext, auditContext, cancellationToken);
        var effectiveAuditCtx = new AuditLogContext(actorId, auditContext.IpAddress);

        var detail = await StockOutHelper.GetByIdAsync(dbContext, id, cancellationToken);

        if (detail.Status == ApprovalStatus.COMPLETED)
        {
            throw new ConflictException($"Phiếu xuất kho '{detail.Code}' đã được xác nhận xuất kho trước đó.");
        }

        if (detail.Status == ApprovalStatus.REJECTED)
        {
            throw new ConflictException($"Phiếu xuất kho '{detail.Code}' đã bị từ chối nên không thể xuất kho.");
        }

        if (detail.Status == ApprovalStatus.PENDING_APPROVAL && !isAdmin)
        {
            throw new ForbiddenException("Phiếu xuất kho đang chờ Quản trị viên phê duyệt trước khi xác nhận xuất kho.");
        }

        var (_, _, targetStatus) = StockOutHelper.ResolveStockOutType(detail.StockOutType);
        var copyIds = detail.Lines.Select(l => l.CopyId).ToList();

        var copies = await dbContext.BookCopies
            .Where(c => copyIds.Contains(c.Id))
            .ToListAsync(cancellationToken);

        foreach (var copy in copies)
        {
            if (copy.Status is BookCopyStatus.RENTED or BookCopyStatus.SOLD)
            {
                throw new ConflictException(
                    $"Bản sách '{copy.CopyBarcode}' đang ở trạng thái {copy.Status} nên không thể xuất kho.");
            }

            var lineInfo = detail.Lines.FirstOrDefault(l => l.CopyId == copy.Id);
            var previousStatus = copy.Status;
            copy.Status = targetStatus;
            if (!string.IsNullOrWhiteSpace(lineInfo?.LineReason))
            {
                copy.ConditionNote = lineInfo.LineReason;
            }

            await auditLogService.CreateAuditLogEntryAsync(
                new CreateAuditLogEntry(
                    StockOutHelper.ActionBookCopyStatusChange,
                    StockOutHelper.BookCopyAuditEntityType,
                    copy.Id,
                    new { Status = previousStatus.ToString() },
                    new { Status = targetStatus.ToString(), SlipCode = detail.Code },
                    $"Xuất kho theo phiếu {detail.Code}: {detail.Reason}",
                    effectiveAuditCtx),
                cancellationToken);
        }

        await auditLogService.CreateAuditLogEntryAsync(
            new CreateAuditLogEntry(
                StockOutHelper.ActionConfirmed,
                StockOutHelper.AuditEntityType,
                id,
                null,
                JsonSerializer.Serialize(new
                {
                    Status = ApprovalStatus.COMPLETED.ToString(),
                    ConfirmedBy = actorId,
                    UpdatedCopies = copies.Count,
                    TargetStatus = targetStatus.ToString()
                }),
                $"Đã xác nhận xuất kho {copies.Count} bản sách (chuyển sang {targetStatus})",
                effectiveAuditCtx),
            cancellationToken);

        return await StockOutHelper.GetByIdAsync(dbContext, id, cancellationToken);
    }
}
