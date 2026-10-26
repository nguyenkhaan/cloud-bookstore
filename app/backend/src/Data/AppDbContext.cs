using System.Linq.Expressions;
using backend.src.Models;
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
        ConfigureEnumConversions(modelBuilder);
    }

    private static void ConfigureTables(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RoleModel>().ToTable("roles"); modelBuilder.Entity<EmployeeModel>().ToTable("employee"); modelBuilder.Entity<MembershipTierModel>().ToTable("membership_tiers"); modelBuilder.Entity<CustomerModel>().ToTable("customers"); modelBuilder.Entity<SystemSettingModel>().ToTable("system_settings"); modelBuilder.Entity<DamageLevelModel>().ToTable("damage_levels"); modelBuilder.Entity<CategoryModel>().ToTable("categories"); modelBuilder.Entity<TitleModel>().ToTable("titles"); modelBuilder.Entity<EditionModel>().ToTable("edition"); modelBuilder.Entity<SupplierModel>().ToTable("suppliers");
        modelBuilder.Entity<StockReceiptModel>().ToTable("stock_receipts"); modelBuilder.Entity<StockReceiptLineModel>().ToTable("stock_receipt_lines"); modelBuilder.Entity<BookCopyModel>().ToTable("book_copies"); modelBuilder.Entity<InventoryCheckModel>().ToTable("inventory_checks"); modelBuilder.Entity<InventoryAdjustmentRequestModel>().ToTable("inventory_adjustment_requests"); modelBuilder.Entity<SaleInvoiceModel>().ToTable("sale_invoices"); modelBuilder.Entity<SaleInvoiceLineModel>().ToTable("sale_invoice_lines"); modelBuilder.Entity<RentalSlipModel>().ToTable("rental_slips"); modelBuilder.Entity<ReturnModel>().ToTable("returns"); modelBuilder.Entity<RentalLineModel>().ToTable("rental_lines"); modelBuilder.Entity<RentalExtensionModel>().ToTable("rental_extensions"); modelBuilder.Entity<CashSessionModel>().ToTable("cash_sessions"); modelBuilder.Entity<PaymentModel>().ToTable("payments"); modelBuilder.Entity<EmployeeWorkRecordModel>().ToTable("employee_work_records"); modelBuilder.Entity<NotificationOutboxModel>().ToTable("notification_outbox"); modelBuilder.Entity<AuditLogModel>().ToTable("audit_logs");
    }

    private static void ConfigureEnumConversions(ModelBuilder modelBuilder)
    {
        EnumAsString(modelBuilder.Entity<RoleModel>(), x => x.RoleName); EnumAsString(modelBuilder.Entity<EmployeeModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<MembershipTierModel>(), x => x.Name); EnumAsString(modelBuilder.Entity<DamageLevelModel>(), x => x.Level); EnumAsString(modelBuilder.Entity<DamageLevelModel>(), x => x.CopyStatusAfter); EnumAsString(modelBuilder.Entity<EditionModel>(), x => x.MetadataSource); EnumAsString(modelBuilder.Entity<StockReceiptModel>(), x => x.SourceType); EnumAsString(modelBuilder.Entity<StockReceiptModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<StockReceiptLineModel>(), x => x.Availability); EnumAsString(modelBuilder.Entity<StockReceiptLineModel>(), x => x.ConditionGrade); EnumAsString(modelBuilder.Entity<BookCopyModel>(), x => x.Availability); EnumAsString(modelBuilder.Entity<BookCopyModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<BookCopyModel>(), x => x.ConditionGrade); EnumAsString(modelBuilder.Entity<InventoryCheckModel>(), x => x.ExpectedStatus); EnumAsString(modelBuilder.Entity<InventoryCheckModel>(), x => x.ObservedStatus); EnumAsString(modelBuilder.Entity<InventoryCheckModel>(), x => x.VarianceType); EnumAsString(modelBuilder.Entity<InventoryAdjustmentRequestModel>(), x => x.RequestedStatus); EnumAsString(modelBuilder.Entity<InventoryAdjustmentRequestModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<SaleInvoiceModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<SaleInvoiceLineModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<RentalSlipModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<ReturnModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<RentalLineModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<RentalLineModel>(), x => x.CopyCondition); EnumAsString(modelBuilder.Entity<CashSessionModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<PaymentModel>(), x => x.Direction); EnumAsString(modelBuilder.Entity<PaymentModel>(), x => x.PaymentType); EnumAsString(modelBuilder.Entity<PaymentModel>(), x => x.Method); EnumAsString(modelBuilder.Entity<PaymentModel>(), x => x.Status); EnumAsString(modelBuilder.Entity<EmployeeWorkRecordModel>(), x => x.AttendanceStatus); EnumAsString(modelBuilder.Entity<EmployeeWorkRecordModel>(), x => x.PaymentStatus); EnumAsString(modelBuilder.Entity<NotificationOutboxModel>(), x => x.Channel); EnumAsString(modelBuilder.Entity<NotificationOutboxModel>(), x => x.RecipientType); EnumAsString(modelBuilder.Entity<NotificationOutboxModel>(), x => x.Status);
    }

    private static void EnumAsString<TEntity, TProperty>(EntityTypeBuilder<TEntity> entity, Expression<Func<TEntity, TProperty>> property) where TEntity : class => entity.Property(property).HasConversion<string>();

    private void EnsureAuditLogsAreAppendOnly()
    {
        var auditWasChanged = ChangeTracker.Entries<AuditLogModel>()
            .Any(entry => entry.State is EntityState.Modified or EntityState.Deleted);
        if (auditWasChanged)
            throw new InvalidOperationException("Audit logs are append-only and cannot be changed or deleted.");
    }
}
