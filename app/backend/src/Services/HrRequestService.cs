using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.HrRequestDto;
using backend.src.Dto.UploadDto;
using backend.src.Exceptions;
using backend.src.Infrastructure;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

public sealed class HrRequestService(AppDbContext dbContext, UploadIntentService uploadIntentService, ICloudinaryService cloudinaryService)
{
    public async Task<HrRequestListDto> ListAsync(Guid actorId, HrRequestQuery query, bool isAdmin, CancellationToken cancellationToken = default)
    {
        var mineQuery = Filter(dbContext.HrRequests.AsNoTracking().Where(request => request.RequesterId == actorId), query);
        var mine = await mineQuery.OrderByDescending(request => request.CreatedAt).Select(request => request.Id).ToListAsync(cancellationToken);
        var pendingQuery = isAdmin
            ? Filter(dbContext.HrRequests.AsNoTracking().Where(request => request.Status == HrRequestStatus.PENDING), query)
            : dbContext.HrRequests.Where(_ => false).AsNoTracking();
        var pending = await pendingQuery.OrderByDescending(request => request.CreatedAt).Select(request => request.Id).ToListAsync(cancellationToken);
        var myDtos = await MapAsync(mine, actorId, cancellationToken);
        var pendingDtos = isAdmin ? await MapAsync(pending, actorId, cancellationToken) : [];
        return new HrRequestListDto(myDtos, pendingDtos, myDtos.Count,
            await dbContext.HrRequests.CountAsync(request => request.Status == HrRequestStatus.PENDING, cancellationToken));
    }

    public async Task<HrRequestOptionsDto> GetOptionsAsync(Guid actorId, CancellationToken cancellationToken = default)
    {
        var employees = await dbContext.Employees.AsNoTracking().Where(employee => employee.Status == EmployeeStatus.ACTIVE && employee.Id != actorId)
            .OrderBy(employee => employee.FullName).Select(employee => new HrRequestOptionDto(employee.Id.ToString(),
                (employee.EmployeeCode ?? "") + " · " + employee.FullName)).ToListAsync(cancellationToken);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var workRecords = await dbContext.EmployeeWorkRecords.AsNoTracking().Where(record => record.EmployeeId == actorId && record.WorkDate <= today)
            .OrderByDescending(record => record.WorkDate).ThenByDescending(record => record.ShiftNo).Take(60)
            .Select(record => new HrRequestOptionDto(record.Id.ToString(), record.WorkDate.ToString() + " · Ca " + record.ShiftNo,
                record.WorkDate, record.ShiftNo)).ToListAsync(cancellationToken);
        return new HrRequestOptionsDto(employees, workRecords);
    }

