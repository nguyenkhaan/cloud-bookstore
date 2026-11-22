using System.Text.Json;
using backend.src.Data;
using backend.src.Dto.Settings;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace backend.Tests.Services;

public sealed class SystemSettingsAuditTests
{
    private static AppDbContext CreateDb() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private static SystemSettingsService Service(AppDbContext db) => new(db, new FixedTime(), new EphemeralDataProtectionProvider(), new(db));
    private sealed class FixedTime : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(2026, 11, 20, 12, 0, 0, TimeSpan.Zero);
    }

    [Fact]
    public async Task Rental_changes_keep_each_before_after_actor_reason_and_immediate_effective_time()
    {
        await using var db = CreateDb();
        var service = Service(db);
        var actor = Guid.NewGuid();
        await service.UpdateRentalPolicyAsync(new(3, 8, 1, 170, null, "first change"), actor);
        await service.UpdateRentalPolicyAsync(new(4, 9, 2, 180, null, "second change"), actor);
        var logs = await db.AuditLogs.ToListAsync();
        Assert.Equal(2, logs.Count);
        Assert.All(logs, log => {
            Assert.Equal(actor, log.ActorId);
            Assert.Equal(new FixedTime().GetUtcNow().UtcDateTime, log.OccurredAt);
            using var after = JsonDocument.Parse(log.AfterData!);
            Assert.Equal(log.OccurredAt, after.RootElement.GetProperty("effectiveAt").GetDateTime());
        });
        var second = Assert.Single(logs, log => log.Reason == "second change");
        using var beforeData = JsonDocument.Parse(second.BeforeData!);
        using var afterData = JsonDocument.Parse(second.AfterData!);
        Assert.Equal(3, beforeData.RootElement.GetProperty("config").GetProperty("maxExtensions").GetInt32());
        Assert.Equal(4, afterData.RootElement.GetProperty("config").GetProperty("maxExtensions").GetInt32());
    }

    [Fact]
    public async Task Membership_history_contains_changed_tier_values()
    {
        await using var db = CreateDb();
        db.MembershipTiers.Add(new MembershipTierModel { Name = MembershipTierName.REGULAR, RankOrder = 1, MaxBooks = 3, MaxRentalDays = 14 });
        await db.SaveChangesAsync();
        var item = (await Service(db).GetMembershipPolicyAsync()).Tiers[0] with { MaxBooks = 5 };
        await Service(db).UpdateMembershipPolicyAsync(new([item], "more books"), null);
        var log = Assert.Single(await db.AuditLogs.ToListAsync());
        using var before = JsonDocument.Parse(log.BeforeData!);
        using var after = JsonDocument.Parse(log.AfterData!);
        Assert.Equal(3, before.RootElement.GetProperty("config").GetProperty("tiers")[0].GetProperty("maxBooks").GetInt32());
        Assert.Equal(5, after.RootElement.GetProperty("config").GetProperty("tiers")[0].GetProperty("maxBooks").GetInt32());
    }

    [Fact]
    public async Task Secret_history_is_masked_and_marks_which_secret_changed()
    {
        await using var db = CreateDb();
        var service = Service(db);
        var initial = await service.GetIntegrationsAsync();
        await service.UpdateIntegrationsAsync(new(Smtp: initial.Smtp with { Password = "private-test-password" }, ChangeReason: "rotate SMTP"), null);
        var log = Assert.Single(await db.AuditLogs.ToListAsync());
        Assert.DoesNotContain("private-test-password", log.BeforeData + log.AfterData);
        Assert.Contains("********", log.AfterData);
        using var data = JsonDocument.Parse(log.AfterData!);
        Assert.Contains(data.RootElement.GetProperty("changedSecrets").EnumerateArray(), x => x.GetString() == "smtp.password");
        var history = await service.GetHistoryAsync("integrations");
        Assert.Single(history);
        Assert.Equal(log.OccurredAt, history[0].EffectiveAt);
        await Assert.ThrowsAsync<backend.src.Exceptions.BadRequestException>(() => service.GetHistoryAsync("unknown"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Empty_reason_never_writes_settings_or_audit(string reason)
    {
        await using var db = CreateDb();
        await Assert.ThrowsAsync<backend.src.Exceptions.BadRequestException>(() => Service(db).UpdateRentalPolicyAsync(new(3, 8, 1, 170, null, reason), null));
        Assert.False(db.ChangeTracker.HasChanges());
    }

    [Fact]
    public async Task Save_failure_cannot_persist_config_without_its_audit()
    {
        var database = Guid.NewGuid().ToString();
        var interceptor = new FailingAuditSave();
        await using (var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(database).AddInterceptors(interceptor).Options))
        {
            await Assert.ThrowsAsync<InvalidOperationException>(() => Service(db).UpdateRentalPolicyAsync(new(3, 8, 1, 170, null, "will fail"), null));
            Assert.Equal(1, interceptor.SaveCalls);
        }
        await using var verify = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(database).Options);
        Assert.Empty(await verify.SystemSettings.ToListAsync());
        Assert.Empty(await verify.AuditLogs.ToListAsync());
    }

    private sealed class FailingAuditSave : Microsoft.EntityFrameworkCore.Diagnostics.SaveChangesInterceptor
    {
        public int SaveCalls { get; private set; }
        public override ValueTask<Microsoft.EntityFrameworkCore.Diagnostics.InterceptionResult<int>> SavingChangesAsync(
            Microsoft.EntityFrameworkCore.Diagnostics.DbContextEventData eventData,
            Microsoft.EntityFrameworkCore.Diagnostics.InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            SaveCalls++;
            Assert.Contains(eventData.Context!.ChangeTracker.Entries<AuditLogModel>(), e => e.State == EntityState.Added);
            throw new InvalidOperationException("simulate failed commit");
        }
    }
}
