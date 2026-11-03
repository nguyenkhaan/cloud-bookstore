using System.Linq.Expressions;
using System.Text.Json;
using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.BookCopyDto;
using backend.src.Dto.Common;
using backend.src.Dto.UploadDto;
using backend.src.Exceptions;
using backend.src.Helpers;
using backend.src.Infrastructure;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

public class BookCopyService(
    AppDbContext dbContext,
    AuditLogService auditLogService,
    UploadIntentService uploadIntentService,
    ICloudinaryService cloudinaryService,
    ILogger<BookCopyService> logger)
{
    private const UploadOwnerType CopyImageOwner = UploadOwnerType.BOOK_COPY_IMAGE;
    private const UploadOwnerType EditionImageOwner = UploadOwnerType.EDITION_IMAGE;
    private const string ActionAttachImage = "ATTACH_IMAGE";
    private const string ActionReplaceImage = "REPLACE_IMAGE";
    private const string ActionDeleteImage = "DELETE_IMAGE";
    private const string AuditEntityType = "BookCopy";
    private const string ActionCreate = "BOOK_COPY_CREATE";
    private const string ActionUpdate = "BOOK_COPY_UPDATE";
    private const string ActionStatusChange = "BOOK_COPY_STATUS_CHANGE";
    private const string ActionLabelReprint = "BOOK_COPY_LABEL_REPRINT";

    public async Task<PagedResult<BookCopyResponse>> GetBookCopiesAsync(
        BookCopyQuery query,
        CancellationToken cancellationToken = default)
    {
        var rows = from c in dbContext.BookCopies.AsNoTracking()
                   join e in dbContext.Editions.AsNoTracking() on c.EditionId equals e.Id
                   join t in dbContext.Titles.AsNoTracking() on e.TitleId equals t.Id
                   join s in dbContext.BookSeries.AsNoTracking() on t.SeriesId equals s.Id into seriesGroup
                   from s in seriesGroup.DefaultIfEmpty()
                   join cat in dbContext.Categories.AsNoTracking() on t.CategoryId equals cat.Id into categoryGroup
                   from cat in categoryGroup.DefaultIfEmpty()
                   select new { c, e, t, s, cat };

        var barcode = BookCopyValidator.NormalizeBarcode(query.CopyBarcode);
        if (barcode != null)
        {
            rows = rows.Where(x => x.c.CopyBarcode.Contains(barcode));
        }

        if (!string.IsNullOrWhiteSpace(query.Isbn))
        {
            var cleanIsbn = query.Isbn.Trim().Replace("-", "").Replace(" ", "");
            rows = rows.Where(x => x.e.Isbn != null &&
                                   x.e.Isbn.Replace("-", "").Replace(" ", "").Contains(cleanIsbn));
        }

        if (!string.IsNullOrWhiteSpace(query.Name))
        {
            var name = query.Name.Trim().ToLower();
            rows = rows.Where(x => x.t.Name.ToLower().Contains(name));
        }

        if (query.TitleId.HasValue)
        {
            var titleId = query.TitleId.Value;
            rows = rows.Where(x => x.t.Id == titleId);
        }

        if (query.EditionId.HasValue)
        {
            var editionId = query.EditionId.Value;
            rows = rows.Where(x => x.e.Id == editionId);
        }

        if (query.SeriesId.HasValue)
        {
            var seriesId = query.SeriesId.Value;
            rows = rows.Where(x => x.t.SeriesId == seriesId);
        }

        if (!string.IsNullOrWhiteSpace(query.VolumeLabel))
        {
            var volume = query.VolumeLabel.Trim().ToLower();
            rows = rows.Where(x => x.t.VolumeLabel != null && x.t.VolumeLabel.ToLower().Contains(volume));
        }

        if (!string.IsNullOrWhiteSpace(query.Author))
        {
            var author = query.Author.Trim().ToLower();
            rows = rows.Where(x => x.t.Author != null && x.t.Author.ToLower().Contains(author));
        }

        if (query.CategoryId.HasValue)
        {
            var categoryIds = await ResolveCategoryIdsAsync(query.CategoryId.Value, cancellationToken);
            rows = rows.Where(x => x.t.CategoryId.HasValue && categoryIds.Contains(x.t.CategoryId.Value));
        }

        if (query.ConditionGrade.HasValue)
        {
            var grade = query.ConditionGrade.Value;
            rows = rows.Where(x => x.c.ConditionGrade == grade);
        }

        if (query.Availability.HasValue)
        {
            var availability = query.Availability.Value;
            rows = rows.Where(x => x.c.Availability == availability);
        }

        if (query.Status.HasValue)
        {
            var status = query.Status.Value;
            rows = rows.Where(x => x.c.Status == status);
        }
        else if (barcode == null)
        {
            rows = rows.Where(x => x.c.Status != BookCopyStatus.SOLD && x.c.Status != BookCopyStatus.DISPOSED);
        }

        var totalCount = await rows.CountAsync(cancellationToken);

        var pageRows = await rows
            .OrderBy(x => x.t.Name)
            .ThenBy(x => x.c.CopyBarcode)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(x => new
            {
                Response = new BookCopyResponse(
                x.c.Id,
                x.c.CopyBarcode,
                x.e.Id,
                x.e.Isbn,
                x.e.EditionStatement,
                x.e.PrintingStatement,
                x.e.Publisher,
                x.e.PublishYear,
                x.t.Id,
                x.t.Name,
                x.t.VolumeLabel,
                x.t.Author,
                x.t.SeriesId,
                x.s != null ? x.s.Name : null,
                x.t.CategoryId,
                x.cat != null ? x.cat.Name : null,
                x.c.ConditionGrade,
                x.c.Status,
                x.c.Availability,
                x.c.SellingPrice,
                x.c.RentalRate,
                x.c.ShelfCode,
                x.c.CreatedAt,
                null),
                x.c.PublicImageId
            })
            .ToListAsync(cancellationToken);

        // Image URLs are resolved in memory, never inside the EF projection.
        var items = pageRows
            .Select(row => row.Response with
            {
                ImageUrl = cloudinaryService.BuildImageUrlOrNull(row.PublicImageId, CopyImageOwner)
            })
            .ToList();

        return new PagedResult<BookCopyResponse>(items, totalCount, query.Page, query.PageSize);
    }

    public Task<BookCopyDetailResponse> GetBookCopyByIdAsync(
        Guid id,
        bool canViewCost,
        CancellationToken cancellationToken = default)
        => LoadDetailAsync(c => c.Id == id, $"Bản sách với ID '{id}' không tồn tại.", canViewCost, cancellationToken);

    public Task<BookCopyDetailResponse> GetBookCopyByBarcodeAsync(
        string copyBarcode,
        bool canViewCost,
        CancellationToken cancellationToken = default)
    {
        var normalized = BookCopyValidator.NormalizeBarcode(copyBarcode)
            ?? throw new BadRequestException("CopyBarcode không được để trống.");

        return LoadDetailAsync(
            c => c.CopyBarcode == normalized,
            $"Không tìm thấy bản sách có CopyBarcode '{normalized}'.",
            canViewCost,
            cancellationToken);
    }

    public async Task<IReadOnlyList<BookCopyHistoryItem>> GetBookCopyHistoryAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var copy = await dbContext.BookCopies.AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new { c.Id, c.CreatedAt, c.ReceiptLineId })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException($"Bản sách với ID '{id}' không tồn tại.");

        var items = new List<BookCopyHistoryItem>();

        // Nhập kho
        var receipt = await (from l in dbContext.StockReceiptLines.AsNoTracking()
                             where l.Id == copy.ReceiptLineId
                             join r in dbContext.StockReceipts.AsNoTracking() on l.ReceiptId equals r.Id
                             select new { r.Id, r.Code, r.SourceType, r.CreatedBy })
            .FirstOrDefaultAsync(cancellationToken);
        if (receipt != null)
        {
            items.Add(new BookCopyHistoryItem(
                copy.CreatedAt, "RECEIPT", "RECEIPT_LINKED",
                $"Bản sách được ghi nhận từ phiếu nhập {receipt.Code} (nguồn: {receipt.SourceType}).",
                receipt.Id, receipt.Code, receipt.CreatedBy, null, null, null, null));
        }

        // Audit log: tạo, sửa, đổi trạng thái/kênh, in tem
        var audits = await dbContext.AuditLogs.AsNoTracking()
            .Where(a => a.EntityType == AuditEntityType && a.EntityId == id)
            .Select(a => new { a.Id, a.OccurredAt, a.Action, a.ActorId, a.BeforeData, a.AfterData, a.Reason })
            .ToListAsync(cancellationToken);
        items.AddRange(audits.Select(a => new BookCopyHistoryItem(
            a.OccurredAt, "AUDIT_LOG", a.Action, DescribeAuditAction(a.Action),
            a.Id, null, a.ActorId, null, a.BeforeData, a.AfterData, a.Reason)));

        // Kiểm kê
        var checks = await dbContext.InventoryChecks.AsNoTracking()
            .Where(c => c.CopyId == id)
            .Select(c => new
            {
                c.Id, c.CheckCode, c.CheckedAt, c.CheckedBy, c.ExpectedStatus,
                c.ObservedStatus, c.IsFound, c.VarianceType, c.Note
            })
            .ToListAsync(cancellationToken);
        items.AddRange(checks.Select(c => new BookCopyHistoryItem(
            c.CheckedAt, "INVENTORY_CHECK", "INVENTORY_CHECK",
            $"Kiểm kê {c.CheckCode}: dự kiến {c.ExpectedStatus}, " +
            $"{(c.IsFound ? $"ghi nhận {c.ObservedStatus?.ToString() ?? "không rõ"}" : "không tìm thấy")}" +
            $"{(c.VarianceType.HasValue ? $", chênh lệch {c.VarianceType}" : "")}.",
            c.Id, c.CheckCode, c.CheckedBy, null, null, null, c.Note)));

        // Thuê / trả
        var rentals = await (from rl in dbContext.RentalLines.AsNoTracking()
                             where rl.CopyId == id
                             join s in dbContext.RentalSlips.AsNoTracking() on rl.SlipId equals s.Id
                             join ret in dbContext.Returns.AsNoTracking() on rl.ReturnId equals ret.Id into returns
                             from ret in returns.DefaultIfEmpty()
                             select new
                             {
                                 LineId = rl.Id,
                                 LineStatus = rl.Status,
                                 rl.DueAt,
                                 rl.CopyCondition,
                                 SlipId = s.Id,
                                 s.SlipNo,
                                 SlipCreatedBy = s.CreatedBy,
                                 SlipCreatedAt = s.CreatedAt,
                                 s.ActivatedAt,
                                 ReturnId = ret != null ? (Guid?)ret.Id : null,
                                 ReturnNo = ret != null ? ret.ReturnNo : null,
                                 ReturnedAt = ret != null ? (DateTime?)ret.ReturnedAt : null,
                                 ReturnCreatedBy = ret != null ? (Guid?)ret.CreatedBy : null
                             }).ToListAsync(cancellationToken);
        foreach (var r in rentals)
        {
            items.Add(new BookCopyHistoryItem(
                r.ActivatedAt ?? r.SlipCreatedAt, "RENTAL", "RENTAL",
                $"Thuê theo phiếu {r.SlipNo} (trạng thái dòng: {r.LineStatus}, hạn trả: {r.DueAt:dd/MM/yyyy}).",
                r.SlipId, r.SlipNo, r.SlipCreatedBy, null, null, null, null));

            if (r.ReturnId.HasValue && r.ReturnedAt.HasValue)
            {
                items.Add(new BookCopyHistoryItem(
                    r.ReturnedAt.Value, "RETURN", "RETURN",
                    $"Trả theo phiếu trả {r.ReturnNo}" +
                    $"{(r.CopyCondition.HasValue ? $" (tình trạng khi trả: {r.CopyCondition})" : "")}.",
                    r.ReturnId, r.ReturnNo, r.ReturnCreatedBy, null, null, null, null));
            }
        }

        // Bán
        var sales = await (from sl in dbContext.SaleInvoiceLines.AsNoTracking()
                           where sl.CopyId == id
                           join inv in dbContext.SaleInvoices.AsNoTracking() on sl.InvoiceId equals inv.Id
                           select new
                           {
                               LineStatus = sl.Status,
                               sl.FinalPrice,
                               InvoiceId = inv.Id,
                               inv.InvoiceNo,
                               InvoiceCreatedBy = inv.CreatedBy,
                               InvoiceCreatedAt = inv.CreatedAt,
                               inv.PaidAt
                           }).ToListAsync(cancellationToken);
        items.AddRange(sales.Select(s => new BookCopyHistoryItem(
            s.PaidAt ?? s.InvoiceCreatedAt, "SALE",
            s.LineStatus == SaleInvoiceLineStatus.REVERSED ? "SALE_REVERSED" : "SALE",
            $"Bán theo hóa đơn {s.InvoiceNo ?? "(chưa có số)"} với giá {s.FinalPrice:N0} (trạng thái dòng: {s.LineStatus}).",
            s.InvoiceId, s.InvoiceNo, s.InvoiceCreatedBy, null, null, null, null)));

        // Gắn tên người thực hiện
        var actorIds = items.Where(i => i.ActorId.HasValue).Select(i => i.ActorId!.Value).Distinct().ToList();
        var actorNames = actorIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await dbContext.Employees.AsNoTracking()
                .Where(e => actorIds.Contains(e.Id))
                .ToDictionaryAsync(e => e.Id, e => e.FullName, cancellationToken);

        return items
            .Select(i => i.ActorId.HasValue && actorNames.TryGetValue(i.ActorId.Value, out var name)
                ? i with { ActorName = name }
                : i)
            .OrderByDescending(i => i.OccurredAt)
            .ToList();
    }

    public async Task<BookCopyDetailResponse> CreateBookCopyAsync(
        CreateBookCopyRequest request,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        if (request.EditionId == Guid.Empty)
        {
            throw new BadRequestException("EditionId không hợp lệ.");
        }

        if (request.ReceiptLineId == Guid.Empty)
        {
            throw new BadRequestException("ReceiptLineId không hợp lệ.");
        }

        var data = BookCopyValidator.NormalizeAndValidate(
            request.ConditionNote, request.SellingPrice, request.RentalRate, request.ShelfCode);
        var reason = BookCopyValidator.ReasonOrDefault(request.Reason, "Tạo bản sách vật lý");

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var line = await dbContext.StockReceiptLines.AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == request.ReceiptLineId, cancellationToken)
            ?? throw new NotFoundException($"Dòng phiếu nhập với ID '{request.ReceiptLineId}' không tồn tại.");

        if (line.EditionId != request.EditionId)
        {
            throw new BadRequestException("EditionId không khớp với ấn bản của dòng phiếu nhập.");
        }

        var receipt = await dbContext.StockReceipts.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == line.ReceiptId, cancellationToken)
            ?? throw new NotFoundException($"Phiếu nhập với ID '{line.ReceiptId}' không tồn tại.");

        if (receipt.Status is ApprovalStatus.COMPLETED or ApprovalStatus.REJECTED or ApprovalStatus.CANCELLED)
        {
            throw new BadRequestException(
                $"Không thể tạo bản sách cho phiếu nhập {receipt.Code} đang ở trạng thái {receipt.Status}.");
        }

        var edition = await dbContext.Editions.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == request.EditionId, cancellationToken)
            ?? throw new NotFoundException($"Ấn bản với ID '{request.EditionId}' không tồn tại.");

        if (!edition.IsActive)
        {
            throw new BadRequestException("Không thể tạo bản sách cho ấn bản đang bị ngừng sử dụng.");
        }

        await dbContext.Database.ExecuteSqlAsync(
            $"SELECT 1 FROM stock_receipt_lines WHERE \"Id\" = {line.Id} FOR UPDATE",
            cancellationToken);

        var createdCount = await dbContext.BookCopies.CountAsync(c => c.ReceiptLineId == line.Id, cancellationToken);
        if (createdCount >= line.Quantity)
        {
            throw new ConflictException(
                $"Dòng phiếu nhập đã tạo đủ {line.Quantity} bản sách, không thể tạo thêm.");
        }

        // Domain validation is complete; consume the intent inside the same transaction.
        string? publicImageId = null;
        if (request.ImageUpload is not null)
        {
            publicImageId = await ConsumeImageAsync(request.ImageUpload, auditContext, cancellationToken);
        }

        var copy = new BookCopyModel
        {
            Id = Guid.NewGuid(),
            CopyBarcode = await NextBarcodeAsync(cancellationToken),
            EditionId = line.EditionId,
            ReceiptLineId = line.Id,
            Availability = request.Availability ?? line.Availability,
            Status = BookCopyStatus.PENDING_RECEIPT,
            ConditionGrade = request.ConditionGrade ?? line.ConditionGrade,
            ConditionNote = data.ConditionNote ?? line.ConditionNote,
            CostPrice = line.UnitCost,
            SellingPrice = data.SellingPrice,
            RentalRate = data.RentalRate,
            ShelfCode = data.ShelfCode,
            PublicImageId = publicImageId,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.BookCopies.Add(copy);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.CreateAuditLogEntryAsync(
            new CreateAuditLogEntry(ActionCreate, AuditEntityType, copy.Id, null, copy.ToAuditSnapshot(), reason, auditContext),
            cancellationToken);

        if (request.ImageUpload is not null)
        {
            await auditLogService.CreateAuditLogEntryAsync(
                BuildImageAudit(ActionAttachImage, copy.Id, null, request.ImageUpload.UploadIntentId, publicImageId,
                    "Attached image to book copy.", auditContext),
                cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);

        return await GetBookCopyByIdAsync(copy.Id, canViewCost: true, cancellationToken);
    }

    public async Task<BookCopyDetailResponse> UpdateBookCopyAsync(
        Guid id,
        UpdateBookCopyRequest request,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var grade = request.ConditionGrade
            ?? throw new BadRequestException("ConditionGrade không được để trống.");
        var availability = request.Availability
            ?? throw new BadRequestException("Availability không được để trống.");
        var reason = BookCopyValidator.RequireReason(request.Reason);
        var data = BookCopyValidator.NormalizeAndValidate(
            request.ConditionNote, request.SellingPrice, request.RentalRate, request.ShelfCode);

        var copy = await dbContext.BookCopies.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Bản sách với ID '{id}' không tồn tại.");

        BookCopyValidator.EnsureEditable(copy);

        var beforeJson = JsonSerializer.Serialize(copy.ToAuditSnapshot());
        var before = copy.ToAuditSnapshot();

        if (copy.Availability != availability)
        {
            await BookCopyValidator.EnsureNoActiveReferenceAsync(dbContext, id, cancellationToken);
        }

        copy.ConditionGrade = grade;
        copy.Availability = availability;
        copy.ConditionNote = data.ConditionNote;
        copy.SellingPrice = data.SellingPrice;
        copy.RentalRate = data.RentalRate;
        copy.ShelfCode = data.ShelfCode;

        if (copy.Status == BookCopyStatus.AVAILABLE)
        {
            BookCopyValidator.EnsureAvailableRequirements(copy);
        }

        var after = copy.ToAuditSnapshot();
        var fieldsChanged = beforeJson != JsonSerializer.Serialize(after);
        if (!fieldsChanged && request.ImageUpload is null)
        {
            return await GetBookCopyByIdAsync(id, canViewCost: true, cancellationToken);
        }

        var audits = new List<CreateAuditLogEntry>();
        if (fieldsChanged)
        {
            audits.Add(new CreateAuditLogEntry(ActionUpdate, AuditEntityType, copy.Id, before, after, reason, auditContext));
        }

        // The image only changes through a verified upload intent; omitting it keeps the current image.
        string? replacedImageId = null;
        if (request.ImageUpload is not null)
        {
            var newImageId = await ConsumeImageAsync(request.ImageUpload, auditContext, cancellationToken);
            replacedImageId = copy.PublicImageId;
            copy.PublicImageId = newImageId;
            audits.Add(BuildImageAudit(
                replacedImageId is null ? ActionAttachImage : ActionReplaceImage,
                copy.Id, replacedImageId, request.ImageUpload.UploadIntentId, newImageId,
                replacedImageId is null ? "Attached image to book copy." : "Replaced book copy image.",
                auditContext));
        }

        await SaveWithAuditsAsync(audits, cancellationToken);
        await cloudinaryService.TryDestroyAfterCommitAsync(replacedImageId, CopyImageOwner, logger);
        return await GetBookCopyByIdAsync(id, canViewCost: true, cancellationToken);
    }

    public async Task<BookCopyDetailResponse> UpdateBookCopyStatusAsync(
        Guid id,
        UpdateBookCopyStatusRequest request,
        bool isAdmin,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var target = request.Status
            ?? throw new BadRequestException("Status không được để trống.");
        var reason = BookCopyValidator.RequireReason(request.Reason);

        var copy = await dbContext.BookCopies.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Bản sách với ID '{id}' không tồn tại.");

        BookCopyValidator.EnsureStatusTransitionAllowed(copy.Status, target, isAdmin);
        await BookCopyValidator.EnsureNoActiveReferenceAsync(dbContext, id, cancellationToken);

        if (target == BookCopyStatus.AVAILABLE)
        {
            var editionExists = await dbContext.Editions.AnyAsync(e => e.Id == copy.EditionId, cancellationToken);
            BookCopyValidator.EnsureAvailableRequirements(copy, editionExists);
        }

        var before = copy.ToAuditSnapshot();
        copy.Status = target;
        var after = copy.ToAuditSnapshot();

        await SaveWithAuditAsync(copy, ActionStatusChange, before, after, reason, auditContext, cancellationToken);
        return await GetBookCopyByIdAsync(id, canViewCost: true, cancellationToken);
    }

    public async Task<BookCopyLabelResponse> CreateLabelAsync(
        Guid id,
        BookCopyLabelRequest? request,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var reason = BookCopyValidator.ReasonOrDefault(request?.Reason, "In/tái in tem CopyBarcode");
        var detail = await GetBookCopyByIdAsync(id, canViewCost: false, cancellationToken);

        var previousPrints = await dbContext.AuditLogs.AsNoTracking()
            .CountAsync(a => a.EntityType == AuditEntityType && a.EntityId == id && a.Action == ActionLabelReprint,
                cancellationToken);
        var printCount = previousPrints + 1;

        await auditLogService.CreateAuditLogEntryAsync(
            new CreateAuditLogEntry(
                ActionLabelReprint, AuditEntityType, id,
                new { PrintCount = previousPrints },
                new { PrintCount = printCount, detail.CopyBarcode },
                reason, auditContext),
            cancellationToken);

        return new BookCopyLabelResponse(
            detail.Id,
            detail.CopyBarcode,
            detail.Isbn,
            detail.TitleName,
            detail.VolumeLabel,
            detail.SeriesName,
            detail.Author,
            detail.Publisher,
            detail.PublishYear,
            detail.ConditionGrade,
            detail.Availability,
            detail.SellingPrice,
            detail.RentalRate,
            detail.ShelfCode,
            IsReprint: previousPrints > 0,
            PrintCount: printCount,
            GeneratedAt: DateTime.UtcNow);
    }

    private Task SaveWithAuditAsync(
        BookCopyModel copy,
        string action,
        object before,
        object after,
        string reason,
        AuditLogContext auditContext,
        CancellationToken cancellationToken)
        => SaveWithAuditsAsync(
            [new CreateAuditLogEntry(action, AuditEntityType, copy.Id, before, after, reason, auditContext)],
            cancellationToken);

    private async Task SaveWithAuditsAsync(
        IReadOnlyList<CreateAuditLogEntry> audits,
        CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        foreach (var audit in audits)
        {
            await auditLogService.CreateAuditLogEntryAsync(audit, cancellationToken);
        }
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task<BookCopyDetailResponse> UpdateBookCopyImageAsync(
        Guid id,
        CloudinaryUploadResultRequest imageUpload,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        if (imageUpload is null)
        {
            throw new BadRequestException("Image upload result is required.");
        }

        var copy = await dbContext.BookCopies.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Bản sách với ID '{id}' không tồn tại.");

        var newImageId = await ConsumeImageAsync(imageUpload, auditContext, cancellationToken);
        var oldImageId = copy.PublicImageId;
        copy.PublicImageId = newImageId;

        // Single SaveChanges inside the audit write: copy + consumed intent + audit commit together.
        await auditLogService.CreateAuditLogEntryAsync(
            BuildImageAudit(
                oldImageId is null ? ActionAttachImage : ActionReplaceImage,
                copy.Id, oldImageId, imageUpload.UploadIntentId, newImageId,
                oldImageId is null ? "Attached image to book copy." : "Replaced book copy image.",
                auditContext),
            cancellationToken);

        await cloudinaryService.TryDestroyAfterCommitAsync(oldImageId, CopyImageOwner, logger);
        return await GetBookCopyByIdAsync(id, canViewCost: true, cancellationToken);
    }

    public async Task DeleteBookCopyImageAsync(
        Guid id,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var copy = await dbContext.BookCopies.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Bản sách với ID '{id}' không tồn tại.");

        var oldImageId = copy.PublicImageId;
        if (oldImageId is null)
        {
            return;
        }

        copy.PublicImageId = null;
        await auditLogService.CreateAuditLogEntryAsync(
            BuildImageAudit(ActionDeleteImage, copy.Id, oldImageId, null, null, "Removed book copy image.", auditContext),
            cancellationToken);

        await cloudinaryService.TryDestroyAfterCommitAsync(oldImageId, CopyImageOwner, logger);
    }

    private Task<string> ConsumeImageAsync(
        CloudinaryUploadResultRequest imageUpload,
        AuditLogContext auditContext,
        CancellationToken cancellationToken)
    {
        if (auditContext?.ActorId is not { } actorId || actorId == Guid.Empty)
        {
            throw new UnauthorizedException("Authenticated user is required to attach an image.");
        }

        return uploadIntentService.ConsumeAsync(actorId, CopyImageOwner, imageUpload, cancellationToken);
    }

    private static CreateAuditLogEntry BuildImageAudit(
        string action,
        Guid copyId,
        string? oldPublicImageId,
        Guid? uploadIntentId,
        string? newPublicImageId,
        string reason,
        AuditLogContext auditContext)
        => new(
            action,
            AuditEntityType,
            copyId,
            oldPublicImageId is null ? null : new { PublicImageId = oldPublicImageId },
            newPublicImageId is null ? null : new { UploadIntentId = uploadIntentId, PublicImageId = newPublicImageId },
            reason,
            auditContext);

    private async Task<string> NextBarcodeAsync(CancellationToken cancellationToken)
    {
        var next = await dbContext.Database
            .SqlQueryRaw<long>("SELECT nextval('" + BookCopyValidator.BarcodeSequenceName + "') AS \"Value\"")
            .SingleAsync(cancellationToken);
        return BookCopyValidator.FormatBarcode(next);
    }

    private async Task<List<Guid>> ResolveCategoryIdsAsync(Guid rootId, CancellationToken cancellationToken)
    {
        var all = await dbContext.Categories.AsNoTracking()
            .Select(c => new { c.Id, c.ParentId })
            .ToListAsync(cancellationToken);

        var result = new HashSet<Guid> { rootId };
        var queue = new Queue<Guid>();
        queue.Enqueue(rootId);
        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            foreach (var child in all.Where(c => c.ParentId == current))
            {
                if (result.Add(child.Id))
                {
                    queue.Enqueue(child.Id);
                }
            }
        }

        return result.ToList();
    }

    private async Task<BookCopyDetailResponse> LoadDetailAsync(
        Expression<Func<BookCopyModel, bool>> predicate,
        string notFoundMessage,
        bool canViewCost,
        CancellationToken cancellationToken)
    {
        var row = await (from c in dbContext.BookCopies.AsNoTracking().Where(predicate)
                         join e in dbContext.Editions.AsNoTracking() on c.EditionId equals e.Id
                         join t in dbContext.Titles.AsNoTracking() on e.TitleId equals t.Id
                         join s in dbContext.BookSeries.AsNoTracking() on t.SeriesId equals s.Id into seriesGroup
                         from s in seriesGroup.DefaultIfEmpty()
                         join cat in dbContext.Categories.AsNoTracking() on t.CategoryId equals cat.Id into categoryGroup
                         from cat in categoryGroup.DefaultIfEmpty()
                         join l in dbContext.StockReceiptLines.AsNoTracking() on c.ReceiptLineId equals l.Id
                         join r in dbContext.StockReceipts.AsNoTracking() on l.ReceiptId equals r.Id
                         join sup in dbContext.Suppliers.AsNoTracking() on r.SupplierId equals sup.Id into supplierGroup
                         from sup in supplierGroup.DefaultIfEmpty()
                         select new { c, e, t, s, cat, r, sup })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException(notFoundMessage);

        return new BookCopyDetailResponse(
            row.c.Id,
            row.c.CopyBarcode,
            row.e.Id,
            row.e.Isbn,
            row.e.EditionStatement,
            row.e.PrintingStatement,
            row.e.Format,
            row.e.Publisher,
            row.e.PublishYear,
            row.e.CoverPrice,
            cloudinaryService.BuildImageUrlOrNull(row.e.PublicImageId, EditionImageOwner),
            row.e.IsActive,
            row.t.Id,
            row.t.Name,
            row.t.VolumeLabel,
            row.t.Author,
            row.t.SeriesId,
            row.s?.Name,
            row.t.CategoryId,
            row.cat?.Name,
            row.c.ConditionGrade,
            row.c.ConditionNote,
            row.c.Status,
            row.c.Availability,
            canViewCost ? row.c.CostPrice : null,
            row.c.SellingPrice,
            row.c.RentalRate,
            row.c.ShelfCode,
            row.c.CreatedAt,
            cloudinaryService.BuildImageUrlOrNull(row.c.PublicImageId, CopyImageOwner),
            row.c.ReceiptLineId,
            row.r.Id,
            row.r.Code,
            row.r.SourceType,
            row.r.SupplierId,
            row.sup?.Name,
            row.r.SellerId,
            row.r.CompletedAt);
    }

    private static string DescribeAuditAction(string action) => action switch
    {
        ActionCreate => "Tạo bản sách vật lý.",
        ActionUpdate => "Cập nhật thông tin bản sách (Grade, tình trạng, giá, kệ hoặc kênh Bán/Thuê).",
        ActionStatusChange => "Chuyển trạng thái vòng đời của bản sách.",
        ActionLabelReprint => "In/tái in tem CopyBarcode.",
        ActionAttachImage => "Gắn ảnh cho bản sách.",
        ActionReplaceImage => "Thay ảnh của bản sách.",
        ActionDeleteImage => "Xóa ảnh của bản sách.",
        _ => action
    };
}
