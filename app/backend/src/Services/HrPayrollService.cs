using System.Globalization;
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

public sealed class HrPayrollService(AppDbContext dbContext, UploadIntentService uploadIntentService, ICloudinaryService cloudinaryService)
{
    private const int MaxPageSize = 200;

    // ------------------------------------------------------------------ Queries

    public async Task<IReadOnlyList<PayrollPeriodListItemDto>> ListPeriodsAsync(CancellationToken cancellationToken = default)
    {
        var periods = await dbContext.PayrollPeriods.AsNoTracking()
            .OrderByDescending(period => period.Year).ThenByDescending(period => period.Month)
            .ToListAsync(cancellationToken);
        var totals = await dbContext.PayrollEntries.AsNoTracking()
            .GroupBy(entry => entry.PayrollPeriodId)
            .Select(group => new
            {
                PeriodId = group.Key,
                Count = group.Count(),
                Total = group.Sum(entry => entry.NetPay),
                Paid = group.Where(entry => entry.PayoutStatus == WorkRecordPaymentStatus.PAID).Sum(entry => entry.NetPay)
            })
            .ToListAsync(cancellationToken);
        var totalsByPeriod = totals.ToDictionary(item => item.PeriodId);

        var items = periods.Select(period =>
        {
            totalsByPeriod.TryGetValue(period.Id, out var total);
            return new PayrollPeriodListItemDto(period.PeriodKey, period.PayrollCode,
                PayrollHelper.BuildRangeLabel(period.Year, period.Month), period.Status, true,
                total?.Count ?? 0, total?.Total ?? 0, total?.Paid ?? 0);
        }).ToList();

        var today = VietnamTimeHelper.TodayVietnam(DateTime.UtcNow);
        var currentKey = PayrollHelper.BuildPeriodKey(today.Year, today.Month);
        if (items.All(item => item.PeriodKey != currentKey))
        {
            items.Insert(0, new PayrollPeriodListItemDto(currentKey, PayrollHelper.BuildPayrollCode(today.Year, today.Month),
                PayrollHelper.BuildRangeLabel(today.Year, today.Month), PayrollPeriodStatus.DRAFT, false, 0, 0, 0));
            items = items.OrderByDescending(item => item.PeriodKey[3..]).ThenByDescending(item => item.PeriodKey[..2]).ToList();
        }

        return items;
    }

    public async Task<PayrollPeriodDetailDto> GetPeriodAsync(string periodKey, PayrollPeriodQuery query, CancellationToken cancellationToken = default)
    {
        var (year, month, key) = PayrollHelper.ParsePeriodKey(periodKey);
        var period = await dbContext.PayrollPeriods.AsNoTracking().SingleOrDefaultAsync(item => item.PeriodKey == key, cancellationToken);
        return await BuildDetailAsync(period, year, month, key, query, cancellationToken);
    }

    public async Task<PayrollBreakdownDto> GetBreakdownAsync(string periodKey, Guid employeeId, CancellationToken cancellationToken = default)
    {
        var (year, month, key) = PayrollHelper.ParsePeriodKey(periodKey);
        var period = await dbContext.PayrollPeriods.AsNoTracking().SingleOrDefaultAsync(item => item.PeriodKey == key, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy bảng lương của kỳ này.");
        var entry = await dbContext.PayrollEntries.AsNoTracking()
            .SingleOrDefaultAsync(item => item.PayrollPeriodId == period.Id && item.EmployeeId == employeeId, cancellationToken)
            ?? throw new NotFoundException("Nhân viên không có trong bảng lương của kỳ này.");
        var items = await dbContext.PayrollEntryItems.AsNoTracking().Where(item => item.PayrollEntryId == entry.Id).ToListAsync(cancellationToken);

        var (startUtc, endUtc, _, _) = VietnamTimeHelper.GetMonthRangeUtc(year, month);
        var sessions = await dbContext.CashSessions.AsNoTracking()
            .Where(session => session.OpenedBy == employeeId && session.ClosedAt != null
                && session.ClosedAt >= startUtc && session.ClosedAt < endUtc
                && session.ClosingExpected != null && session.ClosingCounted != null
                && session.ClosingCounted != session.ClosingExpected)
            .OrderBy(session => session.ClosedAt).ToListAsync(cancellationToken);
        var approverIds = sessions.Select(session => session.VarianceApprovedBy).Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToArray();
        var approvers = await dbContext.Employees.AsNoTracking().Where(employee => approverIds.Contains(employee.Id))
            .ToDictionaryAsync(employee => employee.Id, employee => employee.FullName, cancellationToken);
        var variances = sessions.Select(session => new CashVarianceDto(session.Id,
            $"CS-{session.Id.ToString("N")[..8].ToUpperInvariant()}", session.OpenedAt, session.ClosedAt,
            session.ClosingExpected, session.ClosingCounted, (session.ClosingCounted ?? 0) - (session.ClosingExpected ?? 0),
            session.VarianceNote, session.VarianceApprovedBy is { } id ? approvers.GetValueOrDefault(id) : null)).ToArray();

        return new PayrollBreakdownDto(entry.Id, employeeId,
            PayrollHelper.Lines(items, PayrollItemCategory.BONUS),
            PayrollHelper.Lines(items, PayrollItemCategory.ALLOWANCE),
            PayrollHelper.Lines(items, PayrollItemCategory.DEDUCTION, PayrollItemCategory.ADVANCE),
            variances);
    }

    public async Task<IReadOnlyList<PayrollAdjustmentDto>> ListAdjustmentsAsync(string? periodKey, CancellationToken cancellationToken = default)
    {
        var query = dbContext.PayrollAdjustments.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(periodKey))
        {
            var (_, _, key) = PayrollHelper.ParsePeriodKey(periodKey);
            query = query.Where(item => item.TargetPeriodKey == key || item.SourcePeriodKey == key);
        }

        var adjustments = await query.OrderByDescending(item => item.CreatedAt).ToListAsync(cancellationToken);
        return await MapAdjustmentsAsync(adjustments, cancellationToken);
    }

