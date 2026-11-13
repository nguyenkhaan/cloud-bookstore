using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Helpers;

/// <summary>
/// Validates inventory adjustment requests, state machine transitions, permissions, and retention rules.
/// </summary>
public static class InventoryAdjustmentValidator
{
    public const int MaxReasonLength = 500;
    public const int MaxCheckCodeLength = 20;

    private static readonly IReadOnlyDictionary<InventoryAdjustmentStatus, HashSet<InventoryAdjustmentStatus>> AllowedTransitions =
        new Dictionary<InventoryAdjustmentStatus, HashSet<InventoryAdjustmentStatus>>
        {
            [InventoryAdjustmentStatus.PENDING_APPROVAL] =
            [
                InventoryAdjustmentStatus.APPROVED,
                InventoryAdjustmentStatus.APPLIED,
                InventoryAdjustmentStatus.REJECTED,
                InventoryAdjustmentStatus.CANCELLED
            ],
            [InventoryAdjustmentStatus.APPROVED] =
            [
                InventoryAdjustmentStatus.APPLIED,
                InventoryAdjustmentStatus.CANCELLED
            ],
            [InventoryAdjustmentStatus.APPLIED] = [],
            [InventoryAdjustmentStatus.REJECTED] = [],
            [InventoryAdjustmentStatus.CANCELLED] = []
        };

    public static Guid RequireActorId(AuditLogContext? auditContext)
    {
        if (auditContext?.ActorId is not { } actorId || actorId == Guid.Empty)
        {
            throw new UnauthorizedException("Không xác định được tài khoản người thực hiện.");
        }

        return actorId;
    }

    public static string RequireText(string? value, string fieldLabel, int maxLength = MaxReasonLength)
    {
        var trimmed = string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        if (trimmed is null)
        {
            throw new BadRequestException($"{fieldLabel} không được để trống.");
        }

        if (trimmed.Length > maxLength)
        {
            throw new BadRequestException($"{fieldLabel} không được vượt quá {maxLength} ký tự.");
        }

        return trimmed;
    }

    public static string? OptionalText(string? value, string fieldLabel, int maxLength = MaxReasonLength)
    {
        var trimmed = string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        if (trimmed is not null && trimmed.Length > maxLength)
        {
            throw new BadRequestException($"{fieldLabel} không được vượt quá {maxLength} ký tự.");
        }

        return trimmed;
    }

    public static string ResolveCheckCode(string? checkCode, DateTime utcNow)
    {
        if (string.IsNullOrWhiteSpace(checkCode))
        {
            return $"ADJ-{utcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
        }

        var normalized = checkCode.Trim().ToUpperInvariant();
        if (normalized.Length > MaxCheckCodeLength)
        {
            throw new BadRequestException($"Mã kiểm kê (CheckCode) không được vượt quá {MaxCheckCodeLength} ký tự.");
        }

        return normalized;
    }

    public static InventoryVarianceType InferVarianceType(
        InventoryVarianceType? provided,
        BookCopyStatus currentStatus,
        BookCopyStatus requestedStatus)
    {
        if (provided.HasValue)
        {
            if (!Enum.IsDefined(provided.Value))
            {
                throw new BadRequestException("Loại chênh lệch (VarianceType) không hợp lệ.");
            }

            return provided.Value;
        }

        return requestedStatus switch
        {
            BookCopyStatus.LOST => InventoryVarianceType.MISSING,
            BookCopyStatus.DAMAGED => InventoryVarianceType.DAMAGED,
            _ when currentStatus == requestedStatus => InventoryVarianceType.NONE,
            _ => InventoryVarianceType.UNEXPECTED_STATUS
        };
    }

    public static void EnsureTargetStatusAllowedForRequest(BookCopyStatus currentStatus, BookCopyStatus requestedStatus)
    {
        if (!Enum.IsDefined(requestedStatus))
        {
            throw new BadRequestException("Trạng thái đề xuất (RequestedStatus) không hợp lệ.");
        }

        // Requesting a correction from DAMAGED/LOST back to AVAILABLE is allowed at submission time;
        // admin approval enforces the final book-copy transition rules upon apply.
        BookCopyValidator.EnsureStatusTransitionAllowed(currentStatus, requestedStatus, isAdmin: true);
    }

