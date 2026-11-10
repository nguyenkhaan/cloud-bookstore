using backend.src.Data;
using backend.src.Dto.Common;
using backend.src.Dto.CustomerDto;
using backend.src.Exceptions;
using backend.src.Helpers;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

public class CustomerService(AppDbContext dbContext, ILogger<CustomerService> logger)
{
    public async Task<CustomerDuplicateCheckResult> CheckDuplicateAsync(
        string? phone,
        CancellationToken cancellationToken = default)
    {
        var normalizedPhone = PhoneHelper.Normalize(phone);
        if (string.IsNullOrWhiteSpace(normalizedPhone))
        {
            return new CustomerDuplicateCheckResult
            {
                IsDuplicate = false,
                NormalizedPhone = string.Empty,
                ExistingCustomer = null
            };
        }

        var existing = await dbContext.Customers
            .Include(c => c.MembershipTier)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Phone == normalizedPhone, cancellationToken);

        if (existing is not null)
        {
            return new CustomerDuplicateCheckResult
            {
                IsDuplicate = true,
                NormalizedPhone = normalizedPhone,
                ExistingCustomer = MapToDto(existing)
            };
        }

        return new CustomerDuplicateCheckResult
        {
            IsDuplicate = false,
            NormalizedPhone = normalizedPhone,
            ExistingCustomer = null
        };
    }

    public async Task<PagedResult<CustomerDto>> GetCustomersAsync(
        CustomerQuery query,
        CancellationToken cancellationToken = default)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var queryable = dbContext.Customers
            .Include(c => c.MembershipTier)
            .AsNoTracking()
            .AsQueryable();

        if (query.TierId.HasValue)
        {
            queryable = queryable.Where(c => c.TierId == query.TierId.Value);
        }

        if (query.IsFlagged.HasValue)
        {
            queryable = queryable.Where(c => c.IsFlagged == query.IsFlagged.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            queryable = queryable.Where(c =>
                c.FullName.ToLower().Contains(search) ||
                c.Phone.Contains(search) ||
                (c.NationalId != null && c.NationalId.ToLower().Contains(search)));
        }

        var total = await queryable.CountAsync(cancellationToken);

        var items = await queryable
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => MapToDto(c))
            .ToListAsync(cancellationToken);

        return new PagedResult<CustomerDto>(items, total, page, pageSize);
    }

    public async Task<CustomerDto> GetCustomerByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var customer = await dbContext.Customers
            .Include(c => c.MembershipTier)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (customer is null)
        {
            throw new NotFoundException($"Không tìm thấy khách hàng với mã {id}");
        }

        return MapToDto(customer);
    }

    public async Task<CustomerDto> CreateCustomerAsync(
        CreateCustomerRequest request,
        CancellationToken cancellationToken = default)
    {
        var normalizedPhone = PhoneHelper.Normalize(request.Phone);
        if (!PhoneHelper.IsValidVietnamesePhoneNumber(normalizedPhone))
        {
            throw new BadRequestException("Số điện thoại không hợp lệ. Vui lòng nhập số di động Việt Nam 10 chữ số.");
        }

        var phoneExists = await dbContext.Customers
            .AnyAsync(c => c.Phone == normalizedPhone, cancellationToken);
        if (phoneExists)
        {
            throw new ConflictException("Số điện thoại đã tồn tại trong hệ thống");
        }

        var regularTier = await dbContext.MembershipTiers
            .FirstOrDefaultAsync(t => t.Name == MembershipTierName.REGULAR, cancellationToken)
            ?? await dbContext.MembershipTiers
                .OrderBy(t => t.RankOrder)
                .FirstOrDefaultAsync(cancellationToken);

        if (regularTier is null)
        {
            throw new InvalidOperationException("Hạng thành viên mặc định chưa được thiết lập.");
        }

        var customer = new CustomerModel
        {
            Id = Guid.NewGuid(),
            Phone = normalizedPhone,
            FullName = request.FullName.Trim(),
            Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
            NationalId = string.IsNullOrWhiteSpace(request.NationalId) ? null : request.NationalId.Trim(),
            Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim(),
            TierId = regularTier.Id,
            MembershipTier = regularTier,
            EligibleSpend = 0L,
            IsFlagged = false,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Customers.Add(customer);
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Created new customer {CustomerId} with phone {Phone}", customer.Id, customer.Phone);
        return MapToDto(customer);
    }

    public async Task<CustomerDto> UpdateCustomerAsync(
        Guid id,
        UpdateCustomerRequest request,
        CancellationToken cancellationToken = default)
    {
        var customer = await dbContext.Customers
            .Include(c => c.MembershipTier)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (customer is null)
        {
            throw new NotFoundException($"Không tìm thấy khách hàng với mã {id}");
        }

        var normalizedPhone = PhoneHelper.Normalize(request.Phone);
        if (!PhoneHelper.IsValidVietnamesePhoneNumber(normalizedPhone))
        {
            throw new BadRequestException("Số điện thoại không hợp lệ. Vui lòng nhập số di động Việt Nam 10 chữ số.");
        }

        if (customer.Phone != normalizedPhone)
        {
            var conflict = await dbContext.Customers
                .AnyAsync(c => c.Phone == normalizedPhone && c.Id != id, cancellationToken);
            if (conflict)
            {
                throw new ConflictException("Số điện thoại đã tồn tại trong hệ thống");
            }

            customer.Phone = normalizedPhone;
        }

        customer.FullName = request.FullName.Trim();
        customer.Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
        customer.NationalId = string.IsNullOrWhiteSpace(request.NationalId) ? null : request.NationalId.Trim();
        customer.Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();

        if (request.IsFlagged.HasValue)
        {
            customer.IsFlagged = request.IsFlagged.Value;
        }

        if (request.FlagReason is not null)
        {
            customer.FlagReason = string.IsNullOrWhiteSpace(request.FlagReason) ? null : request.FlagReason.Trim();
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Updated customer {CustomerId}", customer.Id);
        return MapToDto(customer);
    }

    public async Task DeleteCustomerAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var customer = await dbContext.Customers
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (customer is null)
        {
            throw new NotFoundException($"Không tìm thấy khách hàng với mã {id}");
        }

        var hasSaleInvoices = await dbContext.SaleInvoices
            .AnyAsync(s => s.CustomerId == id, cancellationToken);
        var hasRentalSlips = await dbContext.RentalSlips
            .AnyAsync(r => r.CustomerId == id, cancellationToken);
        var hasStockReceipts = await dbContext.StockReceipts
            .AnyAsync(s => s.SellerId == id, cancellationToken);

        if (hasSaleInvoices || hasRentalSlips || hasStockReceipts)
        {
            throw new BadRequestException("Không thể xóa khách hàng đã có lịch sử giao dịch");
        }

        dbContext.Customers.Remove(customer);
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Deleted customer {CustomerId}", id);
    }

    public async Task<CustomerStatsDto> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        var total = await dbContext.Customers.CountAsync(cancellationToken);
        var silver = await dbContext.Customers
            .CountAsync(c => c.MembershipTier.Name == MembershipTierName.SILVER, cancellationToken);
        var gold = await dbContext.Customers
            .CountAsync(c => c.MembershipTier.Name == MembershipTierName.GOLD, cancellationToken);
        var flagged = await dbContext.Customers
            .CountAsync(c => c.IsFlagged, cancellationToken);

        return new CustomerStatsDto
        {
            TotalCount = total,
            SilverCount = silver,
            GoldCount = gold,
            FlaggedCount = flagged
        };
    }

    private static CustomerDto MapToDto(CustomerModel customer)
    {
        return new CustomerDto
        {
            Id = customer.Id,
            Phone = customer.Phone,
            FullName = customer.FullName,
            Email = customer.Email,
            NationalId = customer.NationalId,
            Address = customer.Address,
            TierId = customer.TierId,
            TierName = customer.MembershipTier?.Name.ToString() ?? "REGULAR",
            TierRank = customer.MembershipTier?.RankOrder ?? 1,
            EligibleSpend = customer.EligibleSpend,
            IsFlagged = customer.IsFlagged,
            FlagReason = customer.FlagReason,
            CreatedAt = customer.CreatedAt
        };
    }
}