    // ------------------------------------------------------------------ Commands

    public async Task<PayrollPeriodDetailDto> InitializeAsync(Guid actorId, string periodKey, AuditLogContext context, CancellationToken cancellationToken = default)
    {
        var (year, month, key) = PayrollHelper.ParsePeriodKey(periodKey);
        var now = DateTime.UtcNow;
        var period = await dbContext.PayrollPeriods.SingleOrDefaultAsync(item => item.PeriodKey == key, cancellationToken);
        if (period is { Status: not PayrollPeriodStatus.DRAFT })
            throw new ConflictException("Chỉ có thể khởi tạo lại bảng lương khi đang ở trạng thái Bản nháp.");
        var isNew = period is null;
        if (period is null)
        {
            period = new PayrollPeriodModel
            {
                PeriodKey = key, Year = year, Month = month, Status = PayrollPeriodStatus.DRAFT,
                PayrollCode = PayrollHelper.BuildPayrollCode(year, month),
                AttendanceSourceCode = PayrollHelper.BuildAttendanceCode(year, month), CreatedAt = now, UpdatedAt = now
            };
            dbContext.PayrollPeriods.Add(period);
        }

        var existingEntries = isNew ? [] : await dbContext.PayrollEntries.Where(entry => entry.PayrollPeriodId == period.Id).ToListAsync(cancellationToken);
        var entryIds = existingEntries.Select(entry => entry.Id).ToArray();
        var existingItems = isNew ? [] : await dbContext.PayrollEntryItems.Where(item => entryIds.Contains(item.PayrollEntryId)).ToListAsync(cancellationToken);

        // Rebuild automatically applied adjustment lines; manual and voucher lines survive a re-initialization.
        var staleAdjustmentItems = existingItems.Where(item => item.SourceType == PayrollEntryItemModel.AdjustmentSource).ToList();
        var staleAdjustmentIds = staleAdjustmentItems.Where(item => item.SourceId.HasValue).Select(item => item.SourceId!.Value).ToArray();
        var revertedAdjustments = new List<PayrollAdjustmentModel>();
        if (staleAdjustmentIds.Length > 0)
        {
            revertedAdjustments = await dbContext.PayrollAdjustments
                .Where(adjustment => staleAdjustmentIds.Contains(adjustment.Id) && adjustment.Status == PayrollAdjustmentStatus.APPLIED)
                .ToListAsync(cancellationToken);
            foreach (var adjustment in revertedAdjustments)
            {
                adjustment.Status = PayrollAdjustmentStatus.APPROVED;
                adjustment.AppliedAt = null;
            }
        }
        dbContext.PayrollEntryItems.RemoveRange(staleAdjustmentItems);
        var itemsByEntry = existingItems.Except(staleAdjustmentItems).GroupBy(item => item.PayrollEntryId)
            .ToDictionary(group => group.Key, group => group.ToList());

        var (_, _, fromVn, toVn) = VietnamTimeHelper.GetMonthRangeUtc(year, month);
        var minutes = await dbContext.EmployeeWorkRecords.AsNoTracking()
            .Where(record => record.WorkDate >= fromVn && record.WorkDate <= toVn)
            .GroupBy(record => record.EmployeeId)
            .Select(group => new { EmployeeId = group.Key, Worked = group.Sum(record => record.WorkedMinutes), Overtime = group.Sum(record => record.OvertimeMinutes) })
            .ToListAsync(cancellationToken);
        var minutesByEmployee = minutes.ToDictionary(item => item.EmployeeId);

        var dbApprovedAdjustments = await dbContext.PayrollAdjustments
            .Where(adjustment => adjustment.TargetPeriodKey == key && adjustment.Status == PayrollAdjustmentStatus.APPROVED)
            .ToListAsync(cancellationToken);
        var approvedAdjustments = revertedAdjustments
            .Where(adjustment => adjustment.TargetPeriodKey == key)
            .Concat(dbApprovedAdjustments)
            .DistinctBy(adjustment => adjustment.Id)
            .ToList();

        var employeeIds = minutesByEmployee.Keys
            .Concat(existingEntries.Select(entry => entry.EmployeeId))
            .Concat(approvedAdjustments.Select(adjustment => adjustment.EmployeeId))
            .Distinct().ToArray();
        var employees = await dbContext.Employees.AsNoTracking().Where(employee => employeeIds.Contains(employee.Id))
            .ToDictionaryAsync(employee => employee.Id, cancellationToken);

        var entriesByEmployee = existingEntries.ToDictionary(entry => entry.EmployeeId);
        var touched = new List<PayrollEntryModel>();
        foreach (var employeeId in employeeIds)
        {
            if (!employees.TryGetValue(employeeId, out var employee)) continue;
            if (!entriesByEmployee.TryGetValue(employeeId, out var entry))
            {
                if (employee.Status != EmployeeStatus.ACTIVE) continue;
                entry = new PayrollEntryModel { PayrollPeriodId = period.Id, EmployeeId = employeeId, CreatedAt = now };
                dbContext.PayrollEntries.Add(entry);
                entriesByEmployee[employeeId] = entry;
            }

            minutesByEmployee.TryGetValue(employeeId, out var total);
            var rate = employee.HourlyRate ?? 0m;
            entry.StandardHours = PayrollHelper.ToHours(total?.Worked ?? 0);
            entry.OvertimeHours = PayrollHelper.ToHours(total?.Overtime ?? 0);
            entry.HourlyRate = rate;
            entry.BaseSalary = PayrollHelper.RoundMoney(entry.StandardHours * rate);
            entry.OvertimeAmount = PayrollHelper.RoundMoney(entry.OvertimeHours * rate * PayrollHelper.OvertimeMultiplier);

            if (!itemsByEntry.TryGetValue(entry.Id, out var items)) itemsByEntry[entry.Id] = items = [];
            foreach (var adjustment in approvedAdjustments.Where(item => item.EmployeeId == employeeId))
            {
                var item = new PayrollEntryItemModel
                {
                    PayrollEntryId = entry.Id,
                    Category = adjustment.AdjustmentType == PayrollAdjustmentType.ADD_NEXT_PERIOD ? PayrollItemCategory.BONUS : PayrollItemCategory.DEDUCTION,
                    Label = $"{adjustment.AdjustmentCode} · {adjustment.Category}", Amount = adjustment.Amount,
                    VoucherCode = adjustment.AdjustmentCode, SourceType = PayrollEntryItemModel.AdjustmentSource,
                    SourceId = adjustment.Id, CreatedAt = now
                };
                dbContext.PayrollEntryItems.Add(item);
                items.Add(item);
                adjustment.Status = PayrollAdjustmentStatus.APPLIED;
                adjustment.AppliedAt = now;
            }

            PayrollHelper.Recompute(entry, items);
            touched.Add(entry);
        }

        period.UpdatedAt = now;
        PayrollHelper.AddAudit(dbContext, "INITIALIZE_PAYROLL_PERIOD", PayrollHelper.PeriodEntityType, period.Id, null,
            new { period.PeriodKey, Employees = touched.Count },
            $"Đồng bộ từ {period.AttendanceSourceCode} · {touched.Count} nhân viên · {FormatVnd(touched.Sum(entry => entry.NetPay))}", context);
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException) when (isNew)
        {
            throw new ConflictException("Bảng lương của kỳ này vừa được khởi tạo bởi người khác.");
        }

