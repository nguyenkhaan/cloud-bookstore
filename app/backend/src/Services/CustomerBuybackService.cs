using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.BuybackDto;
using backend.src.Dto.Common;
using backend.src.Exceptions;
using backend.src.Helpers;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

public class CustomerBuybackService(
    AppDbContext dbContext,
    AuditLogService auditLogService)
{
    public Task<PagedResult<CustomerBuybackDetailResponse>> GetBuybacksAsync(
        BuybackQuery query,
        CancellationToken cancellationToken = default)
        => CustomerBuybackHelper.GetPagedAsync(dbContext, query, cancellationToken);

    public async Task<CustomerBuybackDetailResponse> GetBuybackByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var receipt = await dbContext.StockReceipts.AsNoTracking()
            .FirstOrDefaultAsync(
                r => r.Id == id && r.SourceType == StockReceiptSourceType.CUSTOMER_BUYBACK,
                cancellationToken)
            ?? throw new NotFoundException($"Không tìm thấy phiếu thu mua sách cũ với ID '{id}'.");

        return await CustomerBuybackHelper.BuildDetailResponseAsync(dbContext, receipt, cancellationToken);
    }

    public Task<BuybackIsbnLookupResponse> LookupByIsbnAsync(
        string query,
        CancellationToken cancellationToken = default)
        => CustomerBuybackHelper.LookupByIsbnAsync(dbContext, query, cancellationToken);

    public async Task<CustomerBuybackDetailResponse> CreateBuybackAsync(
        CreateCustomerBuybackRequest request,
        bool isAdmin,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var actorId = await StockReceiptValidator.ResolveActorIdAsync(dbContext, auditContext, cancellationToken);
        var effectiveAuditCtx = new AuditLogContext(actorId, auditContext.IpAddress);

        var (sellerName, sellerPhone) = CustomerBuybackHelper.ValidateSeller(request.SellerName, request.SellerPhone);
        var resolvedLines = await CustomerBuybackHelper.ValidateAndResolveLinesAsync(dbContext, request.Lines, cancellationToken);
        var customer = await CustomerBuybackHelper.ResolveOrCreateSellerCustomerAsync(
            dbContext,
            sellerName,
            sellerPhone,
            cancellationToken);

        var totalAmount = resolvedLines.Sum(l => l.AgreedBuyPrice * l.Quantity);
        var hasOverLimitItem = resolvedLines.Any(l => l.AgreedBuyPrice > CustomerBuybackHelper.SingleItemApprovalLimit);
        var isTotalOverLimit = totalAmount > CustomerBuybackHelper.SlipTotalApprovalLimit;
        var needsApproval = hasOverLimitItem || isTotalOverLimit;

        var pinApproved = !string.IsNullOrWhiteSpace(request.ManagerPin) && request.ManagerPin.Trim().Length >= 4;
        var isApprovedNow = !needsApproval || isAdmin || pinApproved;

        var now = DateTime.UtcNow;
        var receiptId = Guid.NewGuid();
        var code = await StockReceiptWorkflowHelper.GenerateReceiptCodeAsync(dbContext, "BUY", cancellationToken);

        var receipt = new StockReceiptModel
        {
            Id = receiptId,
            Code = code,
            SourceType = StockReceiptSourceType.CUSTOMER_BUYBACK,
            SellerId = customer.Id,
            Status = isApprovedNow ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING_APPROVAL,
            TotalAmount = totalAmount,
            NeedsApproval = needsApproval,
            ApprovedBy = isApprovedNow && needsApproval ? actorId : null,
            ApprovedAt = isApprovedNow && needsApproval ? now : null,
            Note = string.IsNullOrWhiteSpace(request.ExceedReason)
                ? $"Thu mua sách cũ từ khách {sellerName} ({sellerPhone})"
                : request.ExceedReason.Trim(),
            CreatedBy = actorId,
            CreatedAt = now
        };

        var lineEntities = resolvedLines.Select(l => new StockReceiptLineModel
        {
            Id = Guid.NewGuid(),
            ReceiptId = receiptId,
            EditionId = l.Edition.Id,
            Quantity = l.Quantity,
            UnitCost = l.AgreedBuyPrice,
            ConditionGrade = l.ConditionGrade,
            Availability = BookChannelAvailability.BOTH,
            ConditionNote = l.ConditionNote
        }).ToList();

        dbContext.StockReceipts.Add(receipt);
        dbContext.StockReceiptLines.AddRange(lineEntities);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.CreateAuditLogEntryAsync(
            new CreateAuditLogEntry(
                isApprovedNow ? "BUYBACK_APPROVED" : "BUYBACK_APPROVAL_CREATE",
                CustomerBuybackHelper.ApprovalAuditEntityType,
                receipt.Id,
                null,
                new
                {
                    receipt.Code,
                    SellerName = sellerName,
                    SellerPhone = sellerPhone,
                    receipt.TotalAmount,
                    receipt.NeedsApproval,
                    Status = receipt.Status.ToString()
                },
                receipt.Note,
                effectiveAuditCtx),
            cancellationToken);

        if (request.CompleteImmediately)
        {
            if (receipt.Status == ApprovalStatus.PENDING_APPROVAL)
            {
                throw new ConflictException(
                    "Phiếu thu mua vượt hạn mức đang chờ Admin phê duyệt, chưa thể chi tiền và sinh mã vạch ngay.");
            }

            return await CompleteBuybackAsync(
                receipt.Id,
                new CompleteCustomerBuybackRequest(request.PayoutMethod, request.ManagerPin, receipt.Note),
                isAdmin,
                effectiveAuditCtx,
                cancellationToken);
        }

        return await CustomerBuybackHelper.BuildDetailResponseAsync(dbContext, receipt, cancellationToken);
    }

    public async Task<CustomerBuybackDetailResponse> CompleteBuybackAsync(
        Guid id,
        CompleteCustomerBuybackRequest request,
        bool isAdmin,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var actorId = await StockReceiptValidator.ResolveActorIdAsync(dbContext, auditContext, cancellationToken);
        var effectiveAuditCtx = new AuditLogContext(actorId, auditContext.IpAddress);

        var receipt = await dbContext.StockReceipts
            .FirstOrDefaultAsync(
                r => r.Id == id && r.SourceType == StockReceiptSourceType.CUSTOMER_BUYBACK,
                cancellationToken)
            ?? throw new NotFoundException($"Không tìm thấy phiếu thu mua sách cũ với ID '{id}'.");

        if (receipt.Status == ApprovalStatus.COMPLETED)
        {
            throw new ConflictException($"Phiếu thu mua '{receipt.Code}' đã được chi tiền và sinh mã vạch trước đó.");
        }

        if (receipt.Status is ApprovalStatus.REJECTED or ApprovalStatus.CANCELLED)
        {
            throw new ConflictException($"Phiếu thu mua '{receipt.Code}' đang ở trạng thái {receipt.Status}, không thể chi tiền.");
        }

        var pinApproved = !string.IsNullOrWhiteSpace(request.ManagerPin) && request.ManagerPin.Trim().Length >= 4;
        if (receipt.Status == ApprovalStatus.PENDING_APPROVAL && !isAdmin && !pinApproved)
        {
            throw new ConflictException(
                "Phiếu thu mua có sách vượt hạn mức đang chờ Admin duyệt giá trước khi chi tiền.");
        }

        var lines = await dbContext.StockReceiptLines
            .Where(l => l.ReceiptId == receipt.Id)
            .ToListAsync(cancellationToken);

        var totalCopies = lines.Sum(l => l.Quantity);
        var barcodes = await StockReceiptWorkflowHelper.NextBarcodesAsync(dbContext, totalCopies, cancellationToken);
        var barcodeCursor = 0;
        var now = DateTime.UtcNow;

        var newCopies = new List<BookCopyModel>(totalCopies);
        foreach (var line in lines)
        {
            var (_, encodedSelling) = CustomerBuybackHelper.ParseEncodedConditionNote(line.ConditionNote);
            var sellingPrice = encodedSelling is > 0 ? encodedSelling.Value : line.UnitCost + 25000L;
            var rentalRate = Math.Max(2000L, (sellingPrice / 15 / 500) * 500);

            for (var i = 0; i < line.Quantity; i++)
            {
                newCopies.Add(new BookCopyModel
                {
                    Id = Guid.NewGuid(),
                    CopyBarcode = barcodes[barcodeCursor++],
                    EditionId = line.EditionId,
                    ReceiptLineId = line.Id,
                    Availability = line.Availability,
                    Status = BookCopyStatus.AVAILABLE,
                    ConditionGrade = line.ConditionGrade,
                    ConditionNote = line.ConditionNote,
                    CostPrice = line.UnitCost,
                    SellingPrice = sellingPrice,
                    RentalRate = rentalRate,
                    CreatedAt = now
                });
            }
        }

        var openSession = await dbContext.CashSessions.AsNoTracking()
            .Where(s => s.Status == CashSessionStatus.OPEN)
            .OrderByDescending(s => s.OpenedAt)
            .FirstOrDefaultAsync(cancellationToken);

        var paymentCount = await dbContext.Payments.CountAsync(cancellationToken);
        var paymentNo = $"PAY-BUY-{(paymentCount + 1):D5}";

        var payment = new PaymentModel
        {
            Id = Guid.NewGuid(),
            PaymentNo = paymentNo[..Math.Min(20, paymentNo.Length)],
            IdempotencyKey = $"buyback-{receipt.Id:N}",
            Direction = PaymentDirection.OUT,
            PaymentType = PaymentType.BUYBACK,
            Method = request.PayoutMethod,
            Amount = receipt.TotalAmount,
            Status = PaymentStatus.SUCCEEDED,
            CashSessionId = request.PayoutMethod == PaymentMethod.CASH ? openSession?.Id : null,
            StockReceiptId = receipt.Id,
            CreatedBy = actorId,
            CreatedAt = now,
            PaidAt = now
        };

        if (receipt.ApprovedBy is null && receipt.NeedsApproval)
        {
            receipt.ApprovedBy = actorId;
            receipt.ApprovedAt = now;
        }

        receipt.Status = ApprovalStatus.COMPLETED;
        receipt.CompletedAt = now;

        dbContext.BookCopies.AddRange(newCopies);
        dbContext.Payments.Add(payment);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.CreateAuditLogEntryAsync(
            new CreateAuditLogEntry(
                "BUYBACK_COMPLETED",
                CustomerBuybackHelper.ApprovalAuditEntityType,
                receipt.Id,
                null,
                new
                {
                    receipt.Code,
                    receipt.TotalAmount,
                    PayoutMethod = request.PayoutMethod.ToString(),
                    payment.PaymentNo,
                    GeneratedCopyCount = newCopies.Count,
                    FirstBarcode = newCopies.FirstOrDefault()?.CopyBarcode,
                    LastBarcode = newCopies.LastOrDefault()?.CopyBarcode
                },
                $"Hoàn tất thu mua {receipt.Code}, chi {receipt.TotalAmount:N0}đ và sinh {newCopies.Count} mã CopyBarcode",
                effectiveAuditCtx),
            cancellationToken);

        return await CustomerBuybackHelper.BuildDetailResponseAsync(dbContext, receipt, cancellationToken);
    }
}
