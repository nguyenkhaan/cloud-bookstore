using System.Text.Json;
using backend.src.Data;
using backend.src.Dto.Settings;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.DataProtection;

namespace backend.src.Services;

public sealed class SystemSettingsService(AppDbContext dbContext, TimeProvider timeProvider, IDataProtectionProvider dataProtectionProvider, RolePermissionService permissions)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private const string ProtectedConfigPrefix = "dp:v1:";
    private const string SecretMask = "********";
    private readonly IDataProtector integrationProtector = dataProtectionProvider.CreateProtector("CloudBookstore.SystemSettings.Integrations.v1");

    #region Default Data
    private static readonly IReadOnlyList<DamagePenaltyConfigDto> DefaultDamagePenalties =
    [
        new("Mất bìa / Rách bìa nhẹ", 20m, "Giá bán thực tế cuốn", "Trừ cọc khi quyết toán"),
        new("Vẽ bẩn / Ố vàng trang", 40m, "Giá bán thực tế cuốn", "Trừ cọc khi quyết toán"),
        new("Rách nát nhiều trang / Ướt", 70m, "Giá bán thực tế cuốn", "Trừ cọc khi quyết toán"),
        new("Mất sách", 100m, "Tiền cọc cuốn mất", "Chuyển doanh thu bán; không tính thuê / trễ")
    ];

    #endregion

    #region SCR-SYS-01: Rental Policy
    public async Task<RentalPolicyConfigDto> GetRentalPolicyAsync(CancellationToken cancellationToken = default)
    {
        var settings = await dbContext.SystemSettings
            .AsNoTracking()
            .Where(s => s.Key.StartsWith("rental."))
            .ToDictionaryAsync(s => s.Key, cancellationToken);

        var maxExt = settings.TryGetValue("rental.max_extensions", out var s1) ? (short)s1.Value : (short)2;
        var extDays = settings.TryGetValue("rental.extension_days", out var s2) ? (short)s2.Value : (short)7;
        var graceHours = settings.TryGetValue("rental.grace_hours", out var s3) ? (short)s3.Value : (short)2;
        var latePenaltyRate = settings.TryGetValue("rental.late_rate_pct", out var s4) ? s4.Value : 150m;
        var depositRate = settings.TryGetValue("rental.deposit_rate_pct", out var s5) ? s5.Value : 100m;
        var policyVersion = settings.TryGetValue("rental.policy_version", out var s6) && !string.IsNullOrWhiteSpace(s6.Description) ? s6.Description : "POL-008";
        var changeReason = settings.TryGetValue("rental.last_change_reason", out var s7) ? s7.Description : "Áp dụng thống nhất chính sách thuê và khung phạt đã công bố.";

        var lastUpdated = settings.Values.OrderByDescending(s => s.UpdatedAt).FirstOrDefault()?.UpdatedAt ?? new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc);

        var damagePenalties = DefaultDamagePenalties;
        if (settings.TryGetValue("rental.damage_penalties_json", out var s8) && !string.IsNullOrWhiteSpace(s8.Description))
        {
            try
            {
                var parsed = JsonSerializer.Deserialize<List<DamagePenaltyConfigDto>>(s8.Description, JsonOptions);
                if (parsed != null && parsed.Count > 0) damagePenalties = parsed;
            }
            catch { /* fallback to default */ }
        }

        return new RentalPolicyConfigDto(
            depositRate,
            maxExt,
            extDays,
            "Khi trả & Quyết toán",
            graceHours,
            latePenaltyRate,
            damagePenalties,
            policyVersion,
            lastUpdated,
            await ActorNameAsync(settings.Values.OrderByDescending(s => s.UpdatedAt).FirstOrDefault()?.UpdatedBy, cancellationToken),
            changeReason
        );
    }

    public async Task<RentalPolicyConfigDto> UpdateRentalPolicyAsync(
        UpdateRentalPolicyRequest request,
        Guid? actorId,
        CancellationToken cancellationToken = default)
    {
        ValidateReason(request.ChangeReason);
        var before = await GetRentalPolicyAsync(cancellationToken);
        var now = timeProvider.GetUtcNow().UtcDateTime;

        await UpsertSettingAsync("rental.max_extensions", request.MaxExtensions, "times", "Số lần gia hạn tối đa", actorId, now, cancellationToken);
        await UpsertSettingAsync("rental.extension_days", request.ExtensionDaysPerTime, "days", "Số ngày gia hạn mỗi lần", actorId, now, cancellationToken);
        await UpsertSettingAsync("rental.grace_hours", request.GracePeriodHours, "hours", "Khung giờ miễn phạt", actorId, now, cancellationToken);
        await UpsertSettingAsync("rental.late_rate_pct", request.LatePenaltyRatePct, "%", "Hệ số phạt trả trễ", actorId, now, cancellationToken);
        await UpsertSettingAsync("rental.last_change_reason", 0m, null, request.ChangeReason, actorId, now, cancellationToken);

        if (request.DamagePenalties != null && request.DamagePenalties.Count > 0)
        {
            var json = JsonSerializer.Serialize(request.DamagePenalties, JsonOptions);
            await UpsertSettingAsync("rental.damage_penalties_json", 0m, "json", json, actorId, now, cancellationToken);
        }

        AddAudit("rental", before, before with {
            MaxExtensions = request.MaxExtensions, ExtensionDaysPerTime = request.ExtensionDaysPerTime,
            GracePeriodHours = request.GracePeriodHours, LatePenaltyRatePct = request.LatePenaltyRatePct,
            DamagePenalties = request.DamagePenalties is { Count: > 0 } ? request.DamagePenalties : before.DamagePenalties,
            LastUpdatedAt = now, ChangeReason = request.ChangeReason.Trim()
        }, actorId, now, request.ChangeReason);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetRentalPolicyAsync(cancellationToken);
    }
    #endregion

    #region SCR-SYS-02: Membership Policy
    public async Task<MembershipPolicyConfigDto> GetMembershipPolicyAsync(CancellationToken cancellationToken = default)
    {
        var tiers = await dbContext.MembershipTiers
            .AsNoTracking()
            .OrderBy(t => t.RankOrder)
            .ToListAsync(cancellationToken);

        var list = new List<MembershipTierItemDto>();
        for (int i = 0; i < tiers.Count; i++)
        {
            var tier = tiers[i];
            long? nextMinSpend = i + 1 < tiers.Count ? tiers[i + 1].MinSpend : null;
            string displayName = tier.Name switch
            {
                MembershipTierName.REGULAR => "Normal · Hạng Thường",
                MembershipTierName.SILVER => "Silver · Hạng Bạc",
                MembershipTierName.GOLD => "Gold · Hạng Vàng",
                _ => tier.Name.ToString()
            };
            string desc = tier.Name switch
            {
                MembershipTierName.REGULAR => "",
                MembershipTierName.SILVER => "",
                MembershipTierName.GOLD => "",
                _ => string.Empty
            };

            list.Add(new MembershipTierItemDto(
                tier.Name.ToString(),
                displayName,
                tier.RankOrder,
                tier.MinSpend,
                nextMinSpend,
                tier.MaxBooks,
                tier.MaxRentalDays,
                tier.RentDiscountPct,
                tier.SaleDiscountPct,
                desc
            ));
        }

        var reasonSetting = await dbContext.SystemSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == "membership.last_change_reason", cancellationToken);

        return new MembershipPolicyConfigDto(
            list,
            reasonSetting?.UpdatedAt ?? new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc),
            await ActorNameAsync(reasonSetting?.UpdatedBy, cancellationToken),
            reasonSetting?.Description ?? "Áp dụng ngưỡng liên tục và quyền lợi chiết khấu theo phân hạng thành viên."
        );
    }

    public async Task<MembershipPolicyConfigDto> UpdateMembershipPolicyAsync(
        UpdateMembershipPolicyRequest request,
        Guid? actorId,
        CancellationToken cancellationToken = default)
    {
        ValidateReason(request.ChangeReason);
        if (request.Tiers == null || request.Tiers.Count == 0)
            throw new backend.src.Exceptions.BadRequestException("Danh sách phân hạng thành viên không được rỗng.");

        var tierNames = new HashSet<MembershipTierName>();
        foreach (var item in request.Tiers)
        {
            if (item == null || !Enum.TryParse<MembershipTierName>(item.Name, true, out var tierName)
                || !Enum.IsDefined(tierName)
                || !string.Equals(item.Name, tierName.ToString(), StringComparison.OrdinalIgnoreCase))
                throw new backend.src.Exceptions.BadRequestException("Tên hạng thành viên không hợp lệ.");

            if (!tierNames.Add(tierName))
                throw new backend.src.Exceptions.BadRequestException("Danh sách hạng thành viên không được trùng lặp.");

            if (item.MinSpend < 0 || item.MaxBooks <= 0 || item.MaxRentalDays <= 0
                || item.RentDiscountPct is < 0 or > 100 || item.SaleDiscountPct is < 0 or > 100)
                throw new backend.src.Exceptions.BadRequestException("Tham số chính sách thành viên không hợp lệ.");
        }

        var before = await GetMembershipPolicyAsync(cancellationToken);
        var now = timeProvider.GetUtcNow().UtcDateTime;

        foreach (var item in request.Tiers)
        {
            var tierName = Enum.Parse<MembershipTierName>(item.Name, true);

            var existing = await dbContext.MembershipTiers.FirstOrDefaultAsync(t => t.Name == tierName, cancellationToken);
            if (existing != null)
            {
                existing.MinSpend = item.MinSpend;
                existing.MaxBooks = item.MaxBooks;
                existing.MaxRentalDays = item.MaxRentalDays;
                existing.RentDiscountPct = item.RentDiscountPct;
                existing.SaleDiscountPct = item.SaleDiscountPct;
            }
        }

        await UpsertSettingAsync("membership.last_change_reason", 0m, null, request.ChangeReason, actorId, now, cancellationToken);
        var tiers = dbContext.MembershipTiers.Local.OrderBy(x => x.RankOrder).Select(t => {
            var old = before.Tiers.Single(x => x.Name == t.Name.ToString());
            return old with { MinSpend = t.MinSpend, MaxBooks = t.MaxBooks, MaxRentalDays = t.MaxRentalDays,
                RentDiscountPct = t.RentDiscountPct, SaleDiscountPct = t.SaleDiscountPct };
        }).ToArray();
        var changed = before.Tiers.Select(t => tiers.SingleOrDefault(x => x.Name == t.Name) ?? t).ToArray();
        for (var i = 0; i < changed.Length; i++) changed[i] = changed[i] with { MaxSpend = i + 1 < changed.Length ? changed[i + 1].MinSpend : null };
        AddAudit("membership", before, before with { Tiers = changed, LastUpdatedAt = now, ChangeReason = request.ChangeReason.Trim() }, actorId, now, request.ChangeReason);
        await dbContext.SaveChangesAsync(cancellationToken);

        return await GetMembershipPolicyAsync(cancellationToken);
    }
    #endregion

    #region SCR-SYS-03: RBAC Matrix
    public async Task<RbacMatrixConfigDto> GetRbacMatrixAsync(CancellationToken cancellationToken = default)
    {
        var reason = await dbContext.SystemSettings.AsNoTracking()
            .SingleOrDefaultAsync(s => s.Key == "rbac.last_change_reason", cancellationToken);
        return new(await permissions.GetItemsAsync(cancellationToken), reason?.UpdatedAt,
            await ActorNameAsync(reason?.UpdatedBy, cancellationToken), reason?.Description);
    }

    public async Task<RbacMatrixConfigDto> UpdateRbacMatrixAsync(
        UpdateRbacMatrixRequest request, Guid? actorId, CancellationToken cancellationToken = default)
    {
        ValidateReason(request.ChangeReason);
        RolePermissionService.Validate(request.Items);
        var before = await GetRbacMatrixAsync(cancellationToken);
        var grants = request.Items.ToDictionary(x => x.PermissionCode);
        var normalized = RolePermissionService.Defaults.Select(x => x with {
            CashierAllowed = grants[x.PermissionCode].CashierAllowed,
            WarehouseAllowed = grants[x.PermissionCode].WarehouseAllowed,
            AdminAllowed = grants[x.PermissionCode].AdminAllowed
        }).ToArray();
        var now = timeProvider.GetUtcNow().UtcDateTime;
        await UpsertSettingAsync(RolePermissionService.SettingKey, 0, "json", JsonSerializer.Serialize(normalized, JsonOptions), actorId, now, cancellationToken);
        await UpsertSettingAsync("rbac.last_change_reason", 0, null, request.ChangeReason.Trim(), actorId, now, cancellationToken);
        AddAudit("rbac", before, before with { Items = normalized, LastUpdatedAt = now, ChangeReason = request.ChangeReason.Trim() }, actorId, now, request.ChangeReason);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetRbacMatrixAsync(cancellationToken);
    }
    #endregion

    #region SCR-SYS-04: Integrations
    public async Task<IntegrationsConfigDto> GetIntegrationsAsync(CancellationToken cancellationToken = default)
        => MaskSecrets(await ReadIntegrationsAsync(cancellationToken));

    private async Task<IntegrationsConfigDto> ReadIntegrationsAsync(CancellationToken cancellationToken)
    {
        var setting = await dbContext.SystemSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == "integrations.config_json", cancellationToken);

        var reasonSetting = await dbContext.SystemSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == "integrations.last_change_reason", cancellationToken);

        var vietQr = new VietQrIntegrationDto(
            "Vietcombank · DEMO",
            "•••• •••• 0000 · Mẫu",
            "NHA SACH MAY · DEMO",
            "••••••••••••••••",
            "••••••••••••••••",
            15,
            "https://demo.comicpos.example/webhooks/vietqr",
            "DEMO · Cấu hình đủ"
        );

        var zaloOa = new ZaloOaIntegrationDto(
            "DEMO-APP-ID",
            "DEMO-OA-ID",
            "••••••••••••••••",
            "••••••••••••••••••••••••••••••••",
            "DEMO_PAYMENT_SUCCESS",
            "DEMO_DUE_REMINDER",
            "DEMO_OVERDUE",
            "DEMO_DEPOSIT_SETTLED",
            "Trước 2 ngày và 1 ngày",
            "DEMO · Token cần làm mới"
        );

        var bookMetadata = new BookMetadataIntegrationDto(
            "Google Books → Open Library",
            "••••••••••••••••",
            "https://openlibrary.org/api/books",
            "DEMO · Tra cứu mẫu sẵn sàng"
        );

        var smtp = new SmtpIntegrationDto(
            "smtp.example.com",
            587,
            "STARTTLS",
            "noreply@comicpos.example",
            "••••••••••••••••",
            "DEMO · Chưa kiểm thử"
        );

        if (setting != null)
        {
            var stored = setting.Description ?? throw new JsonException("Integration configuration is empty.");
            var json = stored.StartsWith(ProtectedConfigPrefix, StringComparison.Ordinal)
                ? integrationProtector.Unprotect(stored[ProtectedConfigPrefix.Length..])
                : stored;
            var parsed = JsonSerializer.Deserialize<IntegrationsConfigDto>(json, JsonOptions)
                ?? throw new JsonException("Integration configuration is null.");
            vietQr = parsed.VietQr ?? vietQr;
            zaloOa = parsed.ZaloOa ?? zaloOa;
            bookMetadata = parsed.BookMetadata ?? bookMetadata;
            smtp = parsed.Smtp ?? smtp;
        }

        return new IntegrationsConfigDto(
            vietQr with { ApiKey = MergeSecret(vietQr.ApiKey, ""), ChecksumSecret = MergeSecret(vietQr.ChecksumSecret, "") },
            zaloOa with { SecretKey = MergeSecret(zaloOa.SecretKey, ""), AccessToken = MergeSecret(zaloOa.AccessToken, "") },
            bookMetadata with { GoogleBooksApiKey = MergeSecret(bookMetadata.GoogleBooksApiKey, "") },
            smtp with { Password = MergeSecret(smtp.Password, "") },
            reasonSetting?.UpdatedAt ?? new DateTime(2026, 10, 18, 0, 0, 0, DateTimeKind.Utc),
            await ActorNameAsync(reasonSetting?.UpdatedBy, cancellationToken),
            reasonSetting?.Description ?? "Thiết lập môi trường minh họa, không sử dụng khóa sản xuất."
        );
    }

    public async Task<IntegrationsConfigDto> UpdateIntegrationsAsync(
        UpdateIntegrationsRequest request,
        Guid? actorId,
        CancellationToken cancellationToken = default)
    {
        ValidateReason(request.ChangeReason);
        var current = await ReadIntegrationsAsync(cancellationToken);
        var updated = new IntegrationsConfigDto(
            request.VietQr is { } vietQr ? vietQr with
            {
                ApiKey = MergeSecret(vietQr.ApiKey, current.VietQr.ApiKey),
                ChecksumSecret = MergeSecret(vietQr.ChecksumSecret, current.VietQr.ChecksumSecret)
            } : current.VietQr,
            request.ZaloOa is { } zaloOa ? zaloOa with
            {
                SecretKey = MergeSecret(zaloOa.SecretKey, current.ZaloOa.SecretKey),
                AccessToken = MergeSecret(zaloOa.AccessToken, current.ZaloOa.AccessToken)
            } : current.ZaloOa,
            request.BookMetadata is { } metadata ? metadata with
            {
                GoogleBooksApiKey = MergeSecret(metadata.GoogleBooksApiKey, current.BookMetadata.GoogleBooksApiKey)
            } : current.BookMetadata,
            request.Smtp is { } smtp ? smtp with
            {
                Password = MergeSecret(smtp.Password, current.Smtp.Password)
            } : current.Smtp,
            timeProvider.GetUtcNow().UtcDateTime,
            await ActorNameAsync(actorId, cancellationToken),
            request.ChangeReason
        );

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var json = ProtectedConfigPrefix + integrationProtector.Protect(JsonSerializer.Serialize(updated, JsonOptions));

        await UpsertSettingAsync("integrations.config_json", 0m, "json", json, actorId, now, cancellationToken);
        await UpsertSettingAsync("integrations.last_change_reason", 0m, null, request.ChangeReason, actorId, now, cancellationToken);
        var changedSecrets = new (string Field, string Before, string After)[] {
            ("vietQr.apiKey", current.VietQr.ApiKey, updated.VietQr.ApiKey),
            ("vietQr.checksumSecret", current.VietQr.ChecksumSecret, updated.VietQr.ChecksumSecret),
            ("zaloOa.secretKey", current.ZaloOa.SecretKey, updated.ZaloOa.SecretKey),
            ("zaloOa.accessToken", current.ZaloOa.AccessToken, updated.ZaloOa.AccessToken),
            ("bookMetadata.googleBooksApiKey", current.BookMetadata.GoogleBooksApiKey, updated.BookMetadata.GoogleBooksApiKey),
            ("smtp.password", current.Smtp.Password, updated.Smtp.Password)
        }.Where(x => x.Before != x.After).Select(x => x.Field).ToArray();
        AddAudit("integrations", MaskSecrets(current), MaskSecrets(updated), actorId, now, request.ChangeReason, changedSecrets);
        await dbContext.SaveChangesAsync(cancellationToken);

        return MaskSecrets(updated);
    }

    private static bool IsSecretPlaceholder(string? value)
        => string.IsNullOrWhiteSpace(value) || value.All(c => c is '*' or '•' || char.IsWhiteSpace(c));

    private static string MergeSecret(string? incoming, string? existing)
        => IsSecretPlaceholder(incoming) ? (IsSecretPlaceholder(existing) ? "" : existing!) : incoming!;

    private static string MaskSecret(string? value) => IsSecretPlaceholder(value) ? "" : SecretMask;

    private static IntegrationsConfigDto MaskSecrets(IntegrationsConfigDto config) => config with
    {
        VietQr = config.VietQr with { ApiKey = MaskSecret(config.VietQr.ApiKey), ChecksumSecret = MaskSecret(config.VietQr.ChecksumSecret) },
        ZaloOa = config.ZaloOa with { SecretKey = MaskSecret(config.ZaloOa.SecretKey), AccessToken = MaskSecret(config.ZaloOa.AccessToken) },
        BookMetadata = config.BookMetadata with { GoogleBooksApiKey = MaskSecret(config.BookMetadata.GoogleBooksApiKey) },
        Smtp = config.Smtp with { Password = MaskSecret(config.Smtp.Password) }
    };
    #endregion

    #region Helper
    private static void ValidateReason(string? reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new backend.src.Exceptions.BadRequestException("Vui lòng nhập lý do thay đổi cấu hình.");
    }

    private Task<string?> ActorNameAsync(Guid? actorId, CancellationToken ct)
        => dbContext.Employees.AsNoTracking().Where(x => x.Id == actorId).Select(x => (string?)x.FullName).FirstOrDefaultAsync(ct);

    private void AddAudit(string group, object before, object after, Guid? actorId, DateTime now, string reason, string[]? changedSecrets = null)
    {
        dbContext.AuditLogs.Add(new AuditLogModel {
            Action = $"SETTINGS_{group.ToUpperInvariant()}_UPDATED", EntityType = "SystemSettings",
            EntityId = dbContext.SystemSettings.Local.First(s => s.Key.StartsWith(group + ".")).Id,
            ActorId = actorId, OccurredAt = now, Reason = reason.Trim(),
            BeforeData = JsonSerializer.Serialize(new { config = before }, JsonOptions),
            AfterData = JsonSerializer.Serialize(new { effectiveAt = now, config = after, changedSecrets }, JsonOptions)
        });
    }

    public async Task<IReadOnlyList<SettingsHistoryItemDto>> GetHistoryAsync(string group, CancellationToken ct = default)
    {
        if (group is not ("rental" or "membership" or "rbac" or "integrations"))
            throw new backend.src.Exceptions.BadRequestException("Nhóm cấu hình không hợp lệ.");
        var action = $"SETTINGS_{group.ToUpperInvariant()}_UPDATED";
        return await dbContext.AuditLogs.AsNoTracking().Where(x => x.EntityType == "SystemSettings" && x.Action == action)
            .OrderByDescending(x => x.OccurredAt).ThenByDescending(x => x.Id).Take(100)
            .Select(x => new SettingsHistoryItemDto(x.Id, group, x.ActorId,
                dbContext.Employees.Where(e => e.Id == x.ActorId).Select(e => e.FullName).FirstOrDefault(),
                x.OccurredAt, x.OccurredAt, x.Reason ?? "", x.BeforeData, x.AfterData!)).ToListAsync(ct);
    }

    private async Task UpsertSettingAsync(
        string key,
        decimal value,
        string? unit,
        string? description,
        Guid? actorId,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var setting = await dbContext.SystemSettings.FirstOrDefaultAsync(s => s.Key == key, cancellationToken);
        if (setting == null)
        {
            setting = new SystemSettingModel
            {
                Key = key,
                Value = value,
                Unit = unit,
                Description = description,
                UpdatedBy = actorId,
                UpdatedAt = now
            };
            await dbContext.SystemSettings.AddAsync(setting, cancellationToken);
        }
        else
        {
            setting.Value = value;
            setting.Unit = unit;
            setting.Description = description;
            setting.UpdatedBy = actorId;
            setting.UpdatedAt = now;
        }
    }
    #endregion
}
