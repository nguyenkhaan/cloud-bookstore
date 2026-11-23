using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.BookCopyDto;
using backend.src.Dto.InventoryAdjustmentDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Helpers;

/// <summary>
/// Encapsulates target check resolution and state-transition execution for inventory adjustment requests.
/// </summary>
public static class InventoryAdjustmentWorkflowHelper
{
    public static async Task<(InventoryCheckModel? ExistingCheck, BookCopyModel Copy)> ResolveTargetAsync(
        AppDbContext dbContext,
        CreateInventoryAdjustmentRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        if (dto.InventoryCheckId is not { } checkId || checkId == Guid.Empty)
        {
            return (null, await InventoryAdjustmentQueryHelper.ResolveBookCopyAsync(
                dbContext, dto.CopyId, dto.CopyBarcode, cancellationToken));
        }

        var existingCheck = await dbContext.InventoryChecks
            .FirstOrDefaultAsync(c => c.Id == checkId, cancellationToken)
            ?? throw new NotFoundException($"Bản ghi kiểm kê với ID '{checkId}' không tồn tại.");

        if (dto.CopyId.HasValue && dto.CopyId.Value != Guid.Empty && dto.CopyId.Value != existingCheck.CopyId)
        {
            throw new BadRequestException("CopyId không khớp với bản ghi kiểm kê đã chọn.");
        }

        var copy = await dbContext.BookCopies
            .FirstOrDefaultAsync(c => c.Id == existingCheck.CopyId, cancellationToken)
            ?? throw new NotFoundException($"Bản sách với ID '{existingCheck.CopyId}' không tồn tại.");

        return (existingCheck, copy);
    }

    public static async Task EnsureNoOpenRequestForCopyAsync(
        AppDbContext dbContext,
        Guid copyId,
        string barcode,
        CancellationToken cancellationToken = default)
    {
        var hasOpenRequest = await (
            from r in dbContext.InventoryAdjustmentRequests.AsNoTracking()
            join c in dbContext.InventoryChecks.AsNoTracking() on r.InventoryCheckId equals c.Id
            where c.CopyId == copyId &&
                  (r.Status == InventoryAdjustmentStatus.PENDING_APPROVAL ||
                   r.Status == InventoryAdjustmentStatus.APPROVED)
            select r.Id).AnyAsync(cancellationToken);

        if (hasOpenRequest)
        {
            throw new ConflictException($"Bản sách {barcode} đang có yêu cầu điều chỉnh chờ xử lý.");
        }
    }

    public static async Task<InventoryCheckModel> EnsureOrCreateCheckAsync(
        AppDbContext dbContext,
        InventoryCheckModel? existingCheck,
        BookCopyModel copy,
        CreateInventoryAdjustmentRequestDto dto,
        BookCopyStatus requestedStatus,
        string reason,
        string? checkNote,
        Guid actorId,
        DateTime now,
        CancellationToken cancellationToken = default)
    {
        if (existingCheck is not null)
        {
            var checkHasActiveOrApplied = await dbContext.InventoryAdjustmentRequests
                .AnyAsync(r => r.InventoryCheckId == existingCheck.Id &&
                               (r.Status == InventoryAdjustmentStatus.PENDING_APPROVAL ||
                                r.Status == InventoryAdjustmentStatus.APPROVED ||
                                r.Status == InventoryAdjustmentStatus.APPLIED),
                    cancellationToken);
            if (checkHasActiveOrApplied)
            {
                throw new ConflictException("Bản ghi kiểm kê này đã có yêu cầu điều chỉnh đang xử lý hoặc đã áp dụng.");
            }

            return existingCheck;
        }

        var checkCode = InventoryAdjustmentValidator.ResolveCheckCode(dto.CheckCode, now);
        var duplicateCheck = await dbContext.InventoryChecks
            .AnyAsync(c => c.CheckCode == checkCode && c.CopyId == copy.Id, cancellationToken);
        if (duplicateCheck)
        {
            throw new ConflictException($"Mã kiểm kê '{checkCode}' đã tồn tại cho bản sách {copy.CopyBarcode}.");
        }

        var check = new InventoryCheckModel
        {
            Id = Guid.NewGuid(),
            CheckCode = checkCode,
            CopyId = copy.Id,
            ExpectedStatus = copy.Status,
            ObservedStatus = requestedStatus,
            IsFound = dto.IsFound ?? (requestedStatus != BookCopyStatus.LOST),
            VarianceType = InventoryAdjustmentValidator.InferVarianceType(dto.VarianceType, copy.Status, requestedStatus),
            Note = checkNote ?? reason,
            CheckedBy = actorId,
            CheckedAt = now
        };
        dbContext.InventoryChecks.Add(check);
        return check;
    }

