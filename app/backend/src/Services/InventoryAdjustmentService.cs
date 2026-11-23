using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.Common;
using backend.src.Dto.InventoryAdjustmentDto;
using backend.src.Exceptions;
using backend.src.Helpers;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace backend.src.Services;

/// <summary>
/// Coordinates inventory adjustment lifecycle transitions while delegating queries, validation, workflow, and audit persistence to helpers.
/// </summary>
public class InventoryAdjustmentService(
    AppDbContext dbContext,
    AuditLogService auditLogService,
    ILogger<InventoryAdjustmentService> logger,
    TimeProvider timeProvider)
{
    public const string AuditEntityType = InventoryAdjustmentAuditHelper.AuditEntityType;
    public const string BookCopyAuditEntityType = InventoryAdjustmentAuditHelper.BookCopyAuditEntityType;
    public const string ActionCreate = InventoryAdjustmentAuditHelper.ActionCreate;
    public const string ActionApprove = InventoryAdjustmentAuditHelper.ActionApprove;
    public const string ActionReject = InventoryAdjustmentAuditHelper.ActionReject;
    public const string ActionApply = InventoryAdjustmentAuditHelper.ActionApply;
    public const string ActionCancel = InventoryAdjustmentAuditHelper.ActionCancel;
    public const string ActionRetentionDelete = InventoryAdjustmentAuditHelper.ActionRetentionDelete;
    public const string BookCopyStatusAction = InventoryAdjustmentAuditHelper.BookCopyStatusAction;
    public const string RetentionSettingKey = InventoryAdjustmentQueryHelper.RetentionSettingKey;

    public Task<PagedResult<InventoryAdjustmentRequestResponse>> GetRequestsAsync(
        InventoryAdjustmentQuery query,
        CancellationToken cancellationToken = default)
        => InventoryAdjustmentQueryHelper.GetPagedAsync(dbContext, query, cancellationToken);

    public Task<InventoryAdjustmentStatsResponse> GetStatsAsync(CancellationToken cancellationToken = default)
        => InventoryAdjustmentQueryHelper.GetStatsAsync(dbContext, cancellationToken);

    public Task<InventoryAdjustmentRequestDetailResponse> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
        => InventoryAdjustmentQueryHelper.GetDetailAsync(dbContext, id, timeProvider.GetUtcNow().UtcDateTime, cancellationToken);

    public async Task<InventoryAdjustmentRequestDetailResponse> CreateAsync(
        CreateInventoryAdjustmentRequestDto dto,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var actorId = InventoryAdjustmentValidator.RequireActorId(auditContext);
        var requestedStatus = dto.RequestedStatus
            ?? throw new BadRequestException("Trạng thái đề xuất (RequestedStatus) không được để trống.");
        var reason = InventoryAdjustmentValidator.RequireText(dto.Reason, "Lý do điều chỉnh");
        var checkNote = InventoryAdjustmentValidator.OptionalText(dto.CheckNote, "Ghi chú kiểm kê");
        var now = timeProvider.GetUtcNow().UtcDateTime;

        var (existingCheck, copy) = await InventoryAdjustmentWorkflowHelper.ResolveTargetAsync(dbContext, dto, cancellationToken);
        await InventoryAdjustmentValidator.EnsureCopyEligibleForStatusAsync(dbContext, copy, requestedStatus, cancellationToken);
        await InventoryAdjustmentWorkflowHelper.EnsureNoOpenRequestForCopyAsync(dbContext, copy.Id, copy.CopyBarcode, cancellationToken);

        var check = await InventoryAdjustmentWorkflowHelper.EnsureOrCreateCheckAsync(
            dbContext, existingCheck, copy, dto, requestedStatus, reason, checkNote, actorId, now, cancellationToken);

        var request = new InventoryAdjustmentRequestModel
        {
            Id = Guid.NewGuid(),
            InventoryCheckId = check.Id,
            RequestedStatus = requestedStatus,
            Reason = reason,
            Status = InventoryAdjustmentStatus.PENDING_APPROVAL,
            RequestedBy = actorId,
            RequestedAt = now
        };
        dbContext.InventoryAdjustmentRequests.Add(request);

        try
        {
            await InventoryAdjustmentAuditHelper.SaveWithAuditsAsync(
                dbContext,
                auditLogService,
                [InventoryAdjustmentAuditHelper.BuildRequestAudit(ActionCreate, request.Id, null, request, reason, auditContext)],
                cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException
            { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            throw new ConflictException("Mã kiểm kê hoặc yêu cầu điều chỉnh bị trùng lặp. Vui lòng thử lại.");
        }

        logger.LogInformation(
            "Created inventory adjustment request {RequestId} for copy {CopyBarcode} -> {RequestedStatus}",
            request.Id, copy.CopyBarcode, requestedStatus);

        return await GetByIdAsync(request.Id, cancellationToken);
    }

    public async Task<InventoryAdjustmentRequestDetailResponse> UpdateStatusAsync(
        Guid id,
        UpdateInventoryAdjustmentStatusDto dto,
        bool isAdmin,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var actorId = InventoryAdjustmentValidator.RequireActorId(auditContext);
        var target = dto.Status
            ?? throw new BadRequestException("Trạng thái xử lý (Status) không được để trống.");

        if (target == InventoryAdjustmentStatus.CANCELLED)
        {
            return await CancelAsync(id, new CancelInventoryAdjustmentRequestDto(dto.Reason), isAdmin, auditContext, cancellationToken);
        }

        var request = await dbContext.InventoryAdjustmentRequests
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Yêu cầu điều chỉnh kho với ID '{id}' không tồn tại.");

        InventoryAdjustmentValidator.EnsureAdminCanProcess(request, isAdmin, actorId);
        InventoryAdjustmentValidator.EnsureStatusTransitionAllowed(request.Status, target);

        var before = InventoryAdjustmentAuditHelper.ToAuditSnapshot(request);
        var audits = await InventoryAdjustmentWorkflowHelper.ApplyStatusTransitionAsync(
            dbContext,
            request,
            target,
            dto.Reason,
            actorId,
            timeProvider.GetUtcNow().UtcDateTime,
            before,
            auditContext,
            cancellationToken);

        await InventoryAdjustmentAuditHelper.SaveWithAuditsAsync(dbContext, auditLogService, audits, cancellationToken);

        logger.LogInformation(
            "Updated inventory adjustment request {RequestId} -> {Status} by {ActorId}",
            request.Id, request.Status, actorId);

        return await GetByIdAsync(request.Id, cancellationToken);
    }

    public async Task<InventoryAdjustmentRequestDetailResponse> CancelAsync(
        Guid id,
        CancelInventoryAdjustmentRequestDto? dto,
        bool isAdmin,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var actorId = InventoryAdjustmentValidator.RequireActorId(auditContext);
        var request = await dbContext.InventoryAdjustmentRequests
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Yêu cầu điều chỉnh kho với ID '{id}' không tồn tại.");

        InventoryAdjustmentValidator.EnsureCanCancel(request, isAdmin, actorId);

        var reason = InventoryAdjustmentValidator.RequireText(dto?.Reason, "Lý do hủy yêu cầu");
        var before = InventoryAdjustmentAuditHelper.ToAuditSnapshot(request);
        request.Status = InventoryAdjustmentStatus.CANCELLED;
        request.RejectionReason = reason;

        await InventoryAdjustmentAuditHelper.SaveWithAuditsAsync(
            dbContext,
            auditLogService,
            [InventoryAdjustmentAuditHelper.BuildRequestAudit(ActionCancel, request.Id, before, request, reason, auditContext)],
            cancellationToken);

        logger.LogInformation("Cancelled inventory adjustment request {RequestId} by {ActorId}", request.Id, actorId);
        return await GetByIdAsync(request.Id, cancellationToken);
    }

    public async Task DeleteByRetentionAsync(
        Guid id,
        bool isAdmin,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var actorId = InventoryAdjustmentValidator.RequireActorId(auditContext);
        if (!isAdmin)
        {
            throw new ForbiddenException("Chỉ ADMIN mới có quyền dọn dữ liệu yêu cầu điều chỉnh quá hạn retention.");
        }

        var request = await dbContext.InventoryAdjustmentRequests
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Yêu cầu điều chỉnh kho với ID '{id}' không tồn tại.");

        var retentionDays = await InventoryAdjustmentQueryHelper.GetRetentionDaysAsync(dbContext, cancellationToken);
        InventoryAdjustmentValidator.EnsureRetentionSatisfied(request, retentionDays, timeProvider.GetUtcNow().UtcDateTime);

        var before = InventoryAdjustmentAuditHelper.ToAuditSnapshot(request);
        dbContext.InventoryAdjustmentRequests.Remove(request);

        await InventoryAdjustmentAuditHelper.SaveWithAuditsAsync(
            dbContext,
            auditLogService,
            [
                InventoryAdjustmentAuditHelper.BuildRequestAudit(
                    ActionRetentionDelete,
                    id,
                    before,
                    null,
                    $"Xóa bản ghi yêu cầu điều chỉnh đã hết thời hạn lưu trữ ({retentionDays} ngày).",
                    auditContext)
            ],
            cancellationToken);

        logger.LogInformation(
            "Deleted expired inventory adjustment request {RequestId} under retention policy ({Days} days) by {ActorId}",
            id, retentionDays, actorId);
    }
}
