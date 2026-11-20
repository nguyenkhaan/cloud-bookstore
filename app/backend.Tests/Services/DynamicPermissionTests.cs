using System.Security.Claims;
using backend.src.Configurations;
using backend.src.Controllers;
using backend.src.Data;
using backend.src.Dto.Settings;
using backend.src.Exceptions;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace backend.Tests.Services;

public sealed class DynamicPermissionTests
{
    [Fact]
    public async Task Actual_controller_policy_honors_grant_and_revoke_for_existing_session()
    {
        var services = new ServiceCollection().AddLogging();
        services.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase(Guid.NewGuid().ToString()));
        services.AddDataProtection();
        services.AddSingleton(TimeProvider.System);
        services.AddScoped<RolePermissionService>();
        services.AddScoped<SystemSettingsService>();
        services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();
        services.AddAuthorization(o => o.AddPolicy(PermissionAttribute.PolicyName,
            p => p.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement())));
        await using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var settings = scope.ServiceProvider.GetRequiredService<SystemSettingsService>();
        var authorization = scope.ServiceProvider.GetRequiredService<IAuthorizationService>();
        var policyProvider = scope.ServiceProvider.GetRequiredService<IAuthorizationPolicyProvider>();
        var action = typeof(BookTitlesController).GetMethod(nameof(BookTitlesController.CreateTitle))!;
        var policy = await AuthorizationPolicy.CombineAsync(policyProvider, action.GetCustomAttributes(true).OfType<IAuthorizeData>());
        var http = new DefaultHttpContext();
        http.SetEndpoint(new Endpoint(_ => Task.CompletedTask, new EndpointMetadataCollection(new ControllerActionDescriptor
            { ControllerName = "BookTitles", ActionName = "CreateTitle" }), "create title"));
        var user = new ClaimsPrincipal(new ClaimsIdentity([new Claim("role", "CASHIER")], "test", "name", "role"));
        async Task<bool> Allowed() => (await authorization.AuthorizeAsync(user, http, policy!)).Succeeded;
        Assert.False(await Allowed());
        var matrix = await settings.GetRbacMatrixAsync();
        var granted = matrix.Items.Select(x => x.PermissionCode == "BookTitles.CreateTitle" ? x with { CashierAllowed = true } : x).ToArray();
        await settings.UpdateRbacMatrixAsync(new(granted, "allow title creation"), null);
        Assert.True(await Allowed());
        await settings.UpdateRbacMatrixAsync(new(matrix.Items, "revoke title creation"), null);
        Assert.False(await Allowed());
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var events = await db.AuditLogs.Where(x => x.Action == "SETTINGS_RBAC_UPDATED").ToListAsync();
        Assert.Equal(2, events.Count);
        Assert.Contains("\"cashierAllowed\":true", events.Single(x => x.Reason == "allow title creation").AfterData);
        Assert.Contains("\"cashierAllowed\":false", events.Single(x => x.Reason == "revoke title creation").AfterData);
        Assert.False(await new RolePermissionService(scope.ServiceProvider.GetRequiredService<AppDbContext>()).IsAllowedAsync("BookTitles.CreateTitle", "MANAGER"));
    }

    [Fact]
    public async Task Protected_permissions_unknown_missing_and_duplicate_grants_are_rejected_without_changes()
    {
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var service = new SystemSettingsService(db, TimeProvider.System, new EphemeralDataProtectionProvider(), new(db));
        var items = (await service.GetRbacMatrixAsync()).Items;
        Assert.NotEmpty(items);
        Assert.Contains(items, x => x.PermissionCode == "Settings.UpdateRbacMatrix" && x.AdminOnly);
        var locked = items.First(x => x.AdminOnly);
        var invalid = new[] {
            items.Where(x => x != locked).ToArray(),
            items.Select(x => x == locked ? x with { CashierAllowed = true } : x).ToArray(),
            items.Select(x => x == locked ? x with { AdminAllowed = false } : x).ToArray(),
            items.Select(x => x == locked ? x with { PermissionCode = "unknown" } : x).ToArray(),
            items.Select(x => x == locked ? items.First(x => x != locked) : x).ToArray()
        };
        foreach (var grants in invalid)
            await Assert.ThrowsAsync<BadRequestException>(() => service.UpdateRbacMatrixAsync(new(grants, "invalid"), null));
        Assert.False(db.ChangeTracker.HasChanges());
        Assert.Empty(await db.AuditLogs.ToListAsync());
    }

    [Fact]
    public async Task Corrupted_persisted_permissions_never_fall_back_to_allowed_defaults()
    {
        foreach (var raw in new[] { "[]", "null", "{broken" })
        {
            await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
            db.SystemSettings.Add(new backend.src.Models.SystemSettingModel { Key = RolePermissionService.SettingKey, Description = raw });
            await db.SaveChangesAsync();
            await Assert.ThrowsAnyAsync<Exception>(() => new RolePermissionService(db).IsAllowedAsync("BookTitles.GetTitles", "CASHIER"));
        }
    }

    [Fact]
    public async Task Missing_stored_grants_deny_access_but_preserve_admin_recovery()
    {
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var oneRow = RolePermissionService.Defaults.First(x => x.AdminOnly);
        db.SystemSettings.Add(new backend.src.Models.SystemSettingModel {
            Key = RolePermissionService.SettingKey,
            Description = System.Text.Json.JsonSerializer.Serialize(new[] { oneRow }, new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web))
        });
        await db.SaveChangesAsync();
        var service = new RolePermissionService(db);
        Assert.False(await service.IsAllowedAsync("BookTitles.GetTitles", "CASHIER"));
        Assert.True(await service.IsAllowedAsync("Settings.UpdateRbacMatrix", "ADMIN"));
    }
}
