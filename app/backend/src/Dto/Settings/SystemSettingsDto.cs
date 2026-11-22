namespace backend.src.Dto.Settings;

public sealed record DamagePenaltyConfigDto(
    string ConditionName,
    decimal PenaltyPct,
    string Basis,
    string SettlementRule
);

public sealed record RentalPolicyConfigDto(
    decimal DepositRatePct,
    short MaxExtensions,
    short ExtensionDaysPerTime,
    string FeeCollectionTiming,
    short GracePeriodHours,
    decimal LatePenaltyRatePct,
    IReadOnlyList<DamagePenaltyConfigDto> DamagePenalties,
    string PolicyVersion,
    DateTime? LastUpdatedAt,
    string? LastUpdatedByName,
    string? ChangeReason
);

public sealed record UpdateRentalPolicyRequest(
    short MaxExtensions,
    short ExtensionDaysPerTime,
    short GracePeriodHours,
    decimal LatePenaltyRatePct,
    IReadOnlyList<DamagePenaltyConfigDto>? DamagePenalties,
    string ChangeReason
);

public sealed record MembershipTierItemDto(
    string Name,
    string DisplayName,
    short RankOrder,
    long MinSpend,
    long? MaxSpend,
    short MaxBooks,
    short MaxRentalDays,
    decimal RentDiscountPct,
    decimal SaleDiscountPct,
    string Description
);

public sealed record MembershipPolicyConfigDto(
    IReadOnlyList<MembershipTierItemDto> Tiers,
    DateTime? LastUpdatedAt,
    string? LastUpdatedByName,
    string? ChangeReason
);

public sealed record UpdateMembershipPolicyRequest(
    IReadOnlyList<MembershipTierItemDto> Tiers,
    string ChangeReason
);

public sealed record RbacMatrixItemDto(
    string PermissionCode,
    string PermissionName,
    string ModuleCode,
    string ModuleTitle,
    bool CashierAllowed,
    bool WarehouseAllowed,
    bool AdminAllowed,
    bool AdminOnly
);

public sealed record RbacMatrixConfigDto(
    IReadOnlyList<RbacMatrixItemDto> Items,
    DateTime? LastUpdatedAt,
    string? LastUpdatedByName,
    string? ChangeReason
);

public sealed record UpdateRbacMatrixRequest(
    IReadOnlyList<RbacMatrixItemDto> Items,
    string ChangeReason
);

public sealed record SettingsHistoryItemDto(
    Guid Id, string Group, Guid? ActorId, string? ActorName, DateTime OccurredAt,
    DateTime EffectiveAt, string Reason, string? BeforeJson, string AfterJson
);

public sealed record VietQrIntegrationDto(
    string BankName,
    string AccountNo,
    string AccountHolder,
    string ApiKey,
    string ChecksumSecret,
    short ExpireMinutes,
    string WebhookUrl,
    string Status
);

public sealed record ZaloOaIntegrationDto(
    string AppId,
    string OaId,
    string SecretKey,
    string AccessToken,
    string TemplatePaymentSuccess,
    string TemplateDueReminder,
    string TemplateOverdue,
    string TemplateDepositSettled,
    string ReminderSchedule,
    string Status
);

public sealed record BookMetadataIntegrationDto(
    string PriorityService,
    string GoogleBooksApiKey,
    string OpenLibraryEndpoint,
    string Status
);

public sealed record SmtpIntegrationDto(
    string Host,
    int Port,
    string Security,
    string SenderEmail,
    string Password,
    string Status
);

public sealed record IntegrationsConfigDto(
    VietQrIntegrationDto VietQr,
    ZaloOaIntegrationDto ZaloOa,
    BookMetadataIntegrationDto BookMetadata,
    SmtpIntegrationDto Smtp,
    DateTime? LastUpdatedAt,
    string? LastUpdatedByName,
    string? ChangeReason
);

public sealed record UpdateIntegrationsRequest(
    VietQrIntegrationDto? VietQr = null,
    ZaloOaIntegrationDto? ZaloOa = null,
    BookMetadataIntegrationDto? BookMetadata = null,
    SmtpIntegrationDto? Smtp = null,
    string ChangeReason = ""
);
