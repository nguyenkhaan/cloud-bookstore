using System;
using System.Net;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.src.Data.Migrations
{
    /// <inheritdoc />
    public partial class DatabaseSchemaPhase0 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_Employee",
                table: "Employee");

            migrationBuilder.RenameTable(
                name: "Employee",
                newName: "employee");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "employee",
                newName: "Status");

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "employee",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AddColumn<string>(
                name: "AvatarUrl",
                table: "employee",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "employee",
                type: "character varying(12)",
                maxLength: 12,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "RoleId",
                table: "employee",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddPrimaryKey(
                name: "PK_employee",
                table: "employee",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OccurredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ActorId = table.Column<Guid>(type: "uuid", nullable: true),
                    IpAddress = table.Column<IPAddress>(type: "inet", nullable: true),
                    Action = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    EntityType = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    EntityId = table.Column<Guid>(type: "uuid", nullable: false),
                    BeforeData = table.Column<string>(type: "text", nullable: true),
                    AfterData = table.Column<string>(type: "text", nullable: true),
                    Reason = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_logs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "book_copies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CopyBarcode = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    EditionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Availability = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ConditionGrade = table.Column<string>(type: "text", nullable: false),
                    ConditionNote = table.Column<string>(type: "text", nullable: true),
                    CostPrice = table.Column<long>(type: "bigint", nullable: false),
                    SellingPrice = table.Column<long>(type: "bigint", nullable: true),
                    ShelfCode = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    ReceiptLineId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_book_copies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "cash_sessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OpenedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    OpenedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    OpeningBalance = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ClosingExpected = table.Column<long>(type: "bigint", nullable: true),
                    ClosingCounted = table.Column<long>(type: "bigint", nullable: true),
                    VarianceNote = table.Column<string>(type: "text", nullable: true),
                    VarianceApprovedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ClosedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ClosedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cash_sessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "categories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ParentId = table.Column<Guid>(type: "uuid", nullable: true),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "damage_levels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Level = table.Column<string>(type: "text", nullable: false),
                    PenaltyPct = table.Column<decimal>(type: "numeric", nullable: false),
                    CopyStatusAfter = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_damage_levels", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "edition",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Isbn = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    TitleId = table.Column<Guid>(type: "uuid", nullable: false),
                    EditionStatement = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PrintingStatement = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Format = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Publisher = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    PublishYear = table.Column<short>(type: "smallint", nullable: true),
                    CoverPrice = table.Column<long>(type: "bigint", nullable: false),
                    DefaultRentPrice = table.Column<long>(type: "bigint", nullable: true),
                    MinStockSale = table.Column<int>(type: "integer", nullable: false),
                    MinStockRental = table.Column<int>(type: "integer", nullable: false),
                    CoverImageUrl = table.Column<string>(type: "text", nullable: true),
                    MetadataSource = table.Column<string>(type: "text", nullable: true),
                    MetadataConfirmedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    MetadataConfirmedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_edition", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "employee_work_records",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ShiftNo = table.Column<short>(type: "smallint", nullable: false),
                    CheckInAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CheckOutAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AttendanceStatus = table.Column<string>(type: "text", nullable: false),
                    WorkedMinutes = table.Column<int>(type: "integer", nullable: false),
                    OvertimeMinutes = table.Column<int>(type: "integer", nullable: false),
                    ShiftSalary = table.Column<long>(type: "bigint", nullable: false),
                    PaymentStatus = table.Column<string>(type: "text", nullable: false),
                    AdjustmentReason = table.Column<string>(type: "text", nullable: true),
                    ApprovedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_employee_work_records", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "inventory_adjustment_requests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InventoryCheckId = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestedStatus = table.Column<string>(type: "text", nullable: false),
                    Reason = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    RequestedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ApprovedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RejectionReason = table.Column<string>(type: "text", nullable: true),
                    AppliedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inventory_adjustment_requests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "inventory_checks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CheckCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CopyId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExpectedStatus = table.Column<string>(type: "text", nullable: false),
                    ObservedStatus = table.Column<string>(type: "text", nullable: true),
                    IsFound = table.Column<bool>(type: "boolean", nullable: false),
                    VarianceType = table.Column<string>(type: "text", nullable: true),
                    Note = table.Column<string>(type: "text", nullable: true),
                    CheckedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CheckedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inventory_checks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "membership_tiers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    RankOrder = table.Column<long>(type: "bigint", nullable: false),
                    MinSpend = table.Column<long>(type: "bigint", nullable: false),
                    MaxBooks = table.Column<int>(type: "integer", nullable: false),
                    MaxRentalDays = table.Column<short>(type: "smallint", nullable: false),
                    RentDiscountPct = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    SaleDiscountPct = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_membership_tiers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "notification_outbox",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Channel = table.Column<string>(type: "text", nullable: false),
                    RecipientType = table.Column<string>(type: "text", nullable: false),
                    RecipientAddress = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    TemplateCode = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    Content = table.Column<string>(type: "text", nullable: false),
                    SourceEntityType = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    SourceEntityId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    AttemptCount = table.Column<short>(type: "smallint", nullable: false),
                    NextRetryAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ProviderMessageId = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    LastError = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notification_outbox", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "payments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentNo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IdempotencyKey = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Direction = table.Column<string>(type: "text", nullable: false),
                    PaymentType = table.Column<string>(type: "text", nullable: false),
                    Method = table.Column<string>(type: "text", nullable: false),
                    Amount = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CashSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    SaleInvoiceId = table.Column<Guid>(type: "uuid", nullable: true),
                    RentalSlipId = table.Column<Guid>(type: "uuid", nullable: true),
                    StockReceiptId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReturnId = table.Column<Guid>(type: "uuid", nullable: true),
                    WorkRecordId = table.Column<Guid>(type: "uuid", nullable: true),
                    CashReceived = table.Column<long>(type: "bigint", nullable: true),
                    QrReference = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    QrExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    BankReference = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "rental_extensions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RentalLineId = table.Column<Guid>(type: "uuid", nullable: false),
                    Seq = table.Column<short>(type: "smallint", nullable: false),
                    ExtendedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DaysAdded = table.Column<short>(type: "smallint", nullable: false),
                    ExtensionFee = table.Column<long>(type: "bigint", nullable: false),
                    LatePenaltyLocked = table.Column<long>(type: "bigint", nullable: false),
                    OldDueAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    NewDueAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PerformedBy = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rental_extensions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "rental_lines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SlipId = table.Column<Guid>(type: "uuid", nullable: false),
                    CopyId = table.Column<Guid>(type: "uuid", nullable: false),
                    DailyRate = table.Column<long>(type: "bigint", nullable: false),
                    BookPriceSnapshot = table.Column<long>(type: "bigint", nullable: false),
                    DepositAmount = table.Column<long>(type: "bigint", nullable: false),
                    RentDiscountPct = table.Column<decimal>(type: "numeric", nullable: false),
                    InitialDays = table.Column<short>(type: "smallint", nullable: false),
                    TotalDays = table.Column<short>(type: "smallint", nullable: false),
                    DueAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExtensionCount = table.Column<short>(type: "smallint", nullable: false),
                    BaseRentFee = table.Column<long>(type: "bigint", nullable: false),
                    ExtensionFeeTotal = table.Column<long>(type: "bigint", nullable: false),
                    LockedLatePenalty = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ReturnId = table.Column<Guid>(type: "uuid", nullable: true),
                    CopyCondition = table.Column<string>(type: "text", nullable: true),
                    DamageLevelId = table.Column<Guid>(type: "uuid", nullable: true),
                    DamageNote = table.Column<string>(type: "text", nullable: true),
                    DamageNeedsApproval = table.Column<bool>(type: "boolean", nullable: false),
                    DamageApprovedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    DamageApprovalReason = table.Column<string>(type: "text", nullable: true),
                    LateDays = table.Column<short>(type: "smallint", nullable: false),
                    ChargedRentFee = table.Column<long>(type: "bigint", nullable: false),
                    ChargedExtensionFee = table.Column<long>(type: "bigint", nullable: false),
                    ChargedLatePenalty = table.Column<long>(type: "bigint", nullable: false),
                    ChargedDamagePenalty = table.Column<long>(type: "bigint", nullable: false),
                    LostRetainedAmount = table.Column<long>(type: "bigint", nullable: false),
                    RefundAmount = table.Column<long>(type: "bigint", nullable: false),
                    AdditionalAmountDue = table.Column<long>(type: "bigint", nullable: false),
                    AdditionalAmountPaid = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rental_lines", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "rental_slips",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SlipNo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    TierId = table.Column<Guid>(type: "uuid", nullable: false),
                    RentDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ActivatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ClosedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rental_slips", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "returns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReturnNo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SlipId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ReturnedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    SettledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_returns", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "roles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleName = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "sale_invoice_lines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    CopyId = table.Column<Guid>(type: "uuid", nullable: false),
                    ListPrice = table.Column<long>(type: "bigint", nullable: false),
                    DiscountPct = table.Column<decimal>(type: "numeric", nullable: false),
                    DiscountAmount = table.Column<long>(type: "bigint", nullable: false),
                    FinalPrice = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sale_invoice_lines", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "sale_invoices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceNo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    CashSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Subtotal = table.Column<long>(type: "bigint", nullable: false),
                    DiscountTotal = table.Column<long>(type: "bigint", nullable: false),
                    TotalPayable = table.Column<long>(type: "bigint", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sale_invoices", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "stock_receipt_lines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReceiptId = table.Column<Guid>(type: "uuid", nullable: false),
                    EditionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Availability = table.Column<string>(type: "text", nullable: false),
                    ConditionGrade = table.Column<string>(type: "text", nullable: false),
                    ConditionNote = table.Column<string>(type: "text", nullable: true),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitCost = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stock_receipt_lines", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "stock_receipts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SourceType = table.Column<string>(type: "text", nullable: false),
                    SupplierId = table.Column<Guid>(type: "uuid", nullable: true),
                    SellerId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    TotalAmount = table.Column<long>(type: "bigint", nullable: false),
                    NeedsApproval = table.Column<bool>(type: "boolean", nullable: false),
                    ApprovedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RejectReason = table.Column<string>(type: "text", nullable: true),
                    Note = table.Column<string>(type: "text", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stock_receipts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "suppliers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Address = table.Column<string>(type: "text", nullable: true),
                    TaxCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_suppliers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "system_settings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Value = table.Column<decimal>(type: "numeric", nullable: false),
                    Unit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_system_settings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "titles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    VolumeLabel = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    Author = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    OriginalPublishYear = table.Column<short>(type: "smallint", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_titles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "customers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Phone = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    NationalId = table.Column<string>(type: "text", nullable: false),
                    Address = table.Column<string>(type: "text", nullable: false),
                    TierId = table.Column<Guid>(type: "uuid", nullable: false),
                    MembershipTierId = table.Column<Guid>(type: "uuid", nullable: false),
                    EligibleSpend = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_customers_membership_tiers_MembershipTierId",
                        column: x => x.MembershipTierId,
                        principalTable: "membership_tiers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_employee_RoleId",
                table: "employee",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_customers_MembershipTierId",
                table: "customers",
                column: "MembershipTierId");

            migrationBuilder.AddForeignKey(
                name: "FK_employee_roles_RoleId",
                table: "employee",
                column: "RoleId",
                principalTable: "roles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_employee_roles_RoleId",
                table: "employee");

            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "book_copies");

            migrationBuilder.DropTable(
                name: "cash_sessions");

            migrationBuilder.DropTable(
                name: "categories");

            migrationBuilder.DropTable(
                name: "customers");

            migrationBuilder.DropTable(
                name: "damage_levels");

            migrationBuilder.DropTable(
                name: "edition");

            migrationBuilder.DropTable(
                name: "employee_work_records");

            migrationBuilder.DropTable(
                name: "inventory_adjustment_requests");

            migrationBuilder.DropTable(
                name: "inventory_checks");

            migrationBuilder.DropTable(
                name: "notification_outbox");

            migrationBuilder.DropTable(
                name: "payments");

            migrationBuilder.DropTable(
                name: "rental_extensions");

            migrationBuilder.DropTable(
                name: "rental_lines");

            migrationBuilder.DropTable(
                name: "rental_slips");

            migrationBuilder.DropTable(
                name: "returns");

            migrationBuilder.DropTable(
                name: "roles");

            migrationBuilder.DropTable(
                name: "sale_invoice_lines");

            migrationBuilder.DropTable(
                name: "sale_invoices");

            migrationBuilder.DropTable(
                name: "stock_receipt_lines");

            migrationBuilder.DropTable(
                name: "stock_receipts");

            migrationBuilder.DropTable(
                name: "suppliers");

            migrationBuilder.DropTable(
                name: "system_settings");

            migrationBuilder.DropTable(
                name: "titles");

            migrationBuilder.DropTable(
                name: "membership_tiers");

            migrationBuilder.DropPrimaryKey(
                name: "PK_employee",
                table: "employee");

            migrationBuilder.DropIndex(
                name: "IX_employee_RoleId",
                table: "employee");

            migrationBuilder.DropColumn(
                name: "AvatarUrl",
                table: "employee");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "employee");

            migrationBuilder.DropColumn(
                name: "RoleId",
                table: "employee");

            migrationBuilder.RenameTable(
                name: "employee",
                newName: "Employee");

            migrationBuilder.RenameColumn(
                name: "Status",
                table: "Employee",
                newName: "Name");

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Employee",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);

            migrationBuilder.AddPrimaryKey(
                name: "PK_Employee",
                table: "Employee",
                column: "Id");
        }
    }
}