    public static async Task<List<CreateAuditLogEntry>> ApplyStatusTransitionAsync(
        AppDbContext dbContext,
        InventoryAdjustmentRequestModel request,
        InventoryAdjustmentStatus target,
        string? rawReason,
        Guid actorId,
        DateTime now,
        object beforeSnapshot,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var audits = new List<CreateAuditLogEntry>();

        switch (target)
        {
            case InventoryAdjustmentStatus.REJECTED:
            {
                var rejectionReason = InventoryAdjustmentValidator.RequireText(rawReason, "Lý do từ chối");
                request.Status = InventoryAdjustmentStatus.REJECTED;
                request.RejectionReason = rejectionReason;
                request.ApprovedBy = actorId;
                request.ApprovedAt = now;
                audits.Add(InventoryAdjustmentAuditHelper.BuildRequestAudit(
                    InventoryAdjustmentAuditHelper.ActionReject, request.Id, beforeSnapshot, request, rejectionReason, auditContext));
                break;
            }
            case InventoryAdjustmentStatus.APPROVED:
            {
                var approvalNote = InventoryAdjustmentValidator.OptionalText(rawReason, "Ghi chú phê duyệt")
                    ?? "Admin phê duyệt yêu cầu điều chỉnh kho.";
                request.Status = InventoryAdjustmentStatus.APPROVED;
                request.ApprovedBy = actorId;
                request.ApprovedAt = now;
                audits.Add(InventoryAdjustmentAuditHelper.BuildRequestAudit(
                    InventoryAdjustmentAuditHelper.ActionApprove, request.Id, beforeSnapshot, request, approvalNote, auditContext));
                break;
            }
            case InventoryAdjustmentStatus.APPLIED:
            {
                var check = await dbContext.InventoryChecks
                    .FirstOrDefaultAsync(c => c.Id == request.InventoryCheckId, cancellationToken)
                    ?? throw new NotFoundException($"Bản ghi kiểm kê '{request.InventoryCheckId}' không tồn tại.");

                var copy = await dbContext.BookCopies
                    .FirstOrDefaultAsync(c => c.Id == check.CopyId, cancellationToken)
                    ?? throw new NotFoundException($"Bản sách với ID '{check.CopyId}' không tồn tại.");

                await InventoryAdjustmentValidator.EnsureCopyEligibleForStatusAsync(
                    dbContext, copy, request.RequestedStatus, cancellationToken);

                var applyNote = InventoryAdjustmentValidator.OptionalText(rawReason, "Ghi chú áp dụng")
                    ?? "Admin duyệt và áp dụng điều chỉnh trạng thái bản sách.";

                var copyBefore = copy.ToAuditSnapshot();
                copy.Status = request.RequestedStatus;
                request.ApprovedBy ??= actorId;
                request.ApprovedAt ??= now;
                request.AppliedAt = now;
                request.Status = InventoryAdjustmentStatus.APPLIED;

                audits.Add(InventoryAdjustmentAuditHelper.BuildRequestAudit(
                    InventoryAdjustmentAuditHelper.ActionApply, request.Id, beforeSnapshot, request, applyNote, auditContext));
                audits.Add(InventoryAdjustmentAuditHelper.BuildCopyStatusAudit(
                    copy, copyBefore, check.CheckCode, applyNote, auditContext));
                break;
            }
            default:
                throw new BadRequestException($"Không hỗ trợ chuyển trực tiếp sang trạng thái {target}.");
        }

        return audits;
    }
}
