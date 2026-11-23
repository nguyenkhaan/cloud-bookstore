using System.Security.Cryptography;
using System.Text.Json;
using backend.src.Data;
using backend.src.Dto.Settings;
using backend.src.Models;
using backend.src.Services;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace backend.Tests.Services;

public sealed class SystemSettingsSecretsTests
{
    private const string Purpose = "CloudBookstore.SystemSettings.Integrations.v1";
    private const string Prefix = "dp:v1:";
    private const string Mask = "********";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly IntegrationsConfigDto Config = new(
        new("bank", "account", "holder", "vietqr-api", "vietqr-checksum", 15, "https://example.com", "ready"),
        new("app", "oa", "zalo-secret", "zalo-token", "payment", "due", "overdue", "deposit", "daily", "ready"),
        new("Google", "google-key", "https://openlibrary.org", "ready"),
        new("smtp.example.com", 587, "STARTTLS", "sender@example.com", "smtp-password", "ready"),
        null, null, "reason");

    [Fact]
    public async Task Legacy_get_masks_all_secrets_without_writing()
    {
        await using var db = CreateDb();
        var json = JsonSerializer.Serialize(Config, JsonOptions);
        await Seed(db, json);

        AssertMasked(await CreateService(db).GetIntegrationsAsync());
        Assert.Equal(json, (await db.SystemSettings.SingleAsync()).Description);
    }

    [Fact]
    public async Task Put_encrypts_all_secrets_and_returns_masked_config()
    {
        await using var db = CreateDb();
        var provider = new EphemeralDataProtectionProvider();
        var service = CreateService(db, provider);

        var result = await service.UpdateIntegrationsAsync(new(Config.VietQr, Config.ZaloOa, Config.BookMetadata, Config.Smtp, "saved"), null);

        AssertMasked(result);
        AssertMasked(await CreateService(db, provider).GetIntegrationsAsync());
        var raw = (await db.SystemSettings.SingleAsync(s => s.Key == "integrations.config_json")).Description!;
        Assert.StartsWith(Prefix, raw);
        foreach (var secret in Secrets(Config)) Assert.DoesNotContain(secret, raw);
        var stored = Decode(raw, provider);
        Assert.Equal(Secrets(Config), Secrets(stored));
        Assert.Equal("saved", stored.ChangeReason);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("••••••••••••••••")]
    [InlineData("********")]
    [InlineData(null)]
    public async Task Blank_or_masked_values_preserve_all_existing_secrets(string? placeholder)
    {
        await using var db = CreateDb();
        await Seed(db, JsonSerializer.Serialize(Config, JsonOptions));
        var provider = new EphemeralDataProtectionProvider();
        var service = CreateService(db, provider);
        var result = await service.UpdateIntegrationsAsync(new(
            Config.VietQr with { ApiKey = placeholder!, ChecksumSecret = placeholder! },
            Config.ZaloOa with { SecretKey = placeholder!, AccessToken = placeholder! },
            Config.BookMetadata with { GoogleBooksApiKey = placeholder! },
            Config.Smtp with { Password = placeholder!, Host = "changed.example.com" }, "updated"), null);

        AssertMasked(result);
        var stored = Decode((await db.SystemSettings.SingleAsync(s => s.Key == "integrations.config_json")).Description!, provider);
        Assert.Equal(Secrets(Config), Secrets(stored));
        Assert.Equal("changed.example.com", stored.Smtp.Host);
    }

    [Fact]
    public async Task Omitted_sections_preserve_raw_secrets_and_new_secret_replaces_old()
    {
        await using var db = CreateDb();
        var provider = new EphemeralDataProtectionProvider();
        await Seed(db, Prefix + provider.CreateProtector(Purpose).Protect(JsonSerializer.Serialize(Config, JsonOptions)));
        var result = await CreateService(db, provider).UpdateIntegrationsAsync(new(null, null, null,
            Config.Smtp with { Password = "replacement" }, "updated"), null);

        AssertMasked(result);
        var stored = Decode((await db.SystemSettings.SingleAsync(s => s.Key == "integrations.config_json")).Description!, provider);
        Assert.Equal(Secrets(Config)[..5], Secrets(stored)[..5]);
        Assert.Equal("replacement", stored.Smtp.Password);
    }

    [Theory]
    [InlineData("dp:v1:corrupted")]
    [InlineData("{broken-json")]
    [InlineData("null")]
    [InlineData("")]
    public async Task Unreadable_config_fails_without_overwrite(string raw)
    {
        await using var db = CreateDb();
        await Seed(db, raw);
        var service = CreateService(db);
        await Assert.ThrowsAnyAsync<Exception>(() => service.GetIntegrationsAsync());
        await Assert.ThrowsAnyAsync<Exception>(() => service.UpdateIntegrationsAsync(new(null, null, null, null, "update"), null));
        Assert.False(db.ChangeTracker.HasChanges());
        Assert.Equal(raw, (await db.SystemSettings.SingleAsync()).Description);
    }