    public async Task<HrRequestDto> CreateAsync(Guid actorId, CreateHrRequestRequest request, AuditLogContext context, CancellationToken cancellationToken = default)
    {
        if (!Enum.IsDefined(request.Type)) throw new BadRequestException("Request type is invalid.");
        if (string.IsNullOrWhiteSpace(request.Reason)) throw new BadRequestException("Reason is required.");
        if (request.ShiftNo < 1 || request.TargetShiftNo is < 1) throw new BadRequestException("Shift number is invalid.");
        if (request.Type == HrRequestType.SHIFT_SWAP && request.TargetShiftNo is null)
            throw new BadRequestException("Target shift is required for a shift swap.");
        if (request.Type != HrRequestType.ATTENDANCE_EXPLANATION && request.ReplacementEmployeeId is { } replacementId
            && !await dbContext.Employees.AnyAsync(employee => employee.Id == replacementId && employee.Status == EmployeeStatus.ACTIVE, cancellationToken))
            throw new BadRequestException("Replacement employee is unavailable.");
        if (request.Type == HrRequestType.ATTENDANCE_EXPLANATION && (request.CorrectCheckInAt is null && request.CorrectCheckOutAt is null))
            throw new BadRequestException("Corrected check-in or check-out time is required.");
        if (request.CorrectCheckInAt > request.CorrectCheckOutAt && request.CorrectCheckOutAt.HasValue)
            throw new BadRequestException("Check-out must be later than check-in.");

        string? proofPublicId = null;
        if (request.ProofUpload is not null)
            proofPublicId = await uploadIntentService.ConsumeAsync(actorId, UploadOwnerType.HR_REQUEST_PROOF, request.ProofUpload, cancellationToken);
        var now = DateTime.UtcNow;
        var code = $"HR-{now:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
        var model = new HrRequestModel
        {
            RequestCode = code, Type = request.Type, RequesterId = actorId, ApplyDate = request.ApplyDate,
            ShiftNo = request.ShiftNo, TargetShiftNo = request.TargetShiftNo,
            ReplacementEmployeeId = request.ReplacementEmployeeId, CorrectCheckInAt = request.CorrectCheckInAt,
            CorrectCheckOutAt = request.CorrectCheckOutAt, ProofPublicId = proofPublicId,
            Reason = request.Reason.Trim(), Status = HrRequestStatus.PENDING, CreatedAt = now
        };
        dbContext.HrRequests.Add(model);
        dbContext.HrRequestHistories.Add(new HrRequestHistoryModel { RequestId = model.Id, ActorId = actorId, Action = "SUBMITTED", OccurredAt = now });
        AddAudit("CREATE_HR_REQUEST", model.Id, null, new { model.RequestCode, model.Type, model.ApplyDate }, model.Reason, context);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await MapAsync([model.Id], actorId, cancellationToken)).Single();
    }

    public async Task<HrRequestDto> CancelAsync(Guid actorId, Guid requestId, AuditLogContext context, CancellationToken cancellationToken = default)
    {
        var request = await dbContext.HrRequests.SingleOrDefaultAsync(item => item.Id == requestId, cancellationToken)
            ?? throw new NotFoundException("HR request was not found.");
        if (request.RequesterId != actorId) throw new ForbiddenException("Only the requester can cancel this request.");
        if (request.Status != HrRequestStatus.PENDING) throw new ConflictException("Only pending requests can be cancelled.");
        var now = DateTime.UtcNow;
        request.Status = HrRequestStatus.CANCELLED;
        dbContext.HrRequestHistories.Add(new HrRequestHistoryModel { RequestId = request.Id, ActorId = actorId, Action = "CANCELLED", OccurredAt = now });
        AddAudit("CANCEL_HR_REQUEST", request.Id, HrRequestStatus.PENDING, HrRequestStatus.CANCELLED, "Requester cancelled the request.", context);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await MapAsync([request.Id], actorId, cancellationToken)).Single();
    }

    public async Task<HrRequestDto> ReviewAsync(Guid actorId, Guid requestId, HrRequestReviewRequest review, AuditLogContext context, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(review.Note)) throw new BadRequestException("Review note is required.");
        if (review.Status is not (HrRequestStatus.APPROVED or HrRequestStatus.REJECTED)) throw new BadRequestException("Review status is invalid.");
        var request = await dbContext.HrRequests.SingleOrDefaultAsync(item => item.Id == requestId, cancellationToken)
            ?? throw new NotFoundException("HR request was not found.");
        if (request.RequesterId == actorId) throw new ForbiddenException("Administrators cannot review their own requests.");
        if (request.Status != HrRequestStatus.PENDING) throw new ConflictException("Only pending requests can be reviewed.");

        var now = DateTime.UtcNow;
        if (review.Status == HrRequestStatus.APPROVED && request.Type == HrRequestType.ATTENDANCE_EXPLANATION)
        {
            var workRecord = await dbContext.EmployeeWorkRecords.SingleOrDefaultAsync(record => record.EmployeeId == request.RequesterId
                && record.WorkDate == request.ApplyDate && record.ShiftNo == request.ShiftNo, cancellationToken)
                ?? throw new ConflictException("The work record for this attendance request no longer exists.");
            if (request.CorrectCheckInAt.HasValue) workRecord.CheckInAt = request.CorrectCheckInAt.Value;
            if (request.CorrectCheckOutAt.HasValue) workRecord.CheckOutAt = request.CorrectCheckOutAt.Value;
            if (workRecord.CheckInAt.HasValue && workRecord.CheckOutAt.HasValue)
            {
                workRecord.WorkedMinutes = Math.Max(0, (int)(workRecord.CheckOutAt.Value - workRecord.CheckInAt.Value).TotalMinutes);
                workRecord.OvertimeMinutes = Math.Max(0, workRecord.WorkedMinutes - 300);
            }
            workRecord.AttendanceStatus = AttendanceStatus.PRESENT;
            workRecord.ApprovedBy = actorId;
            workRecord.ApprovedAt = now;
            workRecord.AdjustmentReason = review.Note.Trim();
            workRecord.UpdatedAt = now;
            AddAudit("APPROVE_ATTENDANCE_ADJUSTMENT", workRecord.Id, null,
                new { workRecord.CheckInAt, workRecord.CheckOutAt, workRecord.WorkedMinutes, workRecord.OvertimeMinutes, workRecord.AttendanceStatus }, review.Note.Trim(), context);
        }
        request.Status = review.Status;
        request.ReviewedBy = actorId;
        request.ReviewedAt = now;
        request.ReviewNote = review.Note.Trim();
        dbContext.HrRequestHistories.Add(new HrRequestHistoryModel { RequestId = request.Id, ActorId = actorId,
            Action = review.Status.ToString(), Note = review.Note.Trim(), OccurredAt = now });
        AddAudit("REVIEW_HR_REQUEST", request.Id, HrRequestStatus.PENDING, review.Status, review.Note, context);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await MapAsync([request.Id], actorId, cancellationToken)).Single();
    }

    private static IQueryable<HrRequestModel> Filter(IQueryable<HrRequestModel> query, HrRequestQuery filter)
    {
        if (filter.Status.HasValue) query = query.Where(request => request.Status == filter.Status.Value);
        if (!string.IsNullOrWhiteSpace(filter.Month) && DateOnly.TryParse(filter.Month + "-01", out var monthStart))
        {
            var monthEnd = monthStart.AddMonths(1);
            query = query.Where(request => request.ApplyDate >= monthStart && request.ApplyDate < monthEnd);
        }
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim().ToLowerInvariant();
            query = query.Where(request => request.RequestCode.ToLower().Contains(term) || request.Reason.ToLower().Contains(term));
        }
        return query;
    }

    private async Task<IReadOnlyList<HrRequestDto>> MapAsync(IReadOnlyList<Guid> ids, Guid actorId, CancellationToken cancellationToken)
    {
        if (ids.Count == 0) return [];
        var requests = await dbContext.HrRequests.AsNoTracking().Where(request => ids.Contains(request.Id)).ToListAsync(cancellationToken);
        var employeeIds = requests.SelectMany(request => new Guid?[] { request.RequesterId, request.ReplacementEmployeeId, request.ReviewedBy })
            .Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToArray();
        var employees = await dbContext.Employees.AsNoTracking().Where(employee => employeeIds.Contains(employee.Id))
            .ToDictionaryAsync(employee => employee.Id, cancellationToken);
        var histories = await dbContext.HrRequestHistories.AsNoTracking().Where(history => ids.Contains(history.RequestId))
            .OrderBy(history => history.OccurredAt).ToListAsync(cancellationToken);
        var proofIds = requests.Where(request => request.ProofPublicId is not null).Select(request => request.Id).ToHashSet();
        var results = new List<HrRequestDto>(requests.Count);
        foreach (var request in requests)
        {
            var requester = employees[request.RequesterId];
            var history = histories.Where(item => item.RequestId == request.Id).Select(item => new HrRequestHistoryDto(
                item.Id, item.Action, item.Note, item.OccurredAt, employees.GetValueOrDefault(item.ActorId)?.FullName ?? "Nhân viên")).ToArray();
            var replacementName = request.ReplacementEmployeeId is { } replacementId && employees.TryGetValue(replacementId, out var replacement)
                ? replacement.FullName : "Không áp dụng";
            var proofUrl = proofIds.Contains(request.Id) ? cloudinaryService.BuildImageUrl(request.ProofPublicId!, UploadOwnerType.HR_REQUEST_PROOF) : null;
            results.Add(new HrRequestDto(request.Id, request.RequestCode, request.Type, request.RequesterId,
                requester.EmployeeCode ?? "", requester.FullName, request.ApplyDate, request.ShiftNo, request.TargetShiftNo,
                request.ReplacementEmployeeId, replacementName, request.CorrectCheckInAt, request.CorrectCheckOutAt,
                proofUrl, request.Reason, request.Status, request.RequesterId == actorId, request.RequesterId == actorId,
                request.ReviewNote, request.ReviewedBy is { } reviewerId && employees.TryGetValue(reviewerId, out var reviewer) ? reviewer.FullName : null,
                request.ReviewedAt, history));
        }
        return results.OrderByDescending(item => requests.Single(request => request.Id == item.Id).CreatedAt).ToArray();
    }

    private void AddAudit(string action, Guid entityId, object? before, object? after, string reason, AuditLogContext context)
    {
        dbContext.AuditLogs.Add(new AuditLogModel { ActorId = context.ActorId, IpAddress = context.IpAddress,
            UserAgent = context.UserAgent, CorrelationId = context.CorrelationId, Action = action,
            EntityType = "hr_request", EntityId = entityId,
            BeforeData = before is null ? null : System.Text.Json.JsonSerializer.Serialize(before),
            AfterData = after is null ? null : System.Text.Json.JsonSerializer.Serialize(after), Reason = reason, OccurredAt = DateTime.UtcNow });
    }
}
