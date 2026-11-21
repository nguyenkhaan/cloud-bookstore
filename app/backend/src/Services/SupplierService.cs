using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.Common;
using backend.src.Dto.SupplierDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

public class SupplierService(
    AppDbContext dbContext,
    AuditLogService auditLogService)
{
    private const string AuditEntityType = "Supplier";
    private const string ActionCreate = "SUPPLIER_CREATE";
    private const string ActionUpdate = "SUPPLIER_UPDATE";
    private const string ActionStatusChange = "SUPPLIER_STATUS_CHANGE";
    private const string ActionDelete = "SUPPLIER_DELETE";

    public static string FormatSupplierCode(Guid id)
        => $"NCC-{id.ToString("N")[..4].ToUpperInvariant()}";

    public async Task<PagedResult<SupplierResponse>> GetSuppliersAsync(
        SupplierQuery query,
        CancellationToken cancellationToken = default)
    {
        var baseQuery = dbContext.Suppliers.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            baseQuery = baseQuery.Where(s =>
                s.Name.ToLower().Contains(term) ||
                (s.TaxCode != null && s.TaxCode.ToLower().Contains(term)) ||
                (s.Phone != null && s.Phone.ToLower().Contains(term)) ||
                (s.Address != null && s.Address.ToLower().Contains(term)));
        }

        if (query.IsActive.HasValue)
        {
            baseQuery = baseQuery.Where(s => s.IsActive == query.IsActive.Value);
        }

        if (query.HasPending.HasValue)
        {
            var pendingSupplierIds = dbContext.StockReceipts
                .Where(r =>
                    r.SupplierId != null &&
                    r.SourceType == StockReceiptSourceType.SUPPLIER &&
                    (r.Status == ApprovalStatus.DRAFT || r.Status == ApprovalStatus.PENDING_APPROVAL))
                .Select(r => r.SupplierId!.Value);

            baseQuery = query.HasPending.Value
                ? baseQuery.Where(s => pendingSupplierIds.Contains(s.Id))
                : baseQuery.Where(s => !pendingSupplierIds.Contains(s.Id));
        }

        var totalCount = await baseQuery.CountAsync(cancellationToken);

        var suppliers = await baseQuery
            .OrderByDescending(s => s.IsActive)
            .ThenBy(s => s.Name)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        var supplierIds = suppliers.Select(s => s.Id).ToList();
        var receiptRows = supplierIds.Count == 0
            ? []
            : await dbContext.StockReceipts.AsNoTracking()
                .Where(r =>
                    r.SupplierId != null &&
                    supplierIds.Contains(r.SupplierId.Value) &&
                    r.SourceType == StockReceiptSourceType.SUPPLIER &&
                    r.Status != ApprovalStatus.CANCELLED &&
                    r.Status != ApprovalStatus.REJECTED)
                .Select(r => new
                {
                    SupplierId = r.SupplierId!.Value,
                    r.Status,
                    r.TotalAmount
                })
                .ToListAsync(cancellationToken);

        var receiptsBySupplier = receiptRows
            .GroupBy(r => r.SupplierId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var items = suppliers
            .Select(s =>
            {
                var list = receiptsBySupplier.GetValueOrDefault(s.Id);
                var receiptCount = list?.Count ?? 0;
                var totalImport = list?
                    .Where(r => r.Status == ApprovalStatus.COMPLETED || r.Status == ApprovalStatus.APPROVED)
                    .Sum(r => r.TotalAmount) ?? 0L;
                var pendingAmount = list?
                    .Where(r => r.Status == ApprovalStatus.DRAFT || r.Status == ApprovalStatus.PENDING_APPROVAL)
                    .Sum(r => r.TotalAmount) ?? 0L;
                var pendingCount = list?
                    .Count(r => r.Status == ApprovalStatus.DRAFT || r.Status == ApprovalStatus.PENDING_APPROVAL) ?? 0;

                return new SupplierResponse(
                    s.Id,
                    FormatSupplierCode(s.Id),
                    s.Name,
                    s.Phone,
                    s.Address,
                    s.TaxCode,
                    s.IsActive,
                    receiptCount,
                    totalImport,
                    pendingAmount,
                    pendingCount);
            })
            .ToList();

        return new PagedResult<SupplierResponse>(items, totalCount, query.Page, query.PageSize);
    }

    public async Task<SupplierStatsResponse> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        var totalCount = await dbContext.Suppliers.AsNoTracking().CountAsync(cancellationToken);
        var activeCount = await dbContext.Suppliers.AsNoTracking().CountAsync(s => s.IsActive, cancellationToken);
        var inactiveCount = totalCount - activeCount;

        var receiptRows = await dbContext.StockReceipts.AsNoTracking()
            .Where(r => r.SourceType == StockReceiptSourceType.SUPPLIER &&
                        r.Status != ApprovalStatus.CANCELLED &&
                        r.Status != ApprovalStatus.REJECTED)
            .Select(r => new { r.Status, r.TotalAmount })
            .ToListAsync(cancellationToken);

        var totalImportAmount = receiptRows
            .Where(r => r.Status == ApprovalStatus.COMPLETED || r.Status == ApprovalStatus.APPROVED)
            .Sum(r => r.TotalAmount);

        var totalPendingAmount = receiptRows
            .Where(r => r.Status == ApprovalStatus.DRAFT || r.Status == ApprovalStatus.PENDING_APPROVAL)
            .Sum(r => r.TotalAmount);

        var pendingReceiptCount = receiptRows
            .Count(r => r.Status == ApprovalStatus.DRAFT || r.Status == ApprovalStatus.PENDING_APPROVAL);

        return new SupplierStatsResponse(
            activeCount,
            inactiveCount,
            totalCount,
            totalImportAmount,
            totalPendingAmount,
            pendingReceiptCount);
    }

    public async Task<SupplierResponse> GetSupplierByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var supplier = await dbContext.Suppliers.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (supplier is null)
        {
            throw new NotFoundException($"Không tìm thấy nhà cung cấp với ID '{id}'.");
        }

        return await BuildResponseAsync(supplier, cancellationToken);
    }

    public async Task<SupplierResponse> CreateSupplierAsync(
        CreateSupplierRequest request,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var name = ValidateName(request.Name);
        var phone = ValidateOptional(request.Phone, "Số điện thoại", 20);
        var taxCode = ValidateOptional(request.TaxCode, "Mã số thuế", 20);
        var address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();

        var nameExists = await dbContext.Suppliers.AnyAsync(
            s => s.Name.ToLower() == name.ToLower(),
            cancellationToken);
        if (nameExists)
        {
            throw new ConflictException($"Nhà cung cấp '{name}' đã tồn tại trong hệ thống.");
        }

        if (taxCode is not null)
        {
            var taxExists = await dbContext.Suppliers.AnyAsync(
                s => s.TaxCode != null && s.TaxCode.ToLower() == taxCode.ToLower(),
                cancellationToken);
            if (taxExists)
            {
                throw new ConflictException($"Mã số thuế '{taxCode}' đã được đăng ký cho một nhà cung cấp khác.");
            }
        }

        var supplier = new SupplierModel
        {
            Id = Guid.NewGuid(),
            Name = name,
            Phone = phone,
            Address = address,
            TaxCode = taxCode,
            IsActive = request.IsActive
        };

        dbContext.Suppliers.Add(supplier);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.CreateAuditLogEntryAsync(
            new CreateAuditLogEntry(
                ActionCreate,
                AuditEntityType,
                supplier.Id,
                null,
                ToAuditSnapshot(supplier),
                $"Tạo mới nhà cung cấp {supplier.Name}",
                auditContext),
            cancellationToken);

        return new SupplierResponse(
            supplier.Id,
            FormatSupplierCode(supplier.Id),
            supplier.Name,
            supplier.Phone,
            supplier.Address,
            supplier.TaxCode,
            supplier.IsActive,
            0,
            0,
            0,
            0);
    }

    public async Task<SupplierResponse> UpdateSupplierAsync(
        Guid id,
        UpdateSupplierRequest request,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var supplier = await dbContext.Suppliers
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (supplier is null)
        {
            throw new NotFoundException($"Không tìm thấy nhà cung cấp với ID '{id}'.");
        }

        var name = ValidateName(request.Name);
        var phone = ValidateOptional(request.Phone, "Số điện thoại", 20);
        var taxCode = ValidateOptional(request.TaxCode, "Mã số thuế", 20);
        var address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();

        var nameExists = await dbContext.Suppliers.AnyAsync(
            s => s.Id != id && s.Name.ToLower() == name.ToLower(),
            cancellationToken);
        if (nameExists)
        {
            throw new ConflictException($"Nhà cung cấp '{name}' đã tồn tại trong hệ thống.");
        }

        if (taxCode is not null)
        {
            var taxExists = await dbContext.Suppliers.AnyAsync(
                s => s.Id != id && s.TaxCode != null && s.TaxCode.ToLower() == taxCode.ToLower(),
                cancellationToken);
            if (taxExists)
            {
                throw new ConflictException($"Mã số thuế '{taxCode}' đã được đăng ký cho một nhà cung cấp khác.");
            }
        }

        var beforeSnapshot = ToAuditSnapshot(supplier);

        supplier.Name = name;
        supplier.Phone = phone;
        supplier.Address = address;
        supplier.TaxCode = taxCode;
        if (request.IsActive.HasValue)
        {
            supplier.IsActive = request.IsActive.Value;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.CreateAuditLogEntryAsync(
            new CreateAuditLogEntry(
                ActionUpdate,
                AuditEntityType,
                supplier.Id,
                beforeSnapshot,
                ToAuditSnapshot(supplier),
                $"Cập nhật hồ sơ nhà cung cấp {supplier.Name}",
                auditContext),
            cancellationToken);

        return await BuildResponseAsync(supplier, cancellationToken);
    }

    public async Task<SupplierResponse> UpdateSupplierStatusAsync(
        Guid id,
        UpdateSupplierStatusRequest request,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var supplier = await dbContext.Suppliers
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (supplier is null)
        {
            throw new NotFoundException($"Không tìm thấy nhà cung cấp với ID '{id}'.");
        }

        var beforeSnapshot = ToAuditSnapshot(supplier);
        supplier.IsActive = request.IsActive;
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.CreateAuditLogEntryAsync(
            new CreateAuditLogEntry(
                ActionStatusChange,
                AuditEntityType,
                supplier.Id,
                beforeSnapshot,
                ToAuditSnapshot(supplier),
                request.IsActive
                    ? $"Kích hoạt lại hợp tác với nhà cung cấp {supplier.Name}"
                    : $"Ngừng hợp tác với nhà cung cấp {supplier.Name}",
                auditContext),
            cancellationToken);

        return await BuildResponseAsync(supplier, cancellationToken);
    }

    public async Task DeleteSupplierAsync(
        Guid id,
        AuditLogContext auditContext,
        CancellationToken cancellationToken = default)
    {
        var supplier = await dbContext.Suppliers
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (supplier is null)
        {
            throw new NotFoundException($"Không tìm thấy nhà cung cấp với ID '{id}'.");
        }

        var hasReceipts = await dbContext.StockReceipts.AnyAsync(
            r => r.SupplierId == id,
            cancellationToken);

        if (hasReceipts)
        {
            throw new ConflictException(
                "Không thể xóa nhà cung cấp đã phát sinh phiếu nhập kho. Vui lòng chuyển sang trạng thái Ngừng hợp tác.");
        }

        var beforeSnapshot = ToAuditSnapshot(supplier);
        dbContext.Suppliers.Remove(supplier);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.CreateAuditLogEntryAsync(
            new CreateAuditLogEntry(
                ActionDelete,
                AuditEntityType,
                id,
                beforeSnapshot,
                null,
                $"Xóa nhà cung cấp {supplier.Name}",
                auditContext),
            cancellationToken);
    }

    private async Task<SupplierResponse> BuildResponseAsync(
        SupplierModel supplier,
        CancellationToken cancellationToken)
    {
        var receiptRows = await dbContext.StockReceipts.AsNoTracking()
            .Where(r => r.SupplierId == supplier.Id &&
                        r.SourceType == StockReceiptSourceType.SUPPLIER &&
                        r.Status != ApprovalStatus.CANCELLED &&
                        r.Status != ApprovalStatus.REJECTED)
            .Select(r => new { r.Status, r.TotalAmount })
            .ToListAsync(cancellationToken);

        var receiptCount = receiptRows.Count;
        var totalImport = receiptRows
            .Where(r => r.Status == ApprovalStatus.COMPLETED || r.Status == ApprovalStatus.APPROVED)
            .Sum(r => r.TotalAmount);
        var pendingAmount = receiptRows
            .Where(r => r.Status == ApprovalStatus.DRAFT || r.Status == ApprovalStatus.PENDING_APPROVAL)
            .Sum(r => r.TotalAmount);
        var pendingCount = receiptRows
            .Count(r => r.Status == ApprovalStatus.DRAFT || r.Status == ApprovalStatus.PENDING_APPROVAL);

        return new SupplierResponse(
            supplier.Id,
            FormatSupplierCode(supplier.Id),
            supplier.Name,
            supplier.Phone,
            supplier.Address,
            supplier.TaxCode,
            supplier.IsActive,
            receiptCount,
            totalImport,
            pendingAmount,
            pendingCount);
    }

    private static string ValidateName(string? rawName)
    {
        if (string.IsNullOrWhiteSpace(rawName))
        {
            throw new BadRequestException("Tên nhà cung cấp không được để trống.");
        }

        var trimmed = rawName.Trim();
        if (trimmed.Length > 200)
        {
            throw new BadRequestException("Tên nhà cung cấp không được vượt quá 200 ký tự.");
        }

        return trimmed;
    }

    private static string? ValidateOptional(string? value, string fieldLabel, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        if (trimmed.Length > maxLength)
        {
            throw new BadRequestException($"{fieldLabel} không được vượt quá {maxLength} ký tự.");
        }

        return trimmed;
    }

    private static object ToAuditSnapshot(SupplierModel supplier) => new
    {
        supplier.Id,
        supplier.Name,
        supplier.Phone,
        supplier.Address,
        supplier.TaxCode,
        supplier.IsActive
    };
}