    public static async Task EnsureCopyEligibleForStatusAsync(
        AppDbContext dbContext,
        BookCopyModel copy,
        BookCopyStatus targetStatus,
        CancellationToken cancellationToken = default)
    {
        EnsureTargetStatusAllowedForRequest(copy.Status, targetStatus);
        await BookCopyValidator.EnsureNoActiveReferenceAsync(dbContext, copy.Id, cancellationToken);

        if (targetStatus == BookCopyStatus.AVAILABLE)
        {
            var editionExists = await dbContext.Editions.AnyAsync(e => e.Id == copy.EditionId, cancellationToken);
            BookCopyValidator.EnsureAvailableRequirements(copy, editionExists);
        }
    }

    public static void EnsureStatusTransitionAllowed(
        InventoryAdjustmentStatus current,
        InventoryAdjustmentStatus target)
    {
        if (!Enum.IsDefined(target))
        {
            throw new BadRequestException("Trạng thái xử lý không hợp lệ.");
        }

        if (current == target)
        {
            throw new BadRequestException($"Yêu cầu đã ở trạng thái {target}.");
        }

        if (!AllowedTransitions.TryGetValue(current, out var allowed) || !allowed.Contains(target))
        {
            throw new ConflictException($"Không thể chuyển yêu cầu từ trạng thái {current} sang {target}.");
        }
    }

    public static void EnsureAdminCanProcess(
        InventoryAdjustmentRequestModel request,
        bool isAdmin,
        Guid actorId)
    {
        if (!isAdmin)
        {
            throw new ForbiddenException("Chỉ ADMIN mới có quyền duyệt, từ chối hoặc áp dụng yêu cầu điều chỉnh kho.");
        }

        if (request.RequestedBy == actorId)
        {
            throw new ForbiddenException("Người tạo yêu cầu không được tự duyệt hoặc tự xử lý yêu cầu của chính mình.");
        }
    }

    public static void EnsureCanCancel(
        InventoryAdjustmentRequestModel request,
        bool isAdmin,
        Guid actorId)
    {
        EnsureStatusTransitionAllowed(request.Status, InventoryAdjustmentStatus.CANCELLED);

        if (!isAdmin && request.RequestedBy != actorId)
        {
            throw new ForbiddenException("Bạn chỉ có thể hủy yêu cầu do chính mình tạo.");
        }
    }

    public static DateTime ComputeRetainUntil(InventoryAdjustmentRequestModel request, int retentionDays)
    {
        var anchor = request.AppliedAt ?? request.ApprovedAt ?? request.RequestedAt;
        return anchor.AddDays(Math.Max(1, retentionDays));
    }

    public static bool CanDeleteByRetention(
        InventoryAdjustmentRequestModel request,
        int retentionDays,
        DateTime utcNow)
    {
        if (request.Status is InventoryAdjustmentStatus.PENDING_APPROVAL or InventoryAdjustmentStatus.APPROVED)
        {
            return false;
        }

        return utcNow >= ComputeRetainUntil(request, retentionDays);
    }

    public static void EnsureRetentionSatisfied(
        InventoryAdjustmentRequestModel request,
        int retentionDays,
        DateTime utcNow)
    {
        if (request.Status is InventoryAdjustmentStatus.PENDING_APPROVAL or InventoryAdjustmentStatus.APPROVED)
        {
            throw new ConflictException("Không thể xóa yêu cầu đang chờ duyệt hoặc chưa áp dụng.");
        }

        var retainUntil = ComputeRetainUntil(request, retentionDays);
        if (utcNow < retainUntil)
        {
            throw new ConflictException(
                $"Yêu cầu đang trong thời gian lưu trữ bắt buộc (retention) đến {retainUntil:dd/MM/yyyy} UTC nên không thể xóa.");
        }
    }
}
