using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.Common;
using backend.src.Dto.StockReceiptDto;
using backend.src.Exceptions;
using backend.src.Helpers;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

public class StockReceiptService(
    AppDbContext dbContext,
    AuditLogService auditLogService)
{
    public Task<PagedResult<StockReceiptSummaryResponse>> GetStockReceiptsAsync(
        StockReceiptQuery query,
        CancellationToken cancellationToken = default)
        => StockReceiptQueryHelper.GetPagedAsync(dbContext, query, cancellationToken);

    public async Task<StockReceiptDetailResponse> GetStockReceiptByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var receipt = await dbContext.StockReceipts.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Không tìm thấy phiếu nhập kho với ID '{id}'.");

        return await StockReceiptQueryHelper.BuildDetailResponseAsync(dbContext, receipt, cancellationToken);
    }

    public async Task<StockReceiptDetailResponse> CreateStockReceiptAsync(
        CreateStockReceiptRequest request,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var actorId = await StockReceiptValidator.ResolveActorIdAsync(dbContext, auditContext, cancellationToken);
        var supplier = await StockReceiptValidator.ValidateSupplierAsync(dbContext, request.SupplierId, cancellationToken);
        var validatedLines = await StockReceiptValidator.ValidateLinesAsync(dbContext, request.Lines, cancellationToken);

        var receiptId = Guid.NewGuid();
        var code = await StockReceiptWorkflowHelper.GenerateReceiptCodeAsync(dbContext, "PN", cancellationToken);
        var totalAmount = validatedLines.Sum(l => l.Quantity * l.UnitCost);

        var receipt = new StockReceiptModel
        {
            Id = receiptId,
            Code = code,
            SourceType = StockReceiptSourceType.SUPPLIER,
            SupplierId = supplier.Id,
            Status = ApprovalStatus.DRAFT,
            TotalAmount = totalAmount,
            NeedsApproval = false,
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
            CreatedBy = actorId,
            CreatedAt = DateTime.UtcNow
        };

        var lineEntities = StockReceiptValidator.BuildLineEntities(receiptId, validatedLines);

        dbContext.StockReceipts.Add(receipt);
        dbContext.StockReceiptLines.AddRange(lineEntities);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.CreateAuditLogEntryAsync(
            new CreateAuditLogEntry(
                StockReceiptValidator.ActionCreate,
                StockReceiptValidator.AuditEntityType,
                receipt.Id,
                null,
                StockReceiptValidator.ToAuditSnapshot(receipt, lineEntities),
                $"Lập phiếu nhập kho nháp {receipt.Code} từ nhà cung cấp {supplier.Name}",
                auditContext),
            cancellationToken);

        return await StockReceiptQueryHelper.BuildDetailResponseAsync(dbContext, receipt, cancellationToken);
    }

    public async Task<StockReceiptDetailResponse> UpdateStockReceiptAsync(
        Guid id,
        UpdateStockReceiptRequest request,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var receipt = await dbContext.StockReceipts
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Không tìm thấy phiếu nhập kho với ID '{id}'.");

        if (receipt.Status != ApprovalStatus.DRAFT)
        {
            throw new ConflictException(
                $"Chỉ có thể chỉnh sửa phiếu nhập đang ở trạng thái DRAFT (trạng thái hiện tại: {receipt.Status}).");
        }

        var existingLines = await dbContext.StockReceiptLines
            .Where(l => l.ReceiptId == id)
            .ToListAsync(cancellationToken);

        var existingLineIds = existingLines.Select(l => l.Id).ToList();
        var hasGeneratedCopies = existingLineIds.Count > 0 &&
            await dbContext.BookCopies.AnyAsync(c => existingLineIds.Contains(c.ReceiptLineId), cancellationToken);

        if (hasGeneratedCopies)
        {
            throw new ConflictException(
                "Phiếu nhập đã sinh bản sách vật lý nên không thể thay thế danh mục dòng nhập.");
        }

        var supplier = await StockReceiptValidator.ValidateSupplierAsync(dbContext, request.SupplierId, cancellationToken);
        var validatedLines = await StockReceiptValidator.ValidateLinesAsync(dbContext, request.Lines, cancellationToken);

        var beforeSnapshot = StockReceiptValidator.ToAuditSnapshot(receipt, existingLines);

        dbContext.StockReceiptLines.RemoveRange(existingLines);

        var newLineEntities = StockReceiptValidator.BuildLineEntities(receipt.Id, validatedLines);

        receipt.SupplierId = supplier.Id;
        receipt.Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        receipt.TotalAmount = newLineEntities.Sum(l => l.Quantity * l.UnitCost);

        dbContext.StockReceiptLines.AddRange(newLineEntities);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.CreateAuditLogEntryAsync(
            new CreateAuditLogEntry(
                StockReceiptValidator.ActionUpdate,
                StockReceiptValidator.AuditEntityType,
                receipt.Id,
                beforeSnapshot,
                StockReceiptValidator.ToAuditSnapshot(receipt, newLineEntities),
                $"Cập nhật phiếu nhập kho nháp {receipt.Code}",
                auditContext),
            cancellationToken);

        return await StockReceiptQueryHelper.BuildDetailResponseAsync(dbContext, receipt, cancellationToken);
    }

    public async Task<StockReceiptDetailResponse> CompleteStockReceiptAsync(
        Guid id,
        CompleteStockReceiptRequest request,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var receipt = await dbContext.StockReceipts
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Không tìm thấy phiếu nhập kho với ID '{id}'.");

        if (receipt.Status is ApprovalStatus.COMPLETED or ApprovalStatus.CANCELLED or ApprovalStatus.REJECTED)
        {
            throw new ConflictException(
                $"Không thể hoàn tất phiếu nhập {receipt.Code} đang ở trạng thái {receipt.Status}.");
        }

        var lines = await dbContext.StockReceiptLines
            .Where(l => l.ReceiptId == id)
            .ToListAsync(cancellationToken);

        if (lines.Count == 0)
        {
            throw new BadRequestException("Phiếu nhập kho chưa có dòng sách nào để hoàn tất.");
        }

        var now = DateTime.UtcNow;
        var newCopies = await StockReceiptWorkflowHelper.PrepareAndGenerateCopiesAsync(
            dbContext,
            lines,
            request.Lines ?? [],
            request.ActivateImmediately,
            now,
            cancellationToken);

        var beforeSnapshot = StockReceiptValidator.ToAuditSnapshot(receipt, lines);

        if (!string.IsNullOrWhiteSpace(request.Note))
        {
            receipt.Note = request.Note.Trim();
        }

        receipt.Status = ApprovalStatus.COMPLETED;
        receipt.CompletedAt = now;

        if (newCopies.Count > 0)
        {
            dbContext.BookCopies.AddRange(newCopies);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        var targetStatus = request.ActivateImmediately
            ? BookCopyStatus.AVAILABLE
            : BookCopyStatus.PENDING_RECEIPT;

        await auditLogService.CreateAuditLogEntryAsync(
            new CreateAuditLogEntry(
                StockReceiptValidator.ActionComplete,
                StockReceiptValidator.AuditEntityType,
                receipt.Id,
                beforeSnapshot,
                new
                {
                    Receipt = StockReceiptValidator.ToAuditSnapshot(receipt, lines),
                    GeneratedCopyCount = newCopies.Count,
                    FirstBarcode = newCopies.FirstOrDefault()?.CopyBarcode,
                    LastBarcode = newCopies.LastOrDefault()?.CopyBarcode,
                    CopyStatus = targetStatus.ToString()
                },
                $"Hoàn tất phiếu nhập kho {receipt.Code} và sinh {newCopies.Count} mã CopyBarcode",
                auditContext),
            cancellationToken);

        return await StockReceiptQueryHelper.BuildDetailResponseAsync(dbContext, receipt, cancellationToken);
    }

    public async Task<StockReceiptDetailResponse> ActivateReceiptCopiesAsync(
        Guid id,
        ActivateStockReceiptCopiesRequest? request,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var receipt = await dbContext.StockReceipts.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Không tìm thấy phiếu nhập kho với ID '{id}'.");

        var lines = await dbContext.StockReceiptLines
            .Where(l => l.ReceiptId == id)
            .ToListAsync(cancellationToken);

        var lineIds = lines.Select(l => l.Id).ToList();
        var copies = await dbContext.BookCopies
            .Where(c => lineIds.Contains(c.ReceiptLineId))
            .ToListAsync(cancellationToken);

        if (copies.Count == 0)
        {
            throw new BadRequestException("Phiếu nhập chưa sinh bản sách vật lý nào để kích hoạt.");
        }

        var activatedCount = StockReceiptWorkflowHelper.ApplyActivationAndPricingToCopies(
            copies,
            request?.Lines ?? []);

        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.CreateAuditLogEntryAsync(
            new CreateAuditLogEntry(
                StockReceiptValidator.ActionActivate,
                StockReceiptValidator.AuditEntityType,
                receipt.Id,
                null,
                new { ReceiptId = receipt.Id, receipt.Code, ActivatedCount = activatedCount },
                $"Chuyển {activatedCount} bản sách thuộc phiếu {receipt.Code} sang trạng thái AVAILABLE",
                auditContext),
            cancellationToken);

        return await StockReceiptQueryHelper.BuildDetailResponseAsync(dbContext, receipt, cancellationToken);
    }

    public async Task<StockReceiptDetailResponse> CancelStockReceiptAsync(
        Guid id,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var receipt = await dbContext.StockReceipts
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Không tìm thấy phiếu nhập kho với ID '{id}'.");

        if (receipt.Status == ApprovalStatus.COMPLETED)
        {
            throw new ConflictException("Không thể hủy phiếu nhập kho đã hoàn tất.");
        }

        var lines = await dbContext.StockReceiptLines.AsNoTracking()
            .Where(l => l.ReceiptId == id)
            .ToListAsync(cancellationToken);

        var beforeSnapshot = StockReceiptValidator.ToAuditSnapshot(receipt, lines);
        receipt.Status = ApprovalStatus.CANCELLED;
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.CreateAuditLogEntryAsync(
            new CreateAuditLogEntry(
                StockReceiptValidator.ActionCancel,
                StockReceiptValidator.AuditEntityType,
                receipt.Id,
                beforeSnapshot,
                StockReceiptValidator.ToAuditSnapshot(receipt, lines),
                $"Hủy phiếu nhập kho {receipt.Code}",
                auditContext),
            cancellationToken);

        return await StockReceiptQueryHelper.BuildDetailResponseAsync(dbContext, receipt, cancellationToken);
    }
}