    [Fact]
    public async Task Missing_key_fails_get_and_put_without_overwrite()
    {
        await using var db = CreateDb();
        var raw = Prefix + new EphemeralDataProtectionProvider().CreateProtector(Purpose).Protect(JsonSerializer.Serialize(Config, JsonOptions));
        await Seed(db, raw);
        var service = CreateService(db);
        await Assert.ThrowsAsync<CryptographicException>(() => service.GetIntegrationsAsync());
        await Assert.ThrowsAsync<CryptographicException>(() => service.UpdateIntegrationsAsync(new(null, null, null, null, "update"), null));
        Assert.False(db.ChangeTracker.HasChanges());
        Assert.Equal(raw, (await db.SystemSettings.SingleAsync()).Description);
    }

    [Fact]
    public async Task First_save_does_not_turn_demo_masks_into_credentials()
    {
        await using var db = CreateDb();
        var provider = new EphemeralDataProtectionProvider();
        var service = CreateService(db, provider);
        var defaults = await service.GetIntegrationsAsync();
        var result = await service.UpdateIntegrationsAsync(new(
            defaults.VietQr with { ApiKey = "••••••••••••••••", ChecksumSecret = "********" },
            defaults.ZaloOa with { SecretKey = "••••••••••••••••", AccessToken = new string('•', 32) },
            defaults.BookMetadata with { GoogleBooksApiKey = "********" },
            defaults.Smtp with { Password = "••••••••••••••••" }, "first save"), null);

        Assert.All(Secrets(result), secret => Assert.Empty(secret));
        var stored = Decode((await db.SystemSettings.SingleAsync(s => s.Key == "integrations.config_json")).Description!, provider);
        Assert.All(Secrets(stored), secret => Assert.Empty(secret));
    }

    [Fact]
    public async Task Shared_persistent_key_ring_can_read_after_provider_restart()
    {
        var directory = Directory.CreateTempSubdirectory("settings-secrets-");
        try
        {
            await using var db = CreateDb();
            var provider = DataProtectionProvider.Create(directory, options => options.SetApplicationName("CloudBookstore"));
            await CreateService(db, provider).UpdateIntegrationsAsync(new(Config.VietQr, Config.ZaloOa, Config.BookMetadata, Config.Smtp, "saved"), null);

            var restarted = DataProtectionProvider.Create(directory, options => options.SetApplicationName("CloudBookstore"));
            AssertMasked(await CreateService(db, restarted).GetIntegrationsAsync());
            await CreateService(db, restarted).UpdateIntegrationsAsync(new(null, null, null, null, "after restart"), null);
            var stored = Decode((await db.SystemSettings.SingleAsync(s => s.Key == "integrations.config_json")).Description!, restarted);
            Assert.Equal(Secrets(Config), Secrets(stored));
        }
        finally
        {
            directory.Delete(recursive: true);
        }
    }

    [Fact]
    public async Task Null_legacy_sections_and_omitted_request_sections_are_supported()
    {
        await using var db = CreateDb();
        await Seed(db, JsonSerializer.Serialize(Config with { VietQr = null!, ZaloOa = null!, BookMetadata = null!, Smtp = null! }, JsonOptions));
        var service = CreateService(db);
        Assert.All(Secrets(await service.GetIntegrationsAsync()), secret => Assert.Empty(secret));
        Assert.All(Secrets(await service.UpdateIntegrationsAsync(new(null, null, null, null, "saved"), null)), secret => Assert.Empty(secret));
    }

    private static string[] Secrets(IntegrationsConfigDto config) =>
        [config.VietQr.ApiKey, config.VietQr.ChecksumSecret, config.ZaloOa.SecretKey,
         config.ZaloOa.AccessToken, config.BookMetadata.GoogleBooksApiKey, config.Smtp.Password];

    private static void AssertMasked(IntegrationsConfigDto config)
    {
        foreach (var secret in Secrets(config)) Assert.Equal(Mask, secret);
    }

    private static IntegrationsConfigDto Decode(string raw, IDataProtectionProvider provider) =>
        JsonSerializer.Deserialize<IntegrationsConfigDto>(provider.CreateProtector(Purpose).Unprotect(raw[Prefix.Length..]), JsonOptions)!;

    private static SystemSettingsService CreateService(AppDbContext db, IDataProtectionProvider? provider = null)
        => new(db, TimeProvider.System, provider ?? new EphemeralDataProtectionProvider(), new(db));

    private static AppDbContext CreateDb() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString("N")).Options);

    private static async Task Seed(AppDbContext db, string raw)
    {
        db.SystemSettings.Add(new SystemSettingModel { Key = "integrations.config_json", Description = raw });
        await db.SaveChangesAsync();
    }
}
