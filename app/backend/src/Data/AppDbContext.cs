using System.Linq.Expressions;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.src.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<EmployeeModel> Employees => Set<EmployeeModel>();
    public DbSet<RoleModel> Roles => Set<RoleModel>();
    public DbSet<MembershipTierModel> MembershipTiers => Set<MembershipTierModel>();
    public DbSet<CustomerModel> Customers => Set<CustomerModel>();
    public DbSet<SystemSettingModel> SystemSettings => Set<SystemSettingModel>();
    public DbSet<DamageLevelModel> DamageLevels => Set<DamageLevelModel>();
    public DbSet<CategoryModel> Categories => Set<CategoryModel>();
    public DbSet<BookSeriesModel> BookSeries => Set<BookSeriesModel>();
    public DbSet<TitleModel> Titles => Set<TitleModel>();
    public DbSet<EditionModel> Editions => Set<EditionModel>();
    public DbSet<SupplierModel> Suppliers => Set<SupplierModel>();
    public DbSet<StockReceiptModel> StockReceipts => Set<StockReceiptModel>();
    public DbSet<StockReceiptLineModel> StockReceiptLines => Set<StockReceiptLineModel>();
    public DbSet<BookCopyModel> BookCopies => Set<BookCopyModel>();
    public DbSet<InventoryCheckModel> InventoryChecks => Set<InventoryCheckModel>();
    public DbSet<InventoryAdjustmentRequestModel> InventoryAdjustmentRequests => Set<InventoryAdjustmentRequestModel>();
    public DbSet<SaleInvoiceModel> SaleInvoices => Set<SaleInvoiceModel>();
    public DbSet<SaleInvoiceLineModel> SaleInvoiceLines => Set<SaleInvoiceLineModel>();
    public DbSet<RentalSlipModel> RentalSlips => Set<RentalSlipModel>();
    public DbSet<ReturnModel> Returns => Set<ReturnModel>();
    public DbSet<RentalLineModel> RentalLines => Set<RentalLineModel>();
    public DbSet<RentalExtensionModel> RentalExtensions => Set<RentalExtensionModel>();
    public DbSet<CashSessionModel> CashSessions => Set<CashSessionModel>();
    public DbSet<PaymentModel> Payments => Set<PaymentModel>();
    public DbSet<EmployeeWorkRecordModel> EmployeeWorkRecords => Set<EmployeeWorkRecordModel>();
    public DbSet<NotificationOutboxModel> NotificationOutbox => Set<NotificationOutboxModel>();
    public DbSet<AuditLogModel> AuditLogs => Set<AuditLogModel>();

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        EnsureAuditLogsAreAppendOnly();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        EnsureAuditLogsAreAppendOnly();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        ConfigureTables(modelBuilder);
        ConfigureProperties(modelBuilder);
        ConfigureRelationships(modelBuilder);
        ConfigureIndexes(modelBuilder);
        ConfigureEnumConversions(modelBuilder);
    }

    private static void ConfigureTables(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RoleModel>().ToTable("roles");
        modelBuilder.Entity<EmployeeModel>().ToTable("employee");
        modelBuilder.Entity<MembershipTierModel>().ToTable("membership_tiers");
        modelBuilder.Entity<CustomerModel>().ToTable("customers");
        modelBuilder.Entity<SystemSettingModel>().ToTable("system_settings");
        modelBuilder.Entity<DamageLevelModel>().ToTable("damage_levels");
        modelBuilder.Entity<CategoryModel>().ToTable("categories");
        modelBuilder.Entity<BookSeriesModel>().ToTable("book_series");
        modelBuilder.Entity<TitleModel>().ToTable("titles");
        modelBuilder.Entity<EditionModel>().ToTable("edition");
        modelBuilder.Entity<SupplierModel>().ToTable("suppliers");
        modelBuilder.Entity<StockReceiptModel>().ToTable("stock_receipts");
        modelBuilder.Entity<StockReceiptLineModel>().ToTable("stock_receipt_lines");
        modelBuilder.Entity<BookCopyModel>().ToTable("book_copies");
        modelBuilder.Entity<InventoryCheckModel>().ToTable("inventory_checks");
        modelBuilder.Entity<InventoryAdjustmentRequestModel>().ToTable("inventory_adjustment_requests");
        modelBuilder.Entity<SaleInvoiceModel>().ToTable("sale_invoices");
        modelBuilder.Entity<SaleInvoiceLineModel>().ToTable("sale_invoice_lines");
        modelBuilder.Entity<RentalSlipModel>().ToTable("rental_slips");
        modelBuilder.Entity<ReturnModel>().ToTable("returns");
        modelBuilder.Entity<RentalLineModel>().ToTable("rental_lines");
        modelBuilder.Entity<RentalExtensionModel>().ToTable("rental_extensions");
        modelBuilder.Entity<CashSessionModel>().ToTable("cash_sessions");
        modelBuilder.Entity<PaymentModel>().ToTable("payments");
        modelBuilder.Entity<EmployeeWorkRecordModel>().ToTable("employee_work_records");
        modelBuilder.Entity<NotificationOutboxModel>().ToTable("notification_outbox");
        modelBuilder.Entity<AuditLogModel>().ToTable("audit_logs");
    }

    private static void ConfigureProperties(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RoleModel>().Property(x => x.IsActive).HasDefaultValue(true);

        var membershipTier = modelBuilder.Entity<MembershipTierModel>();
        membershipTier.Property(x => x.MinSpend).HasDefaultValue(0L);
        membershipTier.Property(x => x.RentDiscountPct).HasPrecision(5, 2).HasDefaultValue(0m);
        membershipTier.Property(x => x.SaleDiscountPct).HasPrecision(5, 2).HasDefaultValue(0m);

        var customer = modelBuilder.Entity<CustomerModel>();
        customer.Property(x => x.EligibleSpend).HasDefaultValue(0L);
        customer.Property(x => x.IsFlagged).HasDefaultValue(false);
        customer.Property(x => x.CreatedAt).HasDefaultValueSql("now()");

        var systemSetting = modelBuilder.Entity<SystemSettingModel>();
        systemSetting.Property(x => x.Value).HasPrecision(18, 4);
        systemSetting.Property(x => x.UpdatedAt).HasDefaultValueSql("now()");
        var damageLevel = modelBuilder.Entity<DamageLevelModel>();
        damageLevel.Property(x => x.PenaltyPct).HasPrecision(5, 2);
        damageLevel.Property(x => x.CopyStatusAfter)
            .HasDefaultValue(BookCopyStatus.DAMAGED)
            .HasSentinel((BookCopyStatus)(-1));

        modelBuilder.Entity<CategoryModel>().Property(x => x.IsActive).HasDefaultValue(true);

        var bookSeries = modelBuilder.Entity<BookSeriesModel>();
        bookSeries.Property(x => x.IsActive).HasDefaultValue(true);
        bookSeries.Property(x => x.CreatedAt).HasDefaultValueSql("now()");

        var title = modelBuilder.Entity<TitleModel>();
        title.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
        title.Property(x => x.IsActive).HasDefaultValue(true);

        var edition = modelBuilder.Entity<EditionModel>();
        edition.Property(x => x.MinStockSale).HasDefaultValue(0);
        edition.Property(x => x.MinStockRental).HasDefaultValue(0);
        edition.Property(x => x.IsActive).HasDefaultValue(true);

        modelBuilder.Entity<SupplierModel>().Property(x => x.IsActive).HasDefaultValue(true);

        var stockReceipt = modelBuilder.Entity<StockReceiptModel>();
        stockReceipt.Property(x => x.Status).HasDefaultValue(ApprovalStatus.DRAFT);
        stockReceipt.Property(x => x.TotalAmount).HasDefaultValue(0L);
        stockReceipt.Property(x => x.NeedsApproval).HasDefaultValue(false);
        stockReceipt.Property(x => x.CreatedAt).HasDefaultValueSql("now()");

        var stockReceiptLine = modelBuilder.Entity<StockReceiptLineModel>();
        stockReceiptLine.Property(x => x.Availability).HasDefaultValue(BookChannelAvailability.BOTH);
        stockReceiptLine.Property(x => x.Quantity).HasDefaultValue(1);

        var bookCopy = modelBuilder.Entity<BookCopyModel>();
        bookCopy.Property(x => x.Availability).HasDefaultValue(BookChannelAvailability.BOTH);
        bookCopy.Property(x => x.Status).HasDefaultValue(BookCopyStatus.PENDING_RECEIPT);
        bookCopy.Property(x => x.CreatedAt).HasDefaultValueSql("now()");

        var inventoryCheck = modelBuilder.Entity<InventoryCheckModel>();
        inventoryCheck.Property(x => x.IsFound).HasDefaultValue(false);
        inventoryCheck.Property(x => x.CheckedAt).HasDefaultValueSql("now()");

        var inventoryAdjustment = modelBuilder.Entity<InventoryAdjustmentRequestModel>();
        inventoryAdjustment.Property(x => x.Status).HasDefaultValue(InventoryAdjustmentStatus.PENDING_APPROVAL);
        inventoryAdjustment.Property(x => x.RequestedAt).HasDefaultValueSql("now()");

        var saleInvoice = modelBuilder.Entity<SaleInvoiceModel>();
        saleInvoice.Property(x => x.Status).HasDefaultValue(SaleInvoiceStatus.DRAFT);
        saleInvoice.Property(x => x.Subtotal).HasDefaultValue(0L);
        saleInvoice.Property(x => x.DiscountTotal).HasDefaultValue(0L);
        saleInvoice.Property(x => x.TotalPayable).HasDefaultValue(0L);
        saleInvoice.Property(x => x.CreatedAt).HasDefaultValueSql("now()");

        var saleInvoiceLine = modelBuilder.Entity<SaleInvoiceLineModel>();
        saleInvoiceLine.Property(x => x.DiscountPct).HasPrecision(5, 2).HasDefaultValue(0m);
        saleInvoiceLine.Property(x => x.DiscountAmount).HasDefaultValue(0L);
        saleInvoiceLine.Property(x => x.Status).HasDefaultValue(SaleInvoiceLineStatus.ACTIVE);

        var rentalSlip = modelBuilder.Entity<RentalSlipModel>();
        rentalSlip.Property(x => x.Status).HasDefaultValue(RentalSlipStatus.DRAFT);
        rentalSlip.Property(x => x.CreatedAt).HasDefaultValueSql("now()");

        var bookReturn = modelBuilder.Entity<ReturnModel>();
        bookReturn.Property(x => x.Status).HasDefaultValue(ReturnStatus.DRAFT);
        bookReturn.Property(x => x.ReturnedAt).HasDefaultValueSql("now()");

        var rentalLine = modelBuilder.Entity<RentalLineModel>();
        rentalLine.Property(x => x.Status).HasDefaultValue(RentalLineStatus.PENDING_DEPOSIT);
        rentalLine.Property(x => x.RentDiscountPct).HasPrecision(5, 2).HasDefaultValue(0m);
        rentalLine.Property(x => x.ExtensionCount).HasDefaultValue((short)0);
        rentalLine.Property(x => x.ExtensionFeeTotal).HasDefaultValue(0L);
        rentalLine.Property(x => x.LockedLatePenalty).HasDefaultValue(0L);
        rentalLine.Property(x => x.DamageNeedsApproval).HasDefaultValue(false);
        rentalLine.Property(x => x.LateDays).HasDefaultValue((short)0);
        rentalLine.Property(x => x.ChargedRentFee).HasDefaultValue(0L);
        rentalLine.Property(x => x.ChargedExtensionFee).HasDefaultValue(0L);
        rentalLine.Property(x => x.ChargedLatePenalty).HasDefaultValue(0L);
        rentalLine.Property(x => x.ChargedDamagePenalty).HasDefaultValue(0L);
        rentalLine.Property(x => x.LostRetainedAmount).HasDefaultValue(0L);
        rentalLine.Property(x => x.RefundAmount).HasDefaultValue(0L);
        rentalLine.Property(x => x.AdditionalAmountDue).HasDefaultValue(0L);
        rentalLine.Property(x => x.AdditionalAmountPaid).HasDefaultValue(0L);

        var rentalExtension = modelBuilder.Entity<RentalExtensionModel>();
        rentalExtension.Property(x => x.ExtendedAt).HasDefaultValueSql("now()");
        rentalExtension.Property(x => x.LatePenaltyLocked).HasDefaultValue(0L);

        var cashSession = modelBuilder.Entity<CashSessionModel>();
        cashSession.Property(x => x.Status).HasDefaultValue(CashSessionStatus.OPEN);
        cashSession.Property(x => x.OpenedAt).HasDefaultValueSql("now()");

        var payment = modelBuilder.Entity<PaymentModel>();
        payment.Property(x => x.Status).HasDefaultValue(PaymentStatus.PENDING);
        payment.Property(x => x.CreatedAt).HasDefaultValueSql("now()");

        var workRecord = modelBuilder.Entity<EmployeeWorkRecordModel>();
        workRecord.Property(x => x.ShiftNo).HasDefaultValue((short)1);
        workRecord.Property(x => x.AttendanceStatus).HasDefaultValue(AttendanceStatus.PRESENT);
        workRecord.Property(x => x.WorkedMinutes).HasDefaultValue(0);
        workRecord.Property(x => x.OvertimeMinutes).HasDefaultValue(0);
        workRecord.Property(x => x.ShiftSalary).HasDefaultValue(0L);
        workRecord.Property(x => x.PaymentStatus).HasDefaultValue(WorkRecordPaymentStatus.UNPAID);
        workRecord.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
        workRecord.Property(x => x.UpdatedAt).HasDefaultValueSql("now()");

        var notification = modelBuilder.Entity<NotificationOutboxModel>();
        notification.Property(x => x.Content).HasColumnType("jsonb");
        notification.Property(x => x.Status).HasDefaultValue(NotificationStatus.PENDING);
        notification.Property(x => x.AttemptCount).HasDefaultValue((short)0);
        notification.Property(x => x.CreatedAt).HasDefaultValueSql("now()");

        var auditLog = modelBuilder.Entity<AuditLogModel>();
        auditLog.Property(x => x.BeforeData).HasColumnType("jsonb");
        auditLog.Property(x => x.AfterData).HasColumnType("jsonb");
        auditLog.Property(x => x.OccurredAt).HasDefaultValueSql("now()");
    }

    private static void ConfigureRelationships(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<EmployeeModel>()
            .HasOne(x => x.Role)
            .WithMany()
            .HasForeignKey(x => x.RoleId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<CustomerModel>()
            .HasOne(x => x.MembershipTier)
            .WithMany()
            .HasForeignKey(x => x.TierId)
            .OnDelete(DeleteBehavior.NoAction);

        Reference<SystemSettingModel, EmployeeModel, Guid?>(modelBuilder, x => x.UpdatedBy, false);
        Reference<CategoryModel, CategoryModel, Guid?>(modelBuilder, x => x.ParentId, false);
        Reference<TitleModel, BookSeriesModel, Guid?>(modelBuilder, x => x.SeriesId, false);
        Reference<TitleModel, CategoryModel, Guid?>(modelBuilder, x => x.CategoryId, false);
        Reference<EditionModel, TitleModel, Guid>(modelBuilder, x => x.TitleId);
        Reference<EditionModel, EmployeeModel, Guid?>(modelBuilder, x => x.MetadataConfirmedBy, false);
        Reference<StockReceiptModel, SupplierModel, Guid?>(modelBuilder, x => x.SupplierId, false);
        Reference<StockReceiptModel, CustomerModel, Guid?>(modelBuilder, x => x.SellerId, false);
        Reference<StockReceiptModel, EmployeeModel, Guid?>(modelBuilder, x => x.ApprovedBy, false);
        Reference<StockReceiptModel, EmployeeModel, Guid>(modelBuilder, x => x.CreatedBy);
        Reference<StockReceiptLineModel, StockReceiptModel, Guid>(modelBuilder, x => x.ReceiptId);
        Reference<StockReceiptLineModel, EditionModel, Guid>(modelBuilder, x => x.EditionId);
        Reference<BookCopyModel, EditionModel, Guid>(modelBuilder, x => x.EditionId);
        Reference<BookCopyModel, StockReceiptLineModel, Guid>(modelBuilder, x => x.ReceiptLineId);
        Reference<InventoryCheckModel, BookCopyModel, Guid>(modelBuilder, x => x.CopyId);
        Reference<InventoryCheckModel, EmployeeModel, Guid>(modelBuilder, x => x.CheckedBy);
        Reference<InventoryAdjustmentRequestModel, InventoryCheckModel, Guid>(modelBuilder, x => x.InventoryCheckId);
        Reference<InventoryAdjustmentRequestModel, EmployeeModel, Guid>(modelBuilder, x => x.RequestedBy);
        Reference<InventoryAdjustmentRequestModel, EmployeeModel, Guid?>(modelBuilder, x => x.ApprovedBy, false);
        Reference<SaleInvoiceModel, CustomerModel, Guid?>(modelBuilder, x => x.CustomerId, false);
        Reference<SaleInvoiceModel, CashSessionModel, Guid>(modelBuilder, x => x.CashSessionId);
        Reference<SaleInvoiceModel, EmployeeModel, Guid>(modelBuilder, x => x.CreatedBy);
        Reference<SaleInvoiceLineModel, SaleInvoiceModel, Guid>(modelBuilder, x => x.InvoiceId);
        Reference<SaleInvoiceLineModel, BookCopyModel, Guid>(modelBuilder, x => x.CopyId);
        Reference<RentalSlipModel, CustomerModel, Guid>(modelBuilder, x => x.CustomerId);
        Reference<RentalSlipModel, MembershipTierModel, Guid>(modelBuilder, x => x.TierId);
        Reference<RentalSlipModel, EmployeeModel, Guid>(modelBuilder, x => x.CreatedBy);
        Reference<ReturnModel, RentalSlipModel, Guid>(modelBuilder, x => x.SlipId);
        Reference<ReturnModel, EmployeeModel, Guid>(modelBuilder, x => x.CreatedBy);
        Reference<RentalLineModel, RentalSlipModel, Guid>(modelBuilder, x => x.SlipId);
        Reference<RentalLineModel, BookCopyModel, Guid>(modelBuilder, x => x.CopyId);
        Reference<RentalLineModel, ReturnModel, Guid?>(modelBuilder, x => x.ReturnId, false);
        Reference<RentalLineModel, DamageLevelModel, Guid?>(modelBuilder, x => x.DamageLevelId, false);
        Reference<RentalLineModel, EmployeeModel, Guid?>(modelBuilder, x => x.DamageApprovedBy, false);
        Reference<RentalExtensionModel, RentalLineModel, Guid>(modelBuilder, x => x.RentalLineId);
        Reference<RentalExtensionModel, EmployeeModel, Guid>(modelBuilder, x => x.PerformedBy);
        Reference<CashSessionModel, EmployeeModel, Guid>(modelBuilder, x => x.OpenedBy);
        Reference<CashSessionModel, EmployeeModel, Guid?>(modelBuilder, x => x.VarianceApprovedBy, false);
        Reference<CashSessionModel, EmployeeModel, Guid?>(modelBuilder, x => x.ClosedBy, false);
        Reference<PaymentModel, CashSessionModel, Guid?>(modelBuilder, x => x.CashSessionId, false);
        Reference<PaymentModel, SaleInvoiceModel, Guid?>(modelBuilder, x => x.SaleInvoiceId, false);
        Reference<PaymentModel, RentalSlipModel, Guid?>(modelBuilder, x => x.RentalSlipId, false);
        Reference<PaymentModel, StockReceiptModel, Guid?>(modelBuilder, x => x.StockReceiptId, false);
        Reference<PaymentModel, ReturnModel, Guid?>(modelBuilder, x => x.ReturnId, false);
        Reference<PaymentModel, EmployeeWorkRecordModel, Guid?>(modelBuilder, x => x.WorkRecordId, false);
        Reference<PaymentModel, EmployeeModel, Guid>(modelBuilder, x => x.CreatedBy);
        Reference<EmployeeWorkRecordModel, EmployeeModel, Guid>(modelBuilder, x => x.EmployeeId);
        Reference<EmployeeWorkRecordModel, EmployeeModel, Guid?>(modelBuilder, x => x.ApprovedBy, false);
        Reference<AuditLogModel, EmployeeModel, Guid?>(modelBuilder, x => x.ActorId, false);
    }

    private static void ConfigureIndexes(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RoleModel>().HasIndex(x => x.RoleName).IsUnique();
        modelBuilder.Entity<EmployeeModel>().HasIndex(x => x.Email).IsUnique();
        modelBuilder.Entity<MembershipTierModel>().HasIndex(x => x.Name).IsUnique();
        modelBuilder.Entity<MembershipTierModel>().HasIndex(x => x.RankOrder).IsUnique();
        modelBuilder.Entity<CustomerModel>().HasIndex(x => x.Phone).IsUnique();
        modelBuilder.Entity<SystemSettingModel>().HasIndex(x => x.Key).IsUnique();
        modelBuilder.Entity<EditionModel>().HasIndex(x => x.Isbn).HasDatabaseName("ix_edition_isbn");
        modelBuilder.Entity<SupplierModel>().HasIndex(x => x.TaxCode).IsUnique();
        modelBuilder.Entity<StockReceiptModel>().HasIndex(x => x.Code).IsUnique();
        modelBuilder.Entity<BookCopyModel>().HasIndex(x => x.CopyBarcode).IsUnique();
        modelBuilder.Entity<InventoryCheckModel>().HasIndex(x => new { x.CheckCode, x.CopyId }).IsUnique();
        modelBuilder.Entity<SaleInvoiceModel>().HasIndex(x => x.InvoiceNo).IsUnique();
        modelBuilder.Entity<SaleInvoiceLineModel>().HasIndex(x => x.CopyId).IsUnique()
            .HasDatabaseName("uq_sale_line_active_copy")
            .HasFilter("\"Status\" = 'ACTIVE'");
        modelBuilder.Entity<RentalSlipModel>().HasIndex(x => x.SlipNo).IsUnique();
        modelBuilder.Entity<ReturnModel>().HasIndex(x => x.ReturnNo).IsUnique();
        modelBuilder.Entity<ReturnModel>().HasIndex(x => x.SlipId).IsUnique();
        modelBuilder.Entity<RentalLineModel>().HasIndex(x => x.CopyId).IsUnique()
            .HasDatabaseName("uq_rental_line_active_copy")
            .HasFilter("\"Status\" IN ('PENDING_DEPOSIT', 'RENTING')");
        modelBuilder.Entity<RentalLineModel>().HasIndex(x => x.DueAt)
            .HasDatabaseName("ix_rental_lines_due")
            .HasFilter("\"Status\" = 'RENTING'");
        modelBuilder.Entity<RentalExtensionModel>().HasIndex(x => new { x.RentalLineId, x.Seq }).IsUnique();
        modelBuilder.Entity<CashSessionModel>().HasIndex(x => x.Status).IsUnique()
            .HasDatabaseName("uq_cash_single_open")
            .HasFilter("\"Status\" <> 'CLOSED'");
        modelBuilder.Entity<PaymentModel>().HasIndex(x => x.PaymentNo).IsUnique();
        modelBuilder.Entity<PaymentModel>().HasIndex(x => x.IdempotencyKey).IsUnique();
        modelBuilder.Entity<PaymentModel>().HasIndex(x => x.QrReference).IsUnique();
        modelBuilder.Entity<EmployeeWorkRecordModel>().HasIndex(x => new { x.EmployeeId, x.WorkDate, x.ShiftNo }).IsUnique();
    }

    private static void ConfigureEnumConversions(ModelBuilder modelBuilder)
    {
        EnumAsString(modelBuilder.Entity<RoleModel>(), x => x.RoleName); EnumAsString(modelBuilder.Entity<EmployeeModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<MembershipTierModel>(), x => x.Name); EnumAsString(modelBuilder.Entity<DamageLevelModel>(), x => x.Level); EnumAsString(modelBuilder.Entity<DamageLevelModel>(), x => x.CopyStatusAfter); EnumAsString(modelBuilder.Entity<EditionModel>(), x => x.MetadataSource); EnumAsString(modelBuilder.Entity<StockReceiptModel>(), x => x.SourceType); EnumAsString(modelBuilder.Entity<StockReceiptModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<StockReceiptLineModel>(), x => x.Availability); EnumAsString(modelBuilder.Entity<StockReceiptLineModel>(), x => x.ConditionGrade); EnumAsString(modelBuilder.Entity<BookCopyModel>(), x => x.Availability); EnumAsString(modelBuilder.Entity<BookCopyModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<BookCopyModel>(), x => x.ConditionGrade); EnumAsString(modelBuilder.Entity<InventoryCheckModel>(), x => x.ExpectedStatus); EnumAsString(modelBuilder.Entity<InventoryCheckModel>(), x => x.ObservedStatus); EnumAsString(modelBuilder.Entity<InventoryCheckModel>(), x => x.VarianceType); EnumAsString(modelBuilder.Entity<InventoryAdjustmentRequestModel>(), x => x.RequestedStatus); EnumAsString(modelBuilder.Entity<InventoryAdjustmentRequestModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<SaleInvoiceModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<SaleInvoiceLineModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<RentalSlipModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<ReturnModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<RentalLineModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<RentalLineModel>(), x => x.CopyCondition); EnumAsString(modelBuilder.Entity<CashSessionModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<PaymentModel>(), x => x.Direction); EnumAsString(modelBuilder.Entity<PaymentModel>(), x => x.PaymentType); EnumAsString(modelBuilder.Entity<PaymentModel>(), x => x.Method); EnumAsString(modelBuilder.Entity<PaymentModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<EmployeeWorkRecordModel>(), x => x.AttendanceStatus); EnumAsString(modelBuilder.Entity<EmployeeWorkRecordModel>(), x => x.PaymentStatus); EnumAsString(modelBuilder.Entity<NotificationOutboxModel>(), x => x.Channel); EnumAsString(modelBuilder.Entity<NotificationOutboxModel>(), x => x.RecipientType); EnumAsString(modelBuilder.Entity<NotificationOutboxModel>(), x => x.Status);
    }

    private static void Reference<TDependent, TPrincipal, TKey>(
        ModelBuilder modelBuilder,
        Expression<Func<TDependent, TKey>> foreignKey,
        bool required = true)
        where TDependent : class
        where TPrincipal : class
    {
        var propertyName = ((MemberExpression)foreignKey.Body).Member.Name;

        modelBuilder.Entity<TDependent>()
            .HasOne<TPrincipal>()
            .WithMany()
            .HasForeignKey(propertyName)
            .IsRequired(required)
            .OnDelete(DeleteBehavior.NoAction);
    }

    private static void EnumAsString<TEntity, TProperty>(
        EntityTypeBuilder<TEntity> entity,
        Expression<Func<TEntity, TProperty>> property)
        where TEntity : class => entity.Property(property).HasConversion<string>();

    private void EnsureAuditLogsAreAppendOnly()
    {
        var auditWasChanged = ChangeTracker.Entries<AuditLogModel>()
            .Any(entry => entry.State is EntityState.Modified or EntityState.Deleted);
        if (auditWasChanged)
            throw new InvalidOperationException("Audit logs are append-only and cannot be changed or deleted.");
    }
}
