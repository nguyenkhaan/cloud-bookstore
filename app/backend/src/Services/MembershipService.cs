using backend.src.Data;
using backend.src.Dto.Membership;
using backend.src.Exceptions;
using backend.src.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

public sealed class MembershipService(AppDbContext dbContext)
{
    public async Task<IReadOnlyList<MembershipTierPolicyResponse>> GetMembershipPolicyAsync(
        CancellationToken cancellationToken = default)
    {
        var tiers = await dbContext.MembershipTiers
            .AsNoTracking()
            .OrderBy(tier => tier.RankOrder)
            .ToListAsync(cancellationToken);

        return tiers.Select((tier, index) => new MembershipTierPolicyResponse(
            tier.Name,
            tier.MinSpend,
            index + 1 < tiers.Count ? tiers[index + 1].MinSpend : null,
            tier.MaxBooks,
            tier.MaxRentalDays,
            tier.SaleDiscountPct,
            tier.RentDiscountPct)).ToArray();
    }

    public async Task<MembershipTierModel> ResolveTierAsync(
        long eligibleSpend,
        CancellationToken cancellationToken = default)
    {
        if (eligibleSpend < 0)
        {
            throw new ArgumentOutOfRangeException(
                nameof(eligibleSpend),
                "Tổng chi tiêu hợp lệ không thể âm.");
        }

        return await dbContext.MembershipTiers.AsNoTracking()
            .Where(tier => tier.MinSpend <= eligibleSpend)
            .OrderByDescending(tier => tier.MinSpend)
            .ThenByDescending(tier => tier.RankOrder)
            .FirstOrDefaultAsync(cancellationToken) ?? throw new InvalidOperationException(
                "Chưa cấu hình hạng thành viên cho mức chi tiêu này.");
    }

    public async Task<MembershipTierModel> RecalculateCustomerTierAsync(
        Guid customerId,
        CancellationToken cancellationToken = default)
    {
        var customer = await dbContext.Customers
            .SingleOrDefaultAsync(item => item.Id == customerId, cancellationToken)
            ?? throw new NotFoundException($"Không tìm thấy khách hàng '{customerId}'.");

        var tier = await ResolveTierAsync(customer.EligibleSpend, cancellationToken);

        if (customer.TierId != tier.Id)
        {
            customer.TierId = tier.Id;
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return tier;
    }
}
