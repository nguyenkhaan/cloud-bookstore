using System.Text.Json;
using backend.src.Data;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace backend.Tests.Services;

public sealed class MembershipServiceTests
{
    [Fact]
    public async Task GetCurrentPolicyAsync_exposes_next_eligible_spend_to_api_clients()
    {
        await using var dbContext = CreateDbContext();
        AddPolicies(dbContext);
        await dbContext.SaveChangesAsync();

        var policies = await new MembershipService(dbContext).GetMembershipPolicyAsync();
        var silver = Assert.Single(policies, policy => policy.Name == MembershipTierName.SILVER);
        var json = JsonSerializer.Serialize(silver, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        using var document = JsonDocument.Parse(json);

        Assert.True(document.RootElement.TryGetProperty("nextTierMinEligibleSpend", out var nextThreshold));
        Assert.Equal(3_000_000L, nextThreshold.GetInt64());
    }

    [Theory]
    [InlineData(999_999L, MembershipTierName.REGULAR, 3, 14, 0)]
    [InlineData(1_000_000L, MembershipTierName.SILVER, 5, 21, 5)]
    [InlineData(1_000_001L, MembershipTierName.SILVER, 5, 21, 5)]
    [InlineData(2_999_999L, MembershipTierName.SILVER, 5, 21, 5)]
    [InlineData(3_000_000L, MembershipTierName.GOLD, 8, 30, 10)]
    [InlineData(3_000_001L, MembershipTierName.GOLD, 8, 30, 10)]
    public async Task ResolveTierAsync_uses_the_policy_boundaries_and_benefits(
        long eligibleSpend,
        MembershipTierName expectedName,
        short expectedMaxBooks,
        short expectedMaxRentalDays,
        decimal expectedDiscountPct)
    {
        await using var dbContext = CreateDbContext();
        AddPolicies(dbContext);
        await dbContext.SaveChangesAsync();

        var tier = await new MembershipService(dbContext).ResolveTierAsync(
            eligibleSpend,
            CancellationToken.None);

        Assert.Equal(expectedName, tier.Name);
        Assert.Equal(expectedMaxBooks, tier.MaxBooks);
        Assert.Equal(expectedMaxRentalDays, tier.MaxRentalDays);
        Assert.Equal(expectedDiscountPct, tier.SaleDiscountPct);
        Assert.Equal(expectedDiscountPct, tier.RentDiscountPct);
    }

    [Fact]
    public async Task RecalculateCustomerTierAsync_downgrades_a_customer_when_eligible_spend_decreases()
    {
        await using var dbContext = CreateDbContext();
        var policies = AddPolicies(dbContext);
        var customer = new CustomerModel
        {
            FullName = "Khách thử nghiệm",
            Phone = "0900000000",
            EligibleSpend = 2_999_999L,
            TierId = policies[MembershipTierName.GOLD].Id
        };
        dbContext.Customers.Add(customer);
        await dbContext.SaveChangesAsync();

        var tier = await new MembershipService(dbContext).RecalculateCustomerTierAsync(customer.Id);

        Assert.Equal(MembershipTierName.SILVER, tier.Name);
        Assert.Equal(policies[MembershipTierName.SILVER].Id, customer.TierId);
    }

    private static AppDbContext CreateDbContext()
        => new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options);

    private static Dictionary<MembershipTierName, MembershipTierModel> AddPolicies(AppDbContext dbContext)
    {
        var tiers = new[]
        {
            new MembershipTierModel
            {
                Name = MembershipTierName.REGULAR,
                RankOrder = 1,
                MinSpend = 0,
                MaxBooks = 3,
                MaxRentalDays = 14,
                SaleDiscountPct = 0,
                RentDiscountPct = 0
            },
            new MembershipTierModel
            {
                Name = MembershipTierName.SILVER,
                RankOrder = 2,
                MinSpend = 1_000_000,
                MaxBooks = 5,
                MaxRentalDays = 21,
                SaleDiscountPct = 5,
                RentDiscountPct = 5
            },
            new MembershipTierModel
            {
                Name = MembershipTierName.GOLD,
                RankOrder = 3,
                MinSpend = 3_000_000,
                MaxBooks = 8,
                MaxRentalDays = 30,
                SaleDiscountPct = 10,
                RentDiscountPct = 10
            }
        };

        dbContext.MembershipTiers.AddRange(tiers);
        return tiers.ToDictionary(tier => tier.Name);
    }
}
