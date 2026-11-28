using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.PayrollDto;
using backend.src.Exceptions;
using backend.src.Helpers;
using backend.src.Infrastructure;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

public sealed class HrPayslipService(AppDbContext dbContext, UploadIntentService uploadIntentService, ICloudinaryService cloudinaryService)
{
    private static readonly string[] CategoryLabels = ["Lương cơ bản", "Tăng ca", "Thưởng", "Phụ cấp", "Khấu trừ"];

    /// <summary>Payslip of the authenticated actor. The employee is never taken from client input.</summary>
    public Task<PayslipDetailDto> GetMyPayslipAsync(Guid actorId, string? periodKey, CancellationToken cancellationToken = default)
        => GetPayslipAsync(actorId, periodKey, actorId, cancellationToken);

    public async Task<PayslipDetailDto> GetPayslipAsync(Guid employeeId, string? periodKey, Guid actorId, CancellationToken cancellationToken = default)
    {
        var requestedKey = string.IsNullOrWhiteSpace(periodKey) ? null : PayrollHelper.ParsePeriodKey(periodKey).Key;
        var employee = await dbContext.Employees.AsNoTracking().Include(item => item.Role)
            .SingleOrDefaultAsync(item => item.Id == employeeId, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy nhân viên.");

        // Payslips are visible only after the period is approved and locked.
        var rows = await (from entry in dbContext.PayrollEntries.AsNoTracking()
                          join period in dbContext.PayrollPeriods.AsNoTracking() on entry.PayrollPeriodId equals period.Id
                          where entry.EmployeeId == employeeId && period.Status != PayrollPeriodStatus.DRAFT
                          orderby period.Year descending, period.Month descending
                          select new { Entry = entry, Period = period }).ToListAsync(cancellationToken);
        var options = rows.Select(row => new PayslipPeriodOptionDto(row.Period.PeriodKey, row.Entry.PayoutStatus == WorkRecordPaymentStatus.PAID)).ToArray();
        var selected = requestedKey is null ? rows.FirstOrDefault() : rows.FirstOrDefault(row => row.Period.PeriodKey == requestedKey);
        if (selected is null) return EmptyPayslip(employee, requestedKey ?? string.Empty, options);

        var current = selected.Entry;
        var currentPeriod = selected.Period;
        var items = await dbContext.PayrollEntryItems.AsNoTracking().Where(item => item.PayrollEntryId == current.Id).ToListAsync(cancellationToken);
        var (_, _, fromVn, toVn) = VietnamTimeHelper.GetMonthRangeUtc(currentPeriod.Year, currentPeriod.Month);
        var records = await dbContext.EmployeeWorkRecords.AsNoTracking()
            .Where(record => record.EmployeeId == employeeId && record.WorkDate >= fromVn && record.WorkDate <= toVn)
            .OrderBy(record => record.WorkDate).ThenBy(record => record.ShiftNo).ToListAsync(cancellationToken);
        var batch = current.PayoutBatchId is { } batchId
            ? await dbContext.PayrollPayoutBatches.AsNoTracking().SingleOrDefaultAsync(item => item.Id == batchId, cancellationToken) : null;
        var approverName = currentPeriod.ApprovedBy is { } approverId
            ? await dbContext.Employees.AsNoTracking().Where(item => item.Id == approverId).Select(item => item.FullName).SingleOrDefaultAsync(cancellationToken) ?? string.Empty
            : string.Empty;
        var disputes = await LoadDisputesAsync(new[] { current.Id }, actorId, cancellationToken);

        var payslipCode = PayrollHelper.BuildPayslipCode(currentPeriod.PayrollCode, employee.EmployeeCode, employee.Id);
        var rate = current.HourlyRate;
        var attendance = records.Select(record => new PayslipAttendanceDayDto(record.WorkDate, record.ShiftNo, record.CheckInAt, record.CheckOutAt,
            PayrollHelper.ToHours(record.WorkedMinutes), PayrollHelper.ToHours(record.OvertimeMinutes))).ToArray();
        var overtime = records.Where(record => record.OvertimeMinutes > 0).Select(record =>
        {
            var hours = PayrollHelper.ToHours(record.OvertimeMinutes);
            return new PayslipOvertimeEntryDto(record.WorkDate, record.CheckOutAt?.AddMinutes(-record.OvertimeMinutes), record.CheckOutAt, hours,
                PayrollHelper.RoundMoney(hours * rate * PayrollHelper.OvertimeMultiplier));
        }).ToArray();
        var advances = items.Where(item => item.Category == PayrollItemCategory.ADVANCE).OrderBy(item => item.CreatedAt)
            .Select(item => new PayslipAdvanceVoucherDto(item.VoucherCode ?? string.Empty, item.Label, item.Amount, item.CreatedAt)).ToArray();
        var bonusNote = items.Where(item => item.Category == PayrollItemCategory.BONUS).OrderBy(item => item.CreatedAt).Select(item => item.Label).FirstOrDefault() ?? string.Empty;
        var allowanceNote = items.Where(item => item.Category == PayrollItemCategory.ALLOWANCE).OrderBy(item => item.CreatedAt).Select(item => item.Label).FirstOrDefault() ?? string.Empty;

        return new PayslipDetailDto(true, current.Id, payslipCode, currentPeriod.PeriodKey, PayrollHelper.BuildRangeLabel(currentPeriod.Year, currentPeriod.Month),
            currentPeriod.PayrollCode, currentPeriod.AttendanceSourceCode, currentPeriod.Status, current.PayoutStatus == WorkRecordPaymentStatus.PAID, current.PaidAt,
            approverName, currentPeriod.ApprovedAt, employee.Id, employee.EmployeeCode ?? string.Empty, employee.FullName, PayrollHelper.RoleLabel(employee),
            employee.BranchName ?? string.Empty, PayrollHelper.BankAccountLabel(employee), batch?.TransactionRef, current.StandardHours, current.HourlyRate,
            current.BaseSalary, current.OvertimeHours, current.OvertimeAmount, current.Bonus, bonusNote, current.Allowance, allowanceNote,
            current.MandatoryContribution, current.ContributionNote ?? string.Empty, current.Tax, current.Deduction,
            current.BaseSalary + current.OvertimeAmount + current.Bonus + current.Allowance, current.Deduction + current.MandatoryContribution + current.Tax,
            current.NetPay, current.ZaloStatus, current.ZaloSentAt, PayrollHelper.HasZaloContact(employee), options, attendance, overtime, advances, disputes);
    }

    public async Task<PayslipDisputeDto> CreateDisputeAsync(Guid actorId, Guid entryId, CreatePayslipDisputeRequest request, AuditLogContext context, CancellationToken cancellationToken = default)
    {
        var content = request.Content?.Trim();
        if (string.IsNullOrEmpty(content)) throw new BadRequestException("Vui lòng nhập nội dung đối chiếu.");
        if (!Enum.IsDefined(request.Category)) throw new BadRequestException("Hạng mục đối chiếu không hợp lệ.");

        var entry = await dbContext.PayrollEntries.AsNoTracking().SingleOrDefaultAsync(item => item.Id == entryId, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy phiếu lương.");
        if (entry.EmployeeId != actorId) throw new ForbiddenException("Bạn chỉ có thể đối chiếu phiếu lương của chính mình.");
        var period = await dbContext.PayrollPeriods.AsNoTracking().SingleAsync(item => item.Id == entry.PayrollPeriodId, cancellationToken);
        if (period.Status == PayrollPeriodStatus.DRAFT) throw new ConflictException("Phiếu lương chưa được công bố.");

        string? proofPublicId = null;
        if (request.ProofUpload is not null)
            proofPublicId = await uploadIntentService.ConsumeAsync(actorId, UploadOwnerType.PAYSLIP_DISPUTE_PROOF, request.ProofUpload, cancellationToken);

        var now = DateTime.UtcNow;
        var dispute = new PayslipDisputeModel
        {
            DisputeCode = await PayrollHelper.NextMonthlyCodeAsync(dbContext.PayslipDisputes.AsNoTracking().Select(item => item.DisputeCode), "DC", now, cancellationToken), PayrollEntryId = entry.Id, EmployeeId = actorId,
            Category = request.Category, Content = content, ProofPublicId = proofPublicId,
            Status = PayslipDisputeStatus.PENDING_RESPONSE, CreatedAt = now
        };
        dbContext.PayslipDisputes.Add(dispute);
        PayrollHelper.AddAudit(dbContext, "CREATE_PAYSLIP_DISPUTE", PayrollHelper.DisputeEntityType, dispute.Id, null,
            new { dispute.DisputeCode, period.PeriodKey, dispute.Category }, content, context);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await LoadDisputesAsync(new[] { entry.Id }, actorId, cancellationToken)).Single(item => item.Id == dispute.Id);
    }

    public async Task<PayslipDisputeDto> RespondDisputeAsync(Guid actorId, Guid disputeId, RespondPayslipDisputeRequest request, AuditLogContext context, CancellationToken cancellationToken = default)
    {
        var response = request.AdminResponse?.Trim();
        if (string.IsNullOrEmpty(response)) throw new BadRequestException("Vui lòng nhập nội dung phản hồi.");
        if (request.Status is not (PayslipDisputeStatus.EXPLAINED or PayslipDisputeStatus.APPROVED_NEXT_PERIOD_ADJUSTMENT))
            throw new BadRequestException("Trạng thái phản hồi không hợp lệ.");

        var dispute = await dbContext.PayslipDisputes.SingleOrDefaultAsync(item => item.Id == disputeId, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy yêu cầu đối chiếu.");
        // Maker-checker: nobody resolves a dispute they raised themselves.
        if (dispute.EmployeeId == actorId) throw new ForbiddenException("Bạn không thể tự phản hồi đối chiếu của chính mình.");
        if (dispute.Status != PayslipDisputeStatus.PENDING_RESPONSE) throw new ConflictException("Yêu cầu đối chiếu đã được phản hồi.");

        var entry = await dbContext.PayrollEntries.AsNoTracking().SingleAsync(item => item.Id == dispute.PayrollEntryId, cancellationToken);
        var period = await dbContext.PayrollPeriods.AsNoTracking().SingleAsync(item => item.Id == entry.PayrollPeriodId, cancellationToken);
        var now = DateTime.UtcNow;
        PayrollAdjustmentModel? adjustment = null;
        if (request.Status == PayslipDisputeStatus.APPROVED_NEXT_PERIOD_ADJUSTMENT)
        {
            if (request.AdjustmentAmount is not > 0) throw new BadRequestException("Vui lòng nhập số tiền bù trừ kỳ sau.");
            var targetKey = PayrollHelper.NextPeriodKey(period.Year, period.Month);
            var targetStatus = await dbContext.PayrollPeriods.AsNoTracking().Where(item => item.PeriodKey == targetKey)
                .Select(item => (PayrollPeriodStatus?)item.Status).SingleOrDefaultAsync(cancellationToken);
            if (targetStatus is not null and not PayrollPeriodStatus.DRAFT)
                throw new ConflictException("Kỳ lương kế tiếp đã được duyệt, không thể bù trừ.");
            adjustment = new PayrollAdjustmentModel
            {
                AdjustmentCode = await PayrollHelper.NextMonthlyCodeAsync(dbContext.PayrollAdjustments.AsNoTracking().Select(item => item.AdjustmentCode), "ADJ", now, cancellationToken), EmployeeId = dispute.EmployeeId,
                SourcePeriodKey = period.PeriodKey, SourcePayrollCode = period.PayrollCode, SourceVoucherRef = dispute.DisputeCode,
                TargetPeriodKey = targetKey, Category = CategoryLabels[(int)dispute.Category],
                AdjustmentType = request.AdjustmentType ?? PayrollAdjustmentType.ADD_NEXT_PERIOD, Amount = request.AdjustmentAmount.Value,
                ReferenceCode = dispute.DisputeCode, Reason = response, Status = PayrollAdjustmentStatus.APPROVED, CreatedBy = actorId, CreatedAt = now
            };
            dbContext.PayrollAdjustments.Add(adjustment);
            PayrollHelper.AddAudit(dbContext, "CREATE_PAYROLL_ADJUSTMENT", PayrollHelper.AdjustmentEntityType, adjustment.Id, null,
                new { adjustment.AdjustmentCode, adjustment.TargetPeriodKey, adjustment.AdjustmentType, adjustment.Amount }, $"Từ đối chiếu {dispute.DisputeCode}", context);
        }

        dispute.Status = request.Status;
        dispute.AdminResponse = response;
        dispute.CalculationNote = request.CalculationNote?.Trim();
        dispute.AdjustmentNote = request.AdjustmentNote?.Trim();
        dispute.RespondedBy = actorId;
        dispute.RespondedAt = now;
        dispute.LinkedAdjustmentId = adjustment?.Id;
        PayrollHelper.AddAudit(dbContext, "RESPOND_PAYSLIP_DISPUTE", PayrollHelper.DisputeEntityType, dispute.Id,
            new { Status = PayslipDisputeStatus.PENDING_RESPONSE }, new { dispute.Status, AdjustmentCode = adjustment?.AdjustmentCode }, response, context);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await LoadDisputesAsync(new[] { entry.Id }, actorId, cancellationToken)).Single(item => item.Id == dispute.Id);
    }

    public async Task<ZaloSendResultDto> ResendZaloAsync(Guid actorId, Guid entryId, AuditLogContext context, CancellationToken cancellationToken = default)
    {
        var entry = await dbContext.PayrollEntries.SingleOrDefaultAsync(item => item.Id == entryId, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy phiếu lương.");
        var period = await dbContext.PayrollPeriods.SingleAsync(item => item.Id == entry.PayrollPeriodId, cancellationToken);
        if (period.Status == PayrollPeriodStatus.DRAFT) throw new ConflictException("Chỉ được gửi phiếu lương sau khi Admin duyệt bảng lương.");
        var employee = await dbContext.Employees.AsNoTracking().SingleAsync(item => item.Id == entry.EmployeeId, cancellationToken);

        var result = PayrollHelper.QueueZaloPayslip(dbContext, entry, period, employee, DateTime.UtcNow);
        PayrollHelper.AddAudit(dbContext, "RESEND_PAYSLIP_ZALO", PayrollHelper.PeriodEntityType, period.Id, null,
            new { entry.Id, result.Status }, $"Gửi lại phiếu lương · {employee.FullName}", context);
        await dbContext.SaveChangesAsync(cancellationToken);
        return result;
    }

    private async Task<IReadOnlyList<PayslipDisputeDto>> LoadDisputesAsync(IReadOnlyCollection<Guid> entryIds, Guid actorId, CancellationToken cancellationToken)
    {
        var disputes = await dbContext.PayslipDisputes.AsNoTracking().Where(item => entryIds.Contains(item.PayrollEntryId))
            .OrderByDescending(item => item.CreatedAt).ToListAsync(cancellationToken);
        if (disputes.Count == 0) return [];

        var entries = await dbContext.PayrollEntries.AsNoTracking().Where(item => entryIds.Contains(item.Id)).ToListAsync(cancellationToken);
        var periodIds = entries.Select(item => item.PayrollPeriodId).Distinct().ToArray();
        var periods = await dbContext.PayrollPeriods.AsNoTracking().Where(item => periodIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, cancellationToken);
        var personIds = disputes.SelectMany(item => new Guid?[] { item.EmployeeId, item.RespondedBy }).Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToArray();
        var people = await dbContext.Employees.AsNoTracking().Where(item => personIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, cancellationToken);
        var adjustmentIds = disputes.Where(item => item.LinkedAdjustmentId.HasValue).Select(item => item.LinkedAdjustmentId!.Value).ToArray();
        var adjustmentCodes = await dbContext.PayrollAdjustments.AsNoTracking().Where(item => adjustmentIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, item => item.AdjustmentCode, cancellationToken);

        return disputes.Select(dispute =>
        {
            var entry = entries.Single(item => item.Id == dispute.PayrollEntryId);
            var period = periods[entry.PayrollPeriodId];
            people.TryGetValue(dispute.EmployeeId, out var owner);
            var payslipCode = PayrollHelper.BuildPayslipCode(period.PayrollCode, owner?.EmployeeCode, dispute.EmployeeId);
            return new PayslipDisputeDto(dispute.Id, dispute.DisputeCode, payslipCode, dispute.EmployeeId, owner?.FullName ?? string.Empty,
                dispute.Category, dispute.Status, dispute.Content,
                dispute.ProofPublicId is null ? null : cloudinaryService.BuildImageUrl(dispute.ProofPublicId, UploadOwnerType.PAYSLIP_DISPUTE_PROOF),
                dispute.CreatedAt, dispute.RespondedBy is { } responderId ? people.GetValueOrDefault(responderId)?.FullName : null,
                dispute.RespondedAt, dispute.AdminResponse, dispute.CalculationNote, dispute.AdjustmentNote,
                dispute.LinkedAdjustmentId is { } adjustmentId ? adjustmentCodes.GetValueOrDefault(adjustmentId) : null,
                dispute.EmployeeId == actorId);
        }).ToArray();
    }

    private static PayslipDetailDto EmptyPayslip(EmployeeModel employee, string periodKey, IReadOnlyList<PayslipPeriodOptionDto> options)
        => new(false, null, string.Empty, periodKey, string.Empty, string.Empty, string.Empty, null, false, null, string.Empty, null,
            employee.Id, employee.EmployeeCode ?? string.Empty, employee.FullName, PayrollHelper.RoleLabel(employee), employee.BranchName ?? string.Empty,
            PayrollHelper.BankAccountLabel(employee), null, 0, 0, 0, 0, 0, 0, string.Empty, 0, string.Empty, 0, string.Empty, 0, 0, 0, 0, 0,
            ZaloDeliveryStatus.UNSENT, null, PayrollHelper.HasZaloContact(employee), options, [], [], [], []);
}
