using backend.src.Data;
using backend.src.Dto.ApprovalDto;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.Common;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services.ApprovalServices;

public class BuybackApprovalService(
    AppDbContext dbContext,
    AuditLogService auditLogService,
    TimeProvider timeProvider)
{
    public const string AuditEntityType = "BUYBACK_APPROVAL";

    public async Task<PagedResult<BuybackApprovalItemResponse>> GetPagedAsync(
        ApprovalQuery query,
        CancellationToken cancellationToken = default)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var baseQuery = dbContext.StockReceipts
            .AsNoTracking()
            .Where(r => r.SourceType == StockReceiptSourceType.CUSTOMER_BUYBACK && r.NeedsApproval);

        if (query.Status.HasValue)
        {
            baseQuery = baseQuery.Where(r => r.Status == query.Status.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            baseQuery = baseQuery.Where(r =>
                r.Code.ToLower().Contains(term) ||
                (r.Note != null && r.Note.ToLower().Contains(term)));
        }

        var totalCount = await baseQuery.CountAsync(cancellationToken);

        var receipts = await baseQuery
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var receiptIds = receipts.Select(r => r.Id).ToList();
        var sellerIds = receipts.Where(r => r.SellerId.HasValue).Select(r => r.SellerId!.Value).Distinct().ToList();
        var creatorIds = receipts.Select(r => r.CreatedBy).Distinct().ToList();
        var approverIds = receipts.Where(r => r.ApprovedBy.HasValue).Select(r => r.ApprovedBy!.Value).Distinct().ToList();
        var allEmployeeIds = creatorIds.Concat(approverIds).Distinct().ToList();

        var customers = await dbContext.Customers
            .AsNoTracking()
            .Where(c => sellerIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, cancellationToken);

        var employees = await dbContext.Employees
            .AsNoTracking()
            .Where(e => allEmployeeIds.Contains(e.Id))
            .ToDictionaryAsync(e => e.Id, cancellationToken);

        var lines = await dbContext.StockReceiptLines
            .AsNoTracking()
            .Where(l => receiptIds.Contains(l.ReceiptId))
            .Join(dbContext.Editions, l => l.EditionId, e => e.Id, (l, e) => new { l.ReceiptId, e.TitleId, l.Quantity })
            .Join(dbContext.Titles, x => x.TitleId, t => t.Id, (x, t) => new { x.ReceiptId, t.Name, x.Quantity })
            .ToListAsync(cancellationToken);

        var linesByReceipt = lines
            .GroupBy(l => l.ReceiptId)
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    Count = g.Sum(x => x.Quantity),
                    Titles = string.Join(", ", g.Select(x => x.Name).Distinct().Take(2))
                });

        var items = receipts.Select(r =>
        {
            customers.TryGetValue(r.SellerId ?? Guid.Empty, out var cust);
            employees.TryGetValue(r.CreatedBy, out var creator);
            employees.TryGetValue(r.ApprovedBy ?? Guid.Empty, out var approver);
            linesByReceipt.TryGetValue(r.Id, out var lineSummary);

            return new BuybackApprovalItemResponse(
                r.Id,
                r.Code,
                cust?.FullName,
                cust?.Phone,
                r.Status,
                r.TotalAmount,
                lineSummary?.Count ?? 1,
                lineSummary?.Titles ?? "Sách thu mua cũ",
                r.Note,
                r.CreatedBy,
                creator?.FullName ?? "Nhân viên",
                r.CreatedAt,
                r.ApprovedBy,
                approver?.FullName,
                r.ApprovedAt,
                r.RejectReason
            );
        }).ToList();

        return new PagedResult<BuybackApprovalItemResponse>(items, totalCount, page, pageSize);
    }

    public async Task<BuybackApprovalDetailResponse> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var receipt = await dbContext.StockReceipts
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id && r.SourceType == StockReceiptSourceType.CUSTOMER_BUYBACK, cancellationToken)
            ?? throw new NotFoundException($"Không tìm thấy phiếu thu mua với mã: {id}");

        CustomerModel? customer = null;
        if (receipt.SellerId.HasValue)
        {
            customer = await dbContext.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.Id == receipt.SellerId.Value, cancellationToken);
        }

        var creator = await dbContext.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == receipt.CreatedBy, cancellationToken);
        EmployeeModel? approver = null;
        if (receipt.ApprovedBy.HasValue)
        {
            approver = await dbContext.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == receipt.ApprovedBy.Value, cancellationToken);
        }

        var receiptLines = await dbContext.StockReceiptLines
            .AsNoTracking()
            .Where(l => l.ReceiptId == id)
            .ToListAsync(cancellationToken);

        var editionIds = receiptLines.Select(l => l.EditionId).Distinct().ToList();
        var editions = await dbContext.Editions
            .AsNoTracking()
            .Where(e => editionIds.Contains(e.Id))
            .Join(dbContext.Titles, e => e.TitleId, t => t.Id, (e, t) => new { Edition = e, TitleName = t.Name })
            .ToDictionaryAsync(x => x.Edition.Id, cancellationToken);

        var lines = receiptLines.Select(l =>
        {
            editions.TryGetValue(l.EditionId, out var ed);
            return new BuybackApprovalLineDto(
                l.Id,
                ed?.TitleName ?? "Đầu sách",
                ed?.Edition.Publisher,
                ed?.Edition.Isbn,
                l.ConditionGrade,
                ed?.Edition.CoverPrice ?? 0,
                l.UnitCost,
                l.Quantity,
                ed?.Edition.PublicImageId
            );
        }).ToList();

        var images = await dbContext.StockReceiptImages
            .AsNoTracking()
            .Where(img => img.StockReceiptId == id)
            .Select(img => img.PublicImageId)
            .ToListAsync(cancellationToken);

        var rawAudits = await auditLogService.SearchAsync(
            new AuditLogQuery(null, null, AuditEntityType, id, null, null, Limit: 20),
            cancellationToken);

        var actorIds = rawAudits.Where(a => a.ActorId.HasValue).Select(a => a.ActorId!.Value).Distinct().ToList();
        var auditActors = await dbContext.Employees
            .AsNoTracking()
            .Where(e => actorIds.Contains(e.Id))
            .ToDictionaryAsync(e => e.Id, e => e.FullName, cancellationToken);

        var audits = rawAudits.Select(a => new ApprovalAuditItem(
            a.Id,
            a.OccurredAt,
            a.ActorId,
            a.ActorId.HasValue && auditActors.TryGetValue(a.ActorId.Value, out var name) ? name : null,
            a.Action,
            a.BeforeData,
            a.AfterData,
            a.Reason
        )).ToList();

        return new BuybackApprovalDetailResponse(
            receipt.Id,
            receipt.Code,
            customer?.FullName,
            customer?.Phone,
            receipt.Status,
            receipt.TotalAmount,
            lines.Sum(l => l.Quantity),
            string.Join(", ", lines.Select(l => l.TitleName).Distinct()),
            receipt.Note,
            receipt.CreatedBy,
            creator?.FullName ?? "Nhân viên",
            receipt.CreatedAt,
            receipt.ApprovedBy,
            approver?.FullName,
            receipt.ApprovedAt,
            receipt.RejectReason,
            lines,
            images,
            audits
        );
    }

    public async Task<BuybackApprovalDetailResponse> UpdateStatusAsync(
        Guid id,
        UpdateApprovalStatusRequestDto dto,
        bool isAdmin,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        if (!isAdmin)
        {
            throw new ForbiddenException("Chỉ Quản trị viên (Admin) mới có quyền phê duyệt hoặc từ chối yêu cầu thu mua.");
        }

        var actorId = auditContext.ActorId
            ?? throw new ForbiddenException("Không xác định được danh tính người thực hiện.");

        var receipt = await dbContext.StockReceipts
            .FirstOrDefaultAsync(r => r.Id == id && r.SourceType == StockReceiptSourceType.CUSTOMER_BUYBACK, cancellationToken)
            ?? throw new NotFoundException($"Không tìm thấy phiếu thu mua: {id}");

        if (receipt.CreatedBy == actorId)
        {
            throw new ForbiddenException("Quản lý không được tự phê duyệt yêu cầu thu mua do chính mình tạo.");
        }

        if (receipt.Status != ApprovalStatus.PENDING_APPROVAL)
        {
            throw new ConflictException($"Không thể xử lý phiếu thu mua đang ở trạng thái {receipt.Status}.");
        }

        if (dto.Status != ApprovalStatus.APPROVED && dto.Status != ApprovalStatus.REJECTED)
        {
            throw new BadRequestException("Trạng thái phê duyệt phải là APPROVED hoặc REJECTED.");
        }

        if (dto.Status == ApprovalStatus.REJECTED && string.IsNullOrWhiteSpace(dto.Reason))
        {
            throw new BadRequestException("Bắt buộc phải nhập lý do khi từ chối yêu cầu.");
        }

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var beforeStatus = receipt.Status;
        receipt.Status = dto.Status;
        receipt.ApprovedBy = actorId;
        receipt.ApprovedAt = now;
        if (dto.Status == ApprovalStatus.REJECTED)
        {
            receipt.RejectReason = dto.Reason;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.CreateAuditLogEntryAsync(new CreateAuditLogEntry(
            dto.Status == ApprovalStatus.APPROVED ? "BUYBACK_APPROVED" : "BUYBACK_REJECTED",
            AuditEntityType,
            receipt.Id,
            new { Status = beforeStatus },
            new { Status = receipt.Status, ApprovedBy = actorId, ApprovedAt = now, Reason = dto.Reason },
            dto.Reason ?? (dto.Status == ApprovalStatus.APPROVED ? "Quản lý đã duyệt giá thu mua" : "Từ chối thu mua"),
            auditContext
        ), cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<BuybackApprovalDetailResponse> CreateAsync(
        CreateBuybackApprovalRequestDto dto,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var actorId = auditContext.ActorId
            ?? throw new ForbiddenException("Không xác định được người lập yêu cầu.");

        if (dto.Lines == null || dto.Lines.Count == 0)
        {
            throw new BadRequestException("Phiếu thu mua phải có ít nhất 1 dòng sách.");
        }

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var receiptCode = $"PUR-{now:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";

        var receipt = new StockReceiptModel
        {
            Id = Guid.NewGuid(),
            Code = receiptCode,
            SourceType = StockReceiptSourceType.CUSTOMER_BUYBACK,
            SellerId = dto.CustomerId,
            Status = ApprovalStatus.PENDING_APPROVAL,
            TotalAmount = dto.TotalAmount,
            NeedsApproval = true,
            Note = dto.Reason,
            CreatedBy = actorId,
            CreatedAt = now
        };

        dbContext.StockReceipts.Add(receipt);

        foreach (var lineDto in dto.Lines)
        {
            dbContext.StockReceiptLines.Add(new StockReceiptLineModel
            {
                Id = Guid.NewGuid(),
                ReceiptId = receipt.Id,
                EditionId = lineDto.EditionId,
                Quantity = lineDto.Quantity,
                UnitCost = lineDto.ProposedPrice,
                ConditionGrade = lineDto.ConditionGrade,
                Availability = BookChannelAvailability.BOTH
            });
        }

        if (dto.ImageUrls != null)
        {
            foreach (var imgUrl in dto.ImageUrls)
            {
                dbContext.StockReceiptImages.Add(new StockReceiptImageModel
                {
                    Id = Guid.NewGuid(),
                    StockReceiptId = receipt.Id,
                    PublicImageId = imgUrl,
                    CreatedAt = now
                });
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.CreateAuditLogEntryAsync(new CreateAuditLogEntry(
            "BUYBACK_APPROVAL_CREATE",
            AuditEntityType,
            receipt.Id,
            null,
            new { receipt.Code, receipt.TotalAmount, receipt.Status },
            dto.Reason,
            auditContext
        ), cancellationToken);

        return await GetByIdAsync(receipt.Id, cancellationToken);
    }
}
