using backend.src.Data;
using backend.src.Dto.ApprovalDto;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.Common;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services.ApprovalServices;

public class DamagePenaltyApprovalService(
    AppDbContext dbContext,
    AuditLogService auditLogService,
    TimeProvider timeProvider)
{
    public const string AuditEntityType = "DAMAGE_PENALTY_APPROVAL";

    public async Task<PagedResult<DamagePenaltyApprovalItemResponse>> GetPagedAsync(
        ApprovalQuery query,
        CancellationToken cancellationToken = default)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var baseQuery = dbContext.RentalLines
            .AsNoTracking()
            .Where(r => r.DamageNeedsApproval);

        if (query.Status.HasValue)
        {
            if (query.Status == ApprovalStatus.PENDING_APPROVAL)
            {
                baseQuery = baseQuery.Where(r => r.DamageApprovedBy == null && r.DamageApprovalReason == null);
            }
            else if (query.Status == ApprovalStatus.APPROVED)
            {
                baseQuery = baseQuery.Where(r => r.DamageApprovedBy != null);
            }
            else if (query.Status == ApprovalStatus.REJECTED)
            {
                baseQuery = baseQuery.Where(r => r.DamageApprovedBy == null && r.DamageApprovalReason != null);
            }
        }

        var totalCount = await baseQuery.CountAsync(cancellationToken);

        var lines = await baseQuery
            .OrderByDescending(r => r.DueAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var slipIds = lines.Select(l => l.SlipId).Distinct().ToList();
        var copyIds = lines.Select(l => l.CopyId).Distinct().ToList();
        var approverIds = lines.Where(l => l.DamageApprovedBy.HasValue).Select(l => l.DamageApprovedBy!.Value).Distinct().ToList();

        var slips = await dbContext.RentalSlips
            .AsNoTracking()
            .Where(s => slipIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, cancellationToken);

        var customerIds = slips.Values.Select(s => s.CustomerId).Distinct().ToList();
        var customers = await dbContext.Customers
            .AsNoTracking()
            .Include(c => c.MembershipTier)
            .Where(c => customerIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, cancellationToken);

        var copies = await dbContext.BookCopies
            .AsNoTracking()
            .Where(c => copyIds.Contains(c.Id))
            .Join(dbContext.Editions, c => c.EditionId, e => e.Id, (c, e) => new { Copy = c, e.TitleId })
            .Join(dbContext.Titles, x => x.TitleId, t => t.Id, (x, t) => new { x.Copy.Id, x.Copy.CopyBarcode, TitleName = t.Name })
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        var approvers = await dbContext.Employees
            .AsNoTracking()
            .Where(e => approverIds.Contains(e.Id))
            .ToDictionaryAsync(e => e.Id, cancellationToken);

        var items = lines.Select(l =>
        {
            slips.TryGetValue(l.SlipId, out var slip);
            CustomerModel? customer = null;
            if (slip != null) customers.TryGetValue(slip.CustomerId, out customer);
            copies.TryGetValue(l.CopyId, out var copy);
            approvers.TryGetValue(l.DamageApprovedBy ?? Guid.Empty, out var approver);

            var approvalStatus = l.DamageApprovedBy != null ? ApprovalStatus.APPROVED
                : (l.DamageApprovalReason != null ? ApprovalStatus.REJECTED : ApprovalStatus.PENDING_APPROVAL);

            var penaltyPct = l.BookPriceSnapshot > 0
                ? Math.Round((decimal)l.ChargedDamagePenalty / l.BookPriceSnapshot * 100, 1)
                : 0m;

            return new DamagePenaltyApprovalItemResponse(
                l.Id,
                l.SlipId,
                slip?.SlipNo ?? "RENT-SLIP",
                l.CopyId,
                copy?.CopyBarcode ?? "BC-0000",
                copy?.TitleName ?? "Tác phẩm",
                customer?.FullName,
                customer?.Phone,
                customer?.MembershipTier?.Name.ToString() ?? "Thường",
                l.BookPriceSnapshot,
                l.DamageNote ?? "Hư hỏng ngoài quy định",
                penaltyPct,
                l.ChargedDamagePenalty,
                Math.Max(0, l.BookPriceSnapshot - l.ChargedDamagePenalty),
                approvalStatus,
                slip?.CreatedBy ?? Guid.Empty,
                "Thu ngân",
                l.DueAt,
                l.DamageApprovedBy,
                approver?.FullName,
                l.DamageApprovedBy != null ? l.DueAt : null,
                l.DamageApprovalReason
            );
        }).ToList();

        return new PagedResult<DamagePenaltyApprovalItemResponse>(items, totalCount, page, pageSize);
    }

    public async Task<DamagePenaltyApprovalDetailResponse> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var line = await dbContext.RentalLines
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Không tìm thấy phiếu trả sách yêu cầu phạt: {id}");

        var slip = await dbContext.RentalSlips
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == line.SlipId, cancellationToken);

        CustomerModel? customer = null;
        if (slip != null)
        {
            customer = await dbContext.Customers
                .AsNoTracking()
                .Include(c => c.MembershipTier)
                .FirstOrDefaultAsync(c => c.Id == slip.CustomerId, cancellationToken);
        }

        var copy = await dbContext.BookCopies
            .AsNoTracking()
            .Where(c => c.Id == line.CopyId)
            .Join(dbContext.Editions, c => c.EditionId, e => e.Id, (c, e) => new { Copy = c, e.TitleId })
            .Join(dbContext.Titles, x => x.TitleId, t => t.Id, (x, t) => new { x.Copy.CopyBarcode, TitleName = t.Name })
            .FirstOrDefaultAsync(cancellationToken);

        EmployeeModel? approver = null;
        if (line.DamageApprovedBy.HasValue)
        {
            approver = await dbContext.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == line.DamageApprovedBy.Value, cancellationToken);
        }

        var images = await dbContext.RentalLineImages
            .AsNoTracking()
            .Where(img => img.RentalLineId == id)
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

        var approvalStatus = line.DamageApprovedBy != null ? ApprovalStatus.APPROVED
            : (line.DamageApprovalReason != null ? ApprovalStatus.REJECTED : ApprovalStatus.PENDING_APPROVAL);

        var penaltyPct = line.BookPriceSnapshot > 0
            ? Math.Round((decimal)line.ChargedDamagePenalty / line.BookPriceSnapshot * 100, 1)
            : 0m;

        return new DamagePenaltyApprovalDetailResponse(
            line.Id,
            line.SlipId,
            slip?.SlipNo ?? "RENT-SLIP",
            line.CopyId,
            copy?.CopyBarcode ?? "BC-0000",
            copy?.TitleName ?? "Tác phẩm",
            customer?.FullName,
            customer?.Phone,
            customer?.MembershipTier?.Name.ToString() ?? "Thường",
            line.BookPriceSnapshot,
            line.DamageNote ?? "Hư hỏng ngoài quy định",
            penaltyPct,
            line.ChargedDamagePenalty,
            Math.Max(0, line.BookPriceSnapshot - line.ChargedDamagePenalty),
            approvalStatus,
            slip?.CreatedBy ?? Guid.Empty,
            "Thu ngân",
            line.DueAt,
            line.DamageApprovedBy,
            approver?.FullName,
            line.DamageApprovedBy != null ? line.DueAt : null,
            line.DamageApprovalReason,
            images,
            audits
        );
    }

    public async Task<DamagePenaltyApprovalDetailResponse> UpdateStatusAsync(
        Guid id,
        UpdateApprovalStatusRequestDto dto,
        bool isAdmin,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        if (!isAdmin)
        {
            throw new ForbiddenException("Chỉ Quản trị viên (Admin) mới có quyền phê duyệt mức phạt hư hỏng.");
        }

        var actorId = auditContext.ActorId
            ?? throw new ForbiddenException("Không xác định được danh tính người phê duyệt.");

        var line = await dbContext.RentalLines
            .FirstOrDefaultAsync(l => l.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Không tìm thấy bản ghi thuê sách: {id}");

        if (dto.Status != ApprovalStatus.APPROVED && dto.Status != ApprovalStatus.REJECTED)
        {
            throw new BadRequestException("Trạng thái xử lý phải là APPROVED hoặc REJECTED.");
        }

        if (dto.Status == ApprovalStatus.REJECTED && string.IsNullOrWhiteSpace(dto.Reason))
        {
            throw new BadRequestException("Bắt buộc phải nhập lý do khi từ chối mức phạt đề xuất.");
        }

        var now = timeProvider.GetUtcNow().UtcDateTime;

        if (dto.Status == ApprovalStatus.APPROVED)
        {
            line.DamageApprovedBy = actorId;
            line.DamageApprovalReason = dto.Reason ?? "Đồng ý mức phạt đề xuất";
        }
        else
        {
            line.DamageApprovedBy = null;
            line.DamageApprovalReason = dto.Reason;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.CreateAuditLogEntryAsync(new CreateAuditLogEntry(
            dto.Status == ApprovalStatus.APPROVED ? "DAMAGE_PENALTY_APPROVED" : "DAMAGE_PENALTY_REJECTED",
            AuditEntityType,
            line.Id,
            null,
            new { line.ChargedDamagePenalty, line.DamageApprovedBy, line.DamageApprovalReason },
            dto.Reason ?? (dto.Status == ApprovalStatus.APPROVED ? "Phê duyệt mức phạt" : "Từ chối mức phạt"),
            auditContext
        ), cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<DamagePenaltyApprovalDetailResponse> CreateAsync(
        CreateDamagePenaltyApprovalRequestDto dto,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var actorId = auditContext.ActorId
            ?? throw new ForbiddenException("Không xác định được danh tính người tạo yêu cầu.");

        var line = await dbContext.RentalLines
            .FirstOrDefaultAsync(l => l.Id == dto.RentalLineId, cancellationToken)
            ?? throw new NotFoundException($"Không tìm thấy dòng thuê sách: {dto.RentalLineId}");

        line.DamageNeedsApproval = true;
        line.DamageNote = dto.DamageDescription;
        line.ChargedDamagePenalty = dto.PenaltyAmount;
        line.DamageApprovedBy = null;
        line.DamageApprovalReason = null;

        var now = timeProvider.GetUtcNow().UtcDateTime;

        if (dto.ImageUrls != null)
        {
            foreach (var imgUrl in dto.ImageUrls)
            {
                dbContext.RentalLineImages.Add(new RentalLineImageModel
                {
                    Id = Guid.NewGuid(),
                    RentalLineId = line.Id,
                    PublicImageId = imgUrl,
                    CreatedAt = now
                });
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.CreateAuditLogEntryAsync(new CreateAuditLogEntry(
            "DAMAGE_PENALTY_APPROVAL_CREATE",
            AuditEntityType,
            line.Id,
            null,
            new { line.DamageNote, line.ChargedDamagePenalty },
            dto.Reason,
            auditContext
        ), cancellationToken);

        return await GetByIdAsync(line.Id, cancellationToken);
    }
}