        return await GetPeriodAsync(key, new PayrollPeriodQuery(), cancellationToken);
    }

    public async Task<PayrollPeriodDetailDto> AdjustEmployeeAsync(
        Guid actorId, string periodKey, Guid employeeId, PatchPayrollEmployeeRequest request, AuditLogContext context, CancellationToken cancellationToken = default)
    {
        var (_, _, key) = PayrollHelper.ParsePeriodKey(periodKey);
        var period = await dbContext.PayrollPeriods.SingleOrDefaultAsync(item => item.PeriodKey == key, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy bảng lương của kỳ này.");
        if (period.Status != PayrollPeriodStatus.DRAFT) throw new ConflictException("Chỉ có thể điều chỉnh thủ công khi bảng lương đang ở Bản nháp.");
        var entry = await dbContext.PayrollEntries.SingleOrDefaultAsync(item => item.PayrollPeriodId == period.Id && item.EmployeeId == employeeId, cancellationToken)
            ?? throw new NotFoundException("Nhân viên không có trong bảng lương của kỳ này.");
        var employee = await dbContext.Employees.AsNoTracking().SingleAsync(item => item.Id == employeeId, cancellationToken);
        var items = await dbContext.PayrollEntryItems.Where(item => item.PayrollEntryId == entry.Id).ToListAsync(cancellationToken);

        var automatic = items.Where(item => item.SourceType != PayrollEntryItemModel.ManualSource).ToList();
        long Automatic(params PayrollItemCategory[] categories) => automatic.Where(item => categories.Contains(item.Category)).Sum(item => item.Amount);
        var automaticBonus = Automatic(PayrollItemCategory.BONUS);
        var automaticAllowance = Automatic(PayrollItemCategory.ALLOWANCE);
        var automaticDeduction = Automatic(PayrollItemCategory.DEDUCTION, PayrollItemCategory.ADVANCE);
        if (request.Bonus < automaticBonus || request.Allowance < automaticAllowance || request.Deduction < automaticDeduction)
            throw new BadRequestException("Giá trị điều chỉnh không được thấp hơn các khoản đã được áp dụng tự động.");

        var before = new { entry.Bonus, entry.Allowance, entry.Deduction, entry.NetPay };
        var now = DateTime.UtcNow;
        var note = request.Note?.Trim();
        var manual = items.Where(item => item.SourceType == PayrollEntryItemModel.ManualSource).ToList();
        dbContext.PayrollEntryItems.RemoveRange(manual);
        var kept = items.Except(manual).ToList();
        void AddManual(PayrollItemCategory category, long amount, string defaultLabel)
        {
            if (amount <= 0) return;
            var item = new PayrollEntryItemModel
            {
                PayrollEntryId = entry.Id, Category = category, Amount = amount, SourceType = PayrollEntryItemModel.ManualSource,
                Label = string.IsNullOrEmpty(note) ? defaultLabel : note, CreatedAt = now
            };
            dbContext.PayrollEntryItems.Add(item);
            kept.Add(item);
        }
        AddManual(PayrollItemCategory.BONUS, request.Bonus - automaticBonus, "Điều chỉnh thưởng");
        AddManual(PayrollItemCategory.ALLOWANCE, request.Allowance - automaticAllowance, "Điều chỉnh phụ cấp");
        AddManual(PayrollItemCategory.DEDUCTION, request.Deduction - automaticDeduction, "Điều chỉnh khấu trừ");

        PayrollHelper.Recompute(entry, kept);
        period.UpdatedAt = now;
        PayrollHelper.AddAudit(dbContext, "ADJUST_PAYROLL_ENTRY", PayrollHelper.PeriodEntityType, period.Id, before,
            new { entry.Bonus, entry.Allowance, entry.Deduction, entry.NetPay },
            $"Điều chỉnh thủ công · {employee.FullName}{(string.IsNullOrEmpty(note) ? string.Empty : " · " + note)}", context);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetPeriodAsync(key, new PayrollPeriodQuery(), cancellationToken);
    }

    public async Task<PayrollPeriodDetailDto> ApproveAsync(Guid actorId, string periodKey, AuditLogContext context, CancellationToken cancellationToken = default)
    {
        var (_, _, key) = PayrollHelper.ParsePeriodKey(periodKey);
        var period = await dbContext.PayrollPeriods.SingleOrDefaultAsync(item => item.PeriodKey == key, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy bảng lương của kỳ này.");
        if (period.Status != PayrollPeriodStatus.DRAFT) throw new ConflictException("Bảng lương đã được duyệt trước đó.");
        var totals = await dbContext.PayrollEntries.AsNoTracking().Where(entry => entry.PayrollPeriodId == period.Id)
            .GroupBy(entry => 1).Select(group => new { Count = group.Count(), Total = group.Sum(entry => entry.NetPay) })
            .SingleOrDefaultAsync(cancellationToken);
        if (totals is null || totals.Count == 0) throw new ConflictException("Bảng lương chưa có nhân viên. Vui lòng khởi tạo từ chấm công trước khi duyệt.");

        var now = DateTime.UtcNow;
        period.Status = PayrollPeriodStatus.APPROVED_UNPAID;
        period.ApprovedBy = actorId;
        period.ApprovedAt = now;
        period.UpdatedAt = now;
        PayrollHelper.AddAudit(dbContext, "APPROVE_PAYROLL_PERIOD", PayrollHelper.PeriodEntityType, period.Id,
            new { Status = PayrollPeriodStatus.DRAFT }, new { period.Status },
            $"Đã khóa · {totals.Count} nhân viên · {FormatVnd(totals.Total)}", context);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetPeriodAsync(key, new PayrollPeriodQuery(), cancellationToken);
    }

    public async Task<PayrollPeriodDetailDto> UnlockAsync(Guid actorId, string periodKey, UnlockPayrollRequest request, AuditLogContext context, CancellationToken cancellationToken = default)
    {
        var reason = request.Reason?.Trim();
        if (string.IsNullOrEmpty(reason)) throw new BadRequestException("Vui lòng nhập lý do mở khóa bảng lương.");
        var (_, _, key) = PayrollHelper.ParsePeriodKey(periodKey);
        var period = await dbContext.PayrollPeriods.SingleOrDefaultAsync(item => item.PeriodKey == key, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy bảng lương của kỳ này.");
        var hasPaid = await dbContext.PayrollEntries.AnyAsync(entry => entry.PayrollPeriodId == period.Id && entry.PayoutStatus == WorkRecordPaymentStatus.PAID, cancellationToken);
        if (hasPaid || period.Status is PayrollPeriodStatus.PARTIALLY_PAID or PayrollPeriodStatus.SETTLED)
            throw new ConflictException("Không thể mở khóa bảng lương đã phát sinh khoản chi.");
        if (period.Status != PayrollPeriodStatus.APPROVED_UNPAID) throw new ConflictException("Bảng lương đang ở trạng thái Bản nháp.");

        period.Status = PayrollPeriodStatus.DRAFT;
        period.ApprovedBy = null;
        period.ApprovedAt = null;
        period.UpdatedAt = DateTime.UtcNow;
        PayrollHelper.AddAudit(dbContext, "UNLOCK_PAYROLL_PERIOD", PayrollHelper.PeriodEntityType, period.Id,
            new { Status = PayrollPeriodStatus.APPROVED_UNPAID }, new { period.Status }, reason, context);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetPeriodAsync(key, new PayrollPeriodQuery(), cancellationToken);
    }

    public async Task<PayrollPeriodDetailDto> PayoutAsync(Guid actorId, string periodKey, BatchPayoutRequest request, AuditLogContext context, CancellationToken cancellationToken = default)
    {
        var (_, _, key) = PayrollHelper.ParsePeriodKey(periodKey);
        if (!Enum.IsDefined(request.Method)) throw new BadRequestException("Phương thức chi trả không hợp lệ.");
        var employeeIds = (request.EmployeeIds ?? []).Distinct().ToArray();
        if (employeeIds.Length == 0) throw new BadRequestException("Vui lòng chọn ít nhất một nhân viên chưa thanh toán.");
        var transactionRef = request.TransactionRef?.Trim() ?? string.Empty;
        if (request.Method == PaymentMethod.BANK_TRANSFER && transactionRef.Length == 0)
            throw new BadRequestException("Vui lòng nhập mã giao dịch ngân hàng.");

        var period = await dbContext.PayrollPeriods.SingleOrDefaultAsync(item => item.PeriodKey == key, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy bảng lương của kỳ này.");
        if (period.Status is not (PayrollPeriodStatus.APPROVED_UNPAID or PayrollPeriodStatus.PARTIALLY_PAID))
            throw new ConflictException(period.Status == PayrollPeriodStatus.DRAFT
                ? "Vui lòng duyệt & chốt bảng lương trước khi chi trả." : "Bảng lương đã được chi trả đầy đủ.");

        var allEntries = await dbContext.PayrollEntries.Where(entry => entry.PayrollPeriodId == period.Id).ToListAsync(cancellationToken);
        var selected = allEntries.Where(entry => employeeIds.Contains(entry.EmployeeId)).ToList();
        if (selected.Count != employeeIds.Length) throw new NotFoundException("Có nhân viên không thuộc bảng lương của kỳ này.");
        if (selected.Any(entry => entry.PayoutStatus == WorkRecordPaymentStatus.PAID)) throw new ConflictException("Có nhân viên đã được thanh toán trước đó.");

        var now = DateTime.UtcNow;
        var payoutAt = VietnamTimeHelper.GetDayRangeUtc(request.PayoutDate).UtcStart;
        var batchNumber = await dbContext.PayrollPayoutBatches.CountAsync(batch => batch.PayrollPeriodId == period.Id, cancellationToken) + 1;
        if (request.Method == PaymentMethod.CASH && transactionRef.Length == 0)
        {
            var prefix = $"PC-{request.PayoutDate:yyyyMMdd}-";
            var sameDay = await dbContext.PayrollPayoutBatches.CountAsync(batch => batch.TransactionRef.StartsWith(prefix), cancellationToken);
            transactionRef = $"{prefix}{sameDay + 1:000}";
        }

        string? proofPublicId = null;
        if (request.ProofUpload is not null)
            proofPublicId = await uploadIntentService.ConsumeAsync(actorId, UploadOwnerType.PAYROLL_PAYOUT_PROOF, request.ProofUpload, cancellationToken);

        var cashSessionId = request.Method == PaymentMethod.CASH
            ? await dbContext.CashSessions.AsNoTracking().Where(session => session.Status == CashSessionStatus.OPEN)
                .Select(session => (Guid?)session.Id).FirstOrDefaultAsync(cancellationToken)
            : null;

        var batch = new PayrollPayoutBatchModel
        {
            PayrollPeriodId = period.Id, BatchNumber = batchNumber, Method = request.Method, TransactionRef = transactionRef,
            PayoutAt = payoutAt, Amount = selected.Sum(entry => entry.NetPay), Note = request.Note?.Trim(),
            ProofPublicId = proofPublicId, ConfirmedBy = actorId, CreatedAt = now
        };
        dbContext.PayrollPayoutBatches.Add(batch);

        var (_, _, fromVn, toVn) = VietnamTimeHelper.GetMonthRangeUtc(period.Year, period.Month);
        var workRecords = await dbContext.EmployeeWorkRecords
            .Where(record => employeeIds.Contains(record.EmployeeId) && record.WorkDate >= fromVn && record.WorkDate <= toVn)
            .ToListAsync(cancellationToken);
        foreach (var record in workRecords)
        {
            record.PaymentStatus = WorkRecordPaymentStatus.PAID;
            record.ApprovedBy ??= actorId;
            record.ApprovedAt ??= now;
            record.UpdatedAt = now;
        }

        foreach (var entry in selected)
        {
            if (entry.NetPay > 0)
            {
                var payment = new PaymentModel
                {
                    PaymentNo = $"PR-{now:yyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}",
                    IdempotencyKey = $"payroll-{entry.Id:N}", Direction = PaymentDirection.OUT, PaymentType = PaymentType.PAYROLL,
                    Method = request.Method, Amount = entry.NetPay, Status = PaymentStatus.SUCCEEDED, CashSessionId = cashSessionId,
                    BankReference = transactionRef.Length == 0 ? null : transactionRef, CreatedBy = actorId, CreatedAt = now, PaidAt = now
                };
                dbContext.Payments.Add(payment);
                entry.PaymentId = payment.Id;
            }

            entry.PayoutStatus = WorkRecordPaymentStatus.PAID;
            entry.PayoutBatchId = batch.Id;
            entry.PaidAt = payoutAt;
            entry.UpdatedAt = now;
        }

        var fullyPaid = allEntries.All(entry => entry.PayoutStatus == WorkRecordPaymentStatus.PAID);
        period.Status = fullyPaid ? PayrollPeriodStatus.SETTLED : PayrollPeriodStatus.PARTIALLY_PAID;
        period.UpdatedAt = now;
        PayrollHelper.AddAudit(dbContext, "EXECUTE_PAYROLL_PAYOUT", PayrollHelper.PeriodEntityType, period.Id,
            null, new { batch.BatchNumber, batch.Method, batch.TransactionRef, batch.Amount, Employees = selected.Count, period.Status },
            $"{(request.Method == PaymentMethod.BANK_TRANSFER ? "Chuyển khoản" : "Tiền mặt")} đợt {batchNumber} · {transactionRef} · {FormatVnd(batch.Amount)}", context);
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            throw new ConflictException("Khoản chi này vừa được ghi nhận bởi người khác. Vui lòng tải lại bảng lương.");
        }

        return await GetPeriodAsync(key, new PayrollPeriodQuery(), cancellationToken);
    }

    public async Task<SendPayrollZaloResultDto> SendZaloAsync(Guid actorId, string periodKey, SendPayrollZaloRequest request, AuditLogContext context, CancellationToken cancellationToken = default)
    {
        var (_, _, key) = PayrollHelper.ParsePeriodKey(periodKey);
        var period = await dbContext.PayrollPeriods.SingleOrDefaultAsync(item => item.PeriodKey == key, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy bảng lương của kỳ này.");
        if (period.Status == PayrollPeriodStatus.DRAFT) throw new ConflictException("Chỉ được gửi phiếu lương sau khi Admin duyệt bảng lương.");

        var entries = await dbContext.PayrollEntries.Where(entry => entry.PayrollPeriodId == period.Id).ToListAsync(cancellationToken);
        var requested = request.EmployeeIds?.Distinct().ToArray();
        if (requested is { Length: > 0 })
        {
            entries = entries.Where(entry => requested.Contains(entry.EmployeeId)).ToList();
            if (entries.Count != requested.Length) throw new NotFoundException("Có nhân viên không thuộc bảng lương của kỳ này.");
        }
        if (entries.Count == 0) throw new BadRequestException("Không có phiếu lương để gửi.");

        var employeeIds = entries.Select(entry => entry.EmployeeId).ToArray();
        var employees = await dbContext.Employees.AsNoTracking().Where(employee => employeeIds.Contains(employee.Id))
            .ToDictionaryAsync(employee => employee.Id, cancellationToken);
        var now = DateTime.UtcNow;
        var results = entries.Select(entry => PayrollHelper.QueueZaloPayslip(dbContext, entry, period, employees[entry.EmployeeId], now)).ToArray();
        var sent = results.Count(result => result.Status == ZaloDeliveryStatus.SENT);
        PayrollHelper.AddAudit(dbContext, "SEND_PAYROLL_ZALO", PayrollHelper.PeriodEntityType, period.Id, null,
            new { Sent = sent, Failed = results.Length - sent }, $"{sent} phiếu đã gửi · {results.Length - sent} phiếu lỗi", context);
        await dbContext.SaveChangesAsync(cancellationToken);
        return new SendPayrollZaloResultDto(sent, results.Length - sent, results);
    }

    public async Task<PayrollAdjustmentDto> CreateAdjustmentAsync(Guid actorId, CreatePayrollAdjustmentRequest request, AuditLogContext context, CancellationToken cancellationToken = default)
    {
        var reason = request.Reason?.Trim();
        if (string.IsNullOrEmpty(reason)) throw new BadRequestException("Vui lòng nhập lý do, căn cứ và phạm vi điều chỉnh.");
        if (request.Amount <= 0) throw new BadRequestException("Số tiền điều chỉnh phải lớn hơn 0.");
        if (!Enum.IsDefined(request.AdjustmentType)) throw new BadRequestException("Loại điều chỉnh không hợp lệ.");
        if (request.Mode is not (PayrollAdjustmentStatus.DRAFT or PayrollAdjustmentStatus.APPROVED))
            throw new BadRequestException("Điều chỉnh chỉ có thể được lưu nháp hoặc duyệt.");
        var (targetYear, targetMonth, targetKey) = PayrollHelper.ParsePeriodKey(request.TargetPeriodKey);
        string? sourceKey = null;
        PayrollPeriodModel? sourcePeriod = null;
        if (!string.IsNullOrWhiteSpace(request.SourcePeriodKey))
        {
            var (sourceYear, sourceMonth, parsedSourceKey) = PayrollHelper.ParsePeriodKey(request.SourcePeriodKey);
            if (sourceYear * 12 + sourceMonth >= targetYear * 12 + targetMonth)
                throw new BadRequestException("Kỳ áp dụng phải sau kỳ phát sinh.");
            sourceKey = parsedSourceKey;
            sourcePeriod = await dbContext.PayrollPeriods.AsNoTracking().SingleOrDefaultAsync(item => item.PeriodKey == parsedSourceKey, cancellationToken);
        }

        var employee = await dbContext.Employees.AsNoTracking().SingleOrDefaultAsync(item => item.Id == request.EmployeeId, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy nhân viên.");
        var targetStatus = await dbContext.PayrollPeriods.AsNoTracking().Where(item => item.PeriodKey == targetKey)
            .Select(item => (PayrollPeriodStatus?)item.Status).SingleOrDefaultAsync(cancellationToken);
        if (targetStatus is not null and not PayrollPeriodStatus.DRAFT)
            throw new ConflictException("Kỳ áp dụng đã được duyệt, không thể thêm điều chỉnh.");

        string? proofPublicId = null;
        if (request.ProofUpload is not null)
            proofPublicId = await uploadIntentService.ConsumeAsync(actorId, UploadOwnerType.PAYROLL_PAYOUT_PROOF, request.ProofUpload, cancellationToken);

        var now = DateTime.UtcNow;
        var adjustment = new PayrollAdjustmentModel
        {
            AdjustmentCode = await PayrollHelper.NextMonthlyCodeAsync(dbContext.PayrollAdjustments.AsNoTracking().Select(item => item.AdjustmentCode), "ADJ", now, cancellationToken), EmployeeId = employee.Id,
            SourcePeriodKey = sourceKey, SourcePayrollCode = sourcePeriod?.PayrollCode,
            SourceVoucherRef = request.SourceVoucherRef?.Trim(), TargetPeriodKey = targetKey, Category = request.Category.Trim(),
            AdjustmentType = request.AdjustmentType, Amount = request.Amount, ReferenceCode = request.ReferenceCode?.Trim(),
            Reason = reason, ProofPublicId = proofPublicId, Status = request.Mode, CreatedBy = actorId, CreatedAt = now
        };
        dbContext.PayrollAdjustments.Add(adjustment);
        PayrollHelper.AddAudit(dbContext, "CREATE_PAYROLL_ADJUSTMENT", PayrollHelper.AdjustmentEntityType, adjustment.Id, null,
            new { adjustment.AdjustmentCode, adjustment.EmployeeId, adjustment.TargetPeriodKey, adjustment.AdjustmentType, adjustment.Amount, adjustment.Status },
            reason, context);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await MapAdjustmentsAsync([adjustment], cancellationToken)).Single();
    }

    // ------------------------------------------------------------------ Mapping

    private async Task<IReadOnlyList<PayrollAdjustmentDto>> MapAdjustmentsAsync(IReadOnlyList<PayrollAdjustmentModel> adjustments, CancellationToken cancellationToken)
    {
        if (adjustments.Count == 0) return [];
        var employeeIds = adjustments.Select(item => item.EmployeeId).Distinct().ToArray();
        var employees = await dbContext.Employees.AsNoTracking().Where(employee => employeeIds.Contains(employee.Id))
            .ToDictionaryAsync(employee => employee.Id, cancellationToken);
        return adjustments.Select(item =>
        {
            employees.TryGetValue(item.EmployeeId, out var employee);
            var label = employee is null ? string.Empty
                : string.IsNullOrWhiteSpace(employee.EmployeeCode) ? employee.FullName : $"{employee.FullName} · {employee.EmployeeCode}";
            return new PayrollAdjustmentDto(item.Id, item.AdjustmentCode, item.SourcePayrollCode, item.SourcePeriodKey, item.SourceVoucherRef,
                item.EmployeeId, label, item.TargetPeriodKey, item.Category, item.AdjustmentType, item.Amount, item.ReferenceCode,
                item.Reason, item.ProofPublicId is null ? null : cloudinaryService.BuildImageUrl(item.ProofPublicId, UploadOwnerType.PAYROLL_PAYOUT_PROOF),
                item.Status, item.CreatedAt);
        }).ToArray();
    }

    private async Task<PayrollPeriodDetailDto> BuildDetailAsync(
        PayrollPeriodModel? period, int year, int month, string key, PayrollPeriodQuery query, CancellationToken cancellationToken)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);
        var payoutFilter = query.PayoutFilter?.Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(payoutFilter) && payoutFilter is not ("paid" or "unpaid" or "partial"))
            throw new BadRequestException("Bộ lọc chi trả không hợp lệ.");

        var pending = await dbContext.PayrollAdjustments.AsNoTracking()
            .Where(item => item.TargetPeriodKey == key && item.Status != PayrollAdjustmentStatus.APPLIED)
            .OrderBy(item => item.CreatedAt).ToListAsync(cancellationToken);
        var pendingDtos = await MapAdjustmentsAsync(pending, cancellationToken);

        if (period is null)
        {
            return new PayrollPeriodDetailDto(key, PayrollHelper.BuildPayrollCode(year, month), PayrollHelper.BuildRangeLabel(year, month),
                PayrollHelper.BuildAttendanceCode(year, month), PayrollPeriodStatus.DRAFT, false, null, null, null, null, null, null,
                new PayrollKpiDto(0, 0, 0, 0, 0, 0, 0, 0), [], page, pageSize, 0, 0, 0, [], [], pendingDtos);
        }

        var all = await dbContext.PayrollEntries.AsNoTracking().Where(entry => entry.PayrollPeriodId == period.Id).ToListAsync(cancellationToken);
        var employeeIds = all.Select(entry => entry.EmployeeId).Concat(new[] { period.ApprovedBy }.Where(id => id.HasValue).Select(id => id!.Value)).Distinct().ToArray();
        var employees = await dbContext.Employees.AsNoTracking().Include(employee => employee.Role)
            .Where(employee => employeeIds.Contains(employee.Id)).ToDictionaryAsync(employee => employee.Id, cancellationToken);

        var matches = all.AsEnumerable();
        if (query.Status is { } statusFilter)
        {
            var statusMatches = statusFilter switch
            {
                PayrollPeriodStatus.DRAFT => period.Status == PayrollPeriodStatus.DRAFT,
                PayrollPeriodStatus.APPROVED_UNPAID => period.Status != PayrollPeriodStatus.DRAFT,
                _ => period.Status == statusFilter
            };
            if (!statusMatches) matches = [];
        }
        matches = payoutFilter switch
        {
            "paid" => matches.Where(entry => entry.PayoutStatus == WorkRecordPaymentStatus.PAID),
            "unpaid" => matches.Where(entry => entry.PayoutStatus == WorkRecordPaymentStatus.UNPAID),
            "partial" => period.Status == PayrollPeriodStatus.PARTIALLY_PAID ? matches : [],
            _ => matches
        };
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            matches = matches.Where(entry => employees.TryGetValue(entry.EmployeeId, out var employee)
                && (employee.FullName.Contains(term, StringComparison.OrdinalIgnoreCase)
                    || (employee.EmployeeCode?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false)
                    || PayrollHelper.RoleLabel(employee).Contains(term, StringComparison.OrdinalIgnoreCase)));
        }

        var filtered = matches.OrderBy(entry => employees.GetValueOrDefault(entry.EmployeeId)?.FullName, StringComparer.CurrentCultureIgnoreCase).ToList();
        var pageEntries = filtered.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        var pageEntryIds = pageEntries.Select(entry => entry.Id).ToArray();
        var items = await dbContext.PayrollEntryItems.AsNoTracking().Where(item => pageEntryIds.Contains(item.PayrollEntryId)).ToListAsync(cancellationToken);
        var itemsByEntry = items.GroupBy(item => item.PayrollEntryId).ToDictionary(group => group.Key, group => group.ToList());
        var batches = await dbContext.PayrollPayoutBatches.AsNoTracking().Where(batch => batch.PayrollPeriodId == period.Id)
            .OrderBy(batch => batch.BatchNumber).ToListAsync(cancellationToken);
        var batchesById = batches.ToDictionary(batch => batch.Id);

        var rows = pageEntries.Select(entry =>
        {
            var employee = employees[entry.EmployeeId];
            var entryItems = itemsByEntry.GetValueOrDefault(entry.Id) ?? [];
            var batch = entry.PayoutBatchId is { } batchId ? batchesById.GetValueOrDefault(batchId) : null;
            return new PayrollEmployeeRowDto(employee.Id, entry.Id, employee.EmployeeCode ?? string.Empty, employee.FullName,
                PayrollHelper.RoleLabel(employee), entry.StandardHours, entry.HourlyRate, entry.BaseSalary, entry.OvertimeHours,
                entry.OvertimeAmount, entry.Bonus, entry.Allowance, entry.Deduction, entry.MandatoryContribution, entry.Tax, entry.NetPay,
                entry.PayoutStatus, entry.ZaloStatus, entry.ZaloSentAt, entry.ZaloErrorReason, PayrollHelper.HasZaloContact(employee),
                PayrollHelper.BankAccountLabel(employee), entry.PaidAt, batch?.Method, batch?.TransactionRef, entry.ContributionNote,
                PayrollHelper.Lines(entryItems, PayrollItemCategory.BONUS),
                PayrollHelper.Lines(entryItems, PayrollItemCategory.ALLOWANCE),
                PayrollHelper.Lines(entryItems, PayrollItemCategory.DEDUCTION, PayrollItemCategory.ADVANCE));
        }).ToArray();

        var paidAmount = all.Where(entry => entry.PayoutStatus == WorkRecordPaymentStatus.PAID).Sum(entry => entry.NetPay);
        var totalNet = all.Sum(entry => entry.NetPay);
        var kpi = new PayrollKpiDto(totalNet, paidAmount, Math.Max(0, totalNet - paidAmount), all.Sum(entry => entry.OvertimeHours), all.Count,
            all.Count(entry => entry.ZaloStatus == ZaloDeliveryStatus.SENT), all.Count(entry => entry.ZaloStatus == ZaloDeliveryStatus.UNSENT),
            all.Count(entry => entry.ZaloStatus == ZaloDeliveryStatus.FAILED));

        var confirmerIds = batches.Select(batch => batch.ConfirmedBy).Where(id => !employees.ContainsKey(id)).Distinct().ToArray();
        var confirmers = confirmerIds.Length == 0
            ? new Dictionary<Guid, string>()
            : await dbContext.Employees.AsNoTracking().Where(employee => confirmerIds.Contains(employee.Id)).ToDictionaryAsync(employee => employee.Id, employee => employee.FullName, cancellationToken);
        string NameOf(Guid id) => employees.TryGetValue(id, out var employee) ? employee.FullName : confirmers.GetValueOrDefault(id) ?? "Admin";
        var batchDtos = batches.Select(batch => new PayrollBatchDto(batch.Id, batch.BatchNumber, batch.Method, batch.TransactionRef, batch.PayoutAt, batch.Amount,
            all.Where(entry => entry.PayoutBatchId == batch.Id).Select(entry => employees.GetValueOrDefault(entry.EmployeeId)?.FullName ?? string.Empty).ToArray(),
            batch.Note, batch.ProofPublicId is null ? null : cloudinaryService.BuildImageUrl(batch.ProofPublicId, UploadOwnerType.PAYROLL_PAYOUT_PROOF),
            NameOf(batch.ConfirmedBy))).ToArray();
        var lastBatch = batches.LastOrDefault();

        var logs = await dbContext.AuditLogs.AsNoTracking()
            .Where(log => log.EntityType == PayrollHelper.PeriodEntityType && log.EntityId == period.Id)
            .OrderByDescending(log => log.OccurredAt).Take(100).ToListAsync(cancellationToken);
        var actorIds = logs.Select(log => log.ActorId).Where(id => id.HasValue).Select(id => id!.Value).Where(id => !employees.ContainsKey(id)).Distinct().ToArray();
        var actors = actorIds.Length == 0
            ? new Dictionary<Guid, string>()
            : await dbContext.Employees.AsNoTracking().Where(employee => actorIds.Contains(employee.Id)).ToDictionaryAsync(employee => employee.Id, employee => employee.FullName, cancellationToken);
        var history = logs.OrderBy(log => log.OccurredAt).Select(log => new PayrollAuditHistoryDto(log.Id, log.OccurredAt,
            log.ActorId is { } actorId ? employees.TryGetValue(actorId, out var actor) ? actor.FullName : actors.GetValueOrDefault(actorId) ?? "Admin" : "Hệ thống",
            EventLabel(log.Action), log.Reason)).ToArray();

        return new PayrollPeriodDetailDto(period.PeriodKey, period.PayrollCode, PayrollHelper.BuildRangeLabel(period.Year, period.Month),
            period.AttendanceSourceCode, period.Status, true, period.ApprovedAt,
            period.ApprovedBy is { } approvedBy ? NameOf(approvedBy) : null, lastBatch?.PayoutAt, lastBatch?.Method, lastBatch?.TransactionRef,
            lastBatch is null ? null : NameOf(lastBatch.ConfirmedBy), kpi, rows, page, pageSize, filtered.Count, all.Count,
            all.Count(entry => entry.PayoutStatus == WorkRecordPaymentStatus.PAID), batchDtos, history, pendingDtos);
    }

    private static string EventLabel(string action) => action switch
    {
        "INITIALIZE_PAYROLL_PERIOD" => "Khởi tạo bảng lương từ chấm công",
        "ADJUST_PAYROLL_ENTRY" => "Điều chỉnh thủ công",
        "APPROVE_PAYROLL_PERIOD" => "Duyệt & Chốt bảng lương",
        "UNLOCK_PAYROLL_PERIOD" => "Mở khóa bảng lương",
        "EXECUTE_PAYROLL_PAYOUT" => "Chi trả lương",
        "SEND_PAYROLL_ZALO" => "Gửi phiếu lương qua Zalo",
        _ => action
    };

    internal static string FormatVnd(long amount)
        => amount.ToString("N0", CultureInfo.InvariantCulture).Replace(",", ".", StringComparison.Ordinal) + "đ";
}
