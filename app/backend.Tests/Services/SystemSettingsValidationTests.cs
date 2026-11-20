using System.Reflection;
using backend.src.Controllers;
using backend.src.Data;
using backend.src.Dto.Settings;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace backend.Tests.Services;

public sealed class SystemSettingsValidationTests
{
    public static IEnumerable<object[]> InvalidTiers()
    {
        var tier = ValidTier("SILVER");
        yield return [null!];
        yield return [tier with { MinSpend = -1 }];
        yield return [tier with { RentDiscountPct = -0.01m }];
        yield return [tier with { RentDiscountPct = 100.01m }];
        yield return [tier with { SaleDiscountPct = -0.01m }];
        yield return [tier with { SaleDiscountPct = 100.01m }];
        yield return [tier with { MaxBooks = 0 }];
        yield return [tier with { MaxBooks = -1 }];
        yield return [tier with { MaxRentalDays = 0 }];
        yield return [tier with { MaxRentalDays = -1 }];
        foreach (var name in new[] { "UNKNOWN", "", " ", "0", "1", "2", "999", "-1", "+1", "REGULAR, GOLD" })
            yield return [tier with { Name = name }];
        yield return [tier with { Name = null! }];
        yield return [tier with { Name = "regular" }];
    }

    [Theory]
    [MemberData(nameof(InvalidTiers))]
    public async Task UpdateMembershipPolicy_rejects_invalid_batch_without_partial_changes(MembershipTierItemDto invalid)
    {
        await using var db = CreateDbContext();
        await SeedAsync(db);
        var service = new SystemSettingsService(db, TimeProvider.System, new EphemeralDataProtectionProvider(), new(db));
        var before = await service.GetMembershipPolicyAsync();
        var request = new UpdateMembershipPolicyRequest([ValidTier("REGULAR"), invalid], "new reason");

        await Assert.ThrowsAsync<BadRequestException>(() => service.UpdateMembershipPolicyAsync(request, Guid.NewGuid()));

        Assert.False(db.ChangeTracker.HasChanges());
        Assert.Equal(0, await db.SaveChangesAsync());
        db.ChangeTracker.Clear();
        var after = await service.GetMembershipPolicyAsync();
        Assert.Equal(before.Tiers.ToArray(), after.Tiers.ToArray());
        Assert.Equal(before.ChangeReason, after.ChangeReason);
        Assert.Equal(before.LastUpdatedAt, after.LastUpdatedAt);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task UpdateMembershipPolicy_rejects_empty_tiers(bool nullTiers)
    {
        await using var db = CreateDbContext();
        var service = new SystemSettingsService(db, TimeProvider.System, new EphemeralDataProtectionProvider(), new(db));
        var request = new UpdateMembershipPolicyRequest(nullTiers ? null! : [], "reason");

        await Assert.ThrowsAsync<BadRequestException>(() => service.UpdateMembershipPolicyAsync(request, null));
        Assert.False(db.ChangeTracker.HasChanges());
        Assert.Empty(await db.SystemSettings.ToListAsync());
    }

    [Theory]
    [InlineData(0, 100)]
    [InlineData(100, 0)]
    public async Task UpdateMembershipPolicy_accepts_boundaries_and_case_insensitive_names(int rentDiscount, int saleDiscount)
    {
        await using var db = CreateDbContext();
        await SeedAsync(db);
        var actor = Guid.NewGuid();
        var tier = ValidTier("silver") with
        {
            MinSpend = 0,
            MaxBooks = 1,
            MaxRentalDays = short.MaxValue,
            RentDiscountPct = rentDiscount,
            SaleDiscountPct = saleDiscount
        };
        var service = new SystemSettingsService(db, TimeProvider.System, new EphemeralDataProtectionProvider(), new(db));

        var result = await service.UpdateMembershipPolicyAsync(new([tier], "updated reason"), actor);

        var updated = Assert.Single(result.Tiers, t => t.Name == "SILVER");
        Assert.Equal(tier.MinSpend, updated.MinSpend);
        Assert.Equal(tier.MaxBooks, updated.MaxBooks);
        Assert.Equal(tier.MaxRentalDays, updated.MaxRentalDays);
        Assert.Equal(tier.RentDiscountPct, updated.RentDiscountPct);
        Assert.Equal(tier.SaleDiscountPct, updated.SaleDiscountPct);
        Assert.Equal("updated reason", result.ChangeReason);
        Assert.Equal(actor, (await db.SystemSettings.SingleAsync()).UpdatedBy);
        Assert.Equal(3, result.Tiers.Count);
    }

    [Fact]
    public void GetRbacMatrix_requires_only_admin()
    {
        var method = typeof(SettingsController).GetMethod(nameof(SettingsController.GetRbacMatrix))!;
        var authorize = Assert.Single(method.GetCustomAttributes<AuthorizeAttribute>());

        Assert.Equal(nameof(RoleName.ADMIN), authorize.Roles);
        Assert.Empty(method.GetCustomAttributes<AllowAnonymousAttribute>());
    }

    private static MembershipTierItemDto ValidTier(string name)
        => new(name, name, 1, 123, null, 4, 15, 5m, 10m, "");

    private static AppDbContext CreateDbContext()
        => new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N")).Options);

    private static async Task SeedAsync(AppDbContext db)
    {
        foreach (var name in Enum.GetValues<MembershipTierName>())
            db.MembershipTiers.Add(new MembershipTierModel
            {
                Name = name,
                RankOrder = (short)((int)name + 1),
                MinSpend = (int)name * 1_000_000L,
                MaxBooks = 3,
                MaxRentalDays = 14
            });
        db.SystemSettings.Add(new SystemSettingModel
        {
            Key = "membership.last_change_reason",
            Description = "original reason"
        });
        await db.SaveChangesAsync();
    }
}
