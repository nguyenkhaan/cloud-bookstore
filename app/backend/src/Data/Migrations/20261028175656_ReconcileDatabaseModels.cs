using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.src.Data.Migrations
{
    /// <inheritdoc />
    public partial class ReconcileDatabaseModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_customers_membership_tiers_TierId",
                table: "customers");

            migrationBuilder.DropForeignKey(
                name: "FK_employee_roles_RoleId",
                table: "employee");

            migrationBuilder.DropColumn(
                name: "DefaultRentPrice",
                table: "edition");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "titles",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "titles",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SeriesId",
                table: "titles",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Value",
                table: "system_settings",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AlterColumn<long>(
                name: "TotalAmount",
                table: "stock_receipts",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "stock_receipts",
                type: "text",
                nullable: false,
                defaultValue: "DRAFT",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<bool>(
                name: "NeedsApproval",
                table: "stock_receipts",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "stock_receipts",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<int>(
                name: "Quantity",
                table: "stock_receipt_lines",
                type: "integer",
                nullable: false,
                defaultValue: 1,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "Availability",
                table: "stock_receipt_lines",
                type: "text",
                nullable: false,
                defaultValue: "BOTH",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<long>(
                name: "TotalPayable",
                table: "sale_invoices",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<long>(
                name: "Subtotal",
                table: "sale_invoices",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "sale_invoices",
                type: "text",
                nullable: false,
                defaultValue: "DRAFT",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<long>(
                name: "DiscountTotal",
                table: "sale_invoices",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "sale_invoices",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "sale_invoice_lines",
                type: "text",
                nullable: false,
                defaultValue: "ACTIVE",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<decimal>(
                name: "DiscountPct",
                table: "sale_invoice_lines",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AlterColumn<long>(
                name: "DiscountAmount",
                table: "sale_invoice_lines",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "roles",
                type: "boolean",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "returns",
                type: "text",
                nullable: false,
                defaultValue: "DRAFT",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<DateTime>(
                name: "ReturnedAt",
                table: "returns",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "rental_slips",
                type: "text",
                nullable: false,
                defaultValue: "DRAFT",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "rental_slips",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "rental_lines",
                type: "text",
                nullable: false,
                defaultValue: "PENDING_DEPOSIT",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<decimal>(
                name: "RentDiscountPct",
                table: "rental_lines",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AlterColumn<long>(
                name: "RefundAmount",
                table: "rental_lines",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<long>(
                name: "LostRetainedAmount",
                table: "rental_lines",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<long>(
                name: "LockedLatePenalty",
                table: "rental_lines",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<short>(
                name: "LateDays",
                table: "rental_lines",
                type: "smallint",
                nullable: false,
                defaultValue: (short)0,
                oldClrType: typeof(short),
                oldType: "smallint");

            migrationBuilder.AlterColumn<long>(
                name: "ExtensionFeeTotal",
                table: "rental_lines",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<short>(
                name: "ExtensionCount",
                table: "rental_lines",
                type: "smallint",
                nullable: false,
                defaultValue: (short)0,
                oldClrType: typeof(short),
                oldType: "smallint");

            migrationBuilder.AlterColumn<bool>(
                name: "DamageNeedsApproval",
                table: "rental_lines",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<long>(
                name: "ChargedRentFee",
                table: "rental_lines",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<long>(
                name: "ChargedLatePenalty",
                table: "rental_lines",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<long>(
                name: "ChargedExtensionFee",
                table: "rental_lines",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<long>(
                name: "ChargedDamagePenalty",
                table: "rental_lines",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<long>(
                name: "AdditionalAmountPaid",
                table: "rental_lines",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<long>(
                name: "AdditionalAmountDue",
                table: "rental_lines",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<long>(
                name: "LatePenaltyLocked",
                table: "rental_extensions",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<DateTime>(
                name: "ExtendedAt",
                table: "rental_extensions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "payments",
                type: "text",
                nullable: false,
                defaultValue: "PENDING",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "payments",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<Guid>(
                name: "CashSessionId",
                table: "payments",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "notification_outbox",
                type: "text",
                nullable: false,
                defaultValue: "PENDING",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "notification_outbox",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "Content",
                table: "notification_outbox",
                type: "jsonb",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<short>(
                name: "AttemptCount",
                table: "notification_outbox",
                type: "smallint",
                nullable: false,
                defaultValue: (short)0,
                oldClrType: typeof(short),
                oldType: "smallint");

            migrationBuilder.AlterColumn<decimal>(
                name: "SaleDiscountPct",
                table: "membership_tiers",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric(5,2)",
                oldPrecision: 5,
                oldScale: 2);

            migrationBuilder.AlterColumn<decimal>(
                name: "RentDiscountPct",
                table: "membership_tiers",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric(5,2)",
                oldPrecision: 5,
                oldScale: 2);

            migrationBuilder.AlterColumn<short>(
                name: "RankOrder",
                table: "membership_tiers",
                type: "smallint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<long>(
                name: "MinSpend",
                table: "membership_tiers",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<short>(
                name: "MaxBooks",
                table: "membership_tiers",
                type: "smallint",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<bool>(
                name: "IsFound",
                table: "inventory_checks",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CheckedAt",
                table: "inventory_checks",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "inventory_adjustment_requests",
                type: "text",
                nullable: false,
                defaultValue: "PENDING_APPROVAL",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<DateTime>(
                name: "RequestedAt",
                table: "inventory_adjustment_requests",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<int>(
                name: "WorkedMinutes",
                table: "employee_work_records",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "employee_work_records",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<long>(
                name: "ShiftSalary",
                table: "employee_work_records",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<short>(
                name: "ShiftNo",
                table: "employee_work_records",
                type: "smallint",
                nullable: false,
                defaultValue: (short)1,
                oldClrType: typeof(short),
                oldType: "smallint");

            migrationBuilder.AlterColumn<string>(
                name: "PaymentStatus",
                table: "employee_work_records",
                type: "text",
                nullable: false,
                defaultValue: "UNPAID",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<int>(
                name: "OvertimeMinutes",
                table: "employee_work_records",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "employee_work_records",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "AttendanceStatus",
                table: "employee_work_records",
                type: "text",
                nullable: false,
                defaultValue: "PRESENT",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<int>(
                name: "MinStockSale",
                table: "edition",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "MinStockRental",
                table: "edition",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "edition",
                type: "boolean",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<decimal>(
                name: "PenaltyPct",
                table: "damage_levels",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AlterColumn<string>(
                name: "CopyStatusAfter",
                table: "damage_levels",
                type: "text",
                nullable: false,
                defaultValue: "DAMAGED",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Phone",
                table: "customers",
                type: "character varying(15)",
                maxLength: 15,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(12)",
                oldMaxLength: 12);

            migrationBuilder.AlterColumn<string>(
                name: "NationalId",
                table: "customers",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<bool>(
                name: "IsFlagged",
                table: "customers",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<string>(
                name: "FullName",
                table: "customers",
                type: "character varying(150)",
                maxLength: 150,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "FlagReason",
                table: "customers",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "customers",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<long>(
                name: "EligibleSpend",
                table: "customers",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "Address",
                table: "customers",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "cash_sessions",
                type: "text",
                nullable: false,
                defaultValue: "OPEN",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<DateTime>(
                name: "OpenedAt",
                table: "cash_sessions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "book_copies",
                type: "text",
                nullable: false,
                defaultValue: "PENDING_RECEIPT",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "book_copies",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "Availability",
                table: "book_copies",
                type: "text",
                nullable: false,
                defaultValue: "BOTH",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<long>(
                name: "RentalRate",
                table: "book_copies",
                type: "bigint",
                nullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "OccurredAt",
                table: "audit_logs",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "BeforeData",
                table: "audit_logs",
                type: "jsonb",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AfterData",
                table: "audit_logs",
                type: "jsonb",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "book_series",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_book_series", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_titles_CategoryId",
                table: "titles",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_titles_SeriesId",
                table: "titles",
                column: "SeriesId");

            migrationBuilder.CreateIndex(
                name: "IX_system_settings_Key",
                table: "system_settings",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_system_settings_UpdatedBy",
                table: "system_settings",
                column: "UpdatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_suppliers_TaxCode",
                table: "suppliers",
                column: "TaxCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_stock_receipts_ApprovedBy",
                table: "stock_receipts",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_stock_receipts_Code",
                table: "stock_receipts",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_stock_receipts_CreatedBy",
                table: "stock_receipts",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_stock_receipts_SellerId",
                table: "stock_receipts",
                column: "SellerId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_receipts_SupplierId",
                table: "stock_receipts",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_receipt_lines_EditionId",
                table: "stock_receipt_lines",
                column: "EditionId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_receipt_lines_ReceiptId",
                table: "stock_receipt_lines",
                column: "ReceiptId");

            migrationBuilder.CreateIndex(
                name: "IX_sale_invoices_CashSessionId",
                table: "sale_invoices",
                column: "CashSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_sale_invoices_CreatedBy",
                table: "sale_invoices",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_sale_invoices_CustomerId",
                table: "sale_invoices",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_sale_invoices_InvoiceNo",
                table: "sale_invoices",
                column: "InvoiceNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sale_invoice_lines_InvoiceId",
                table: "sale_invoice_lines",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "uq_sale_line_active_copy",
                table: "sale_invoice_lines",
                column: "CopyId",
                unique: true,
                filter: "\"Status\" = 'ACTIVE'");

            migrationBuilder.CreateIndex(
                name: "IX_roles_RoleName",
                table: "roles",
                column: "RoleName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_returns_CreatedBy",
                table: "returns",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_returns_ReturnNo",
                table: "returns",
                column: "ReturnNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_returns_SlipId",
                table: "returns",
                column: "SlipId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_rental_slips_CreatedBy",
                table: "rental_slips",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_rental_slips_CustomerId",
                table: "rental_slips",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_rental_slips_SlipNo",
                table: "rental_slips",
                column: "SlipNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_rental_slips_TierId",
                table: "rental_slips",
                column: "TierId");

            migrationBuilder.CreateIndex(
                name: "IX_rental_lines_DamageApprovedBy",
                table: "rental_lines",
                column: "DamageApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_rental_lines_DamageLevelId",
                table: "rental_lines",
                column: "DamageLevelId");

            migrationBuilder.CreateIndex(
                name: "ix_rental_lines_due",
                table: "rental_lines",
                column: "DueAt",
                filter: "\"Status\" = 'RENTING'");

            migrationBuilder.CreateIndex(
                name: "IX_rental_lines_ReturnId",
                table: "rental_lines",
                column: "ReturnId");

            migrationBuilder.CreateIndex(
                name: "IX_rental_lines_SlipId",
                table: "rental_lines",
                column: "SlipId");

            migrationBuilder.CreateIndex(
                name: "uq_rental_line_active_copy",
                table: "rental_lines",
                column: "CopyId",
                unique: true,
                filter: "\"Status\" IN ('PENDING_DEPOSIT', 'RENTING')");

            migrationBuilder.CreateIndex(
                name: "IX_rental_extensions_PerformedBy",
                table: "rental_extensions",
                column: "PerformedBy");

            migrationBuilder.CreateIndex(
                name: "IX_rental_extensions_RentalLineId_Seq",
                table: "rental_extensions",
                columns: new[] { "RentalLineId", "Seq" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payments_CashSessionId",
                table: "payments",
                column: "CashSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_CreatedBy",
                table: "payments",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_payments_IdempotencyKey",
                table: "payments",
                column: "IdempotencyKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payments_PaymentNo",
                table: "payments",
                column: "PaymentNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payments_QrReference",
                table: "payments",
                column: "QrReference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payments_RentalSlipId",
                table: "payments",
                column: "RentalSlipId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_ReturnId",
                table: "payments",
                column: "ReturnId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_SaleInvoiceId",
                table: "payments",
                column: "SaleInvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_StockReceiptId",
                table: "payments",
                column: "StockReceiptId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_WorkRecordId",
                table: "payments",
                column: "WorkRecordId");

            migrationBuilder.CreateIndex(
                name: "IX_membership_tiers_Name",
                table: "membership_tiers",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_membership_tiers_RankOrder",
                table: "membership_tiers",
                column: "RankOrder",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_inventory_checks_CheckCode_CopyId",
                table: "inventory_checks",
                columns: new[] { "CheckCode", "CopyId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_inventory_checks_CheckedBy",
                table: "inventory_checks",
                column: "CheckedBy");

            migrationBuilder.CreateIndex(
                name: "IX_inventory_checks_CopyId",
                table: "inventory_checks",
                column: "CopyId");

            migrationBuilder.CreateIndex(
                name: "IX_inventory_adjustment_requests_ApprovedBy",
                table: "inventory_adjustment_requests",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_inventory_adjustment_requests_InventoryCheckId",
                table: "inventory_adjustment_requests",
                column: "InventoryCheckId");

            migrationBuilder.CreateIndex(
                name: "IX_inventory_adjustment_requests_RequestedBy",
                table: "inventory_adjustment_requests",
                column: "RequestedBy");

            migrationBuilder.CreateIndex(
                name: "IX_employee_work_records_ApprovedBy",
                table: "employee_work_records",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_employee_work_records_EmployeeId_WorkDate_ShiftNo",
                table: "employee_work_records",
                columns: new[] { "EmployeeId", "WorkDate", "ShiftNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_employee_Email",
                table: "employee",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_edition_isbn",
                table: "edition",
                column: "Isbn");

            migrationBuilder.CreateIndex(
                name: "IX_edition_MetadataConfirmedBy",
                table: "edition",
                column: "MetadataConfirmedBy");

            migrationBuilder.CreateIndex(
                name: "IX_edition_TitleId",
                table: "edition",
                column: "TitleId");

            migrationBuilder.CreateIndex(
                name: "IX_customers_Phone",
                table: "customers",
                column: "Phone",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_categories_ParentId",
                table: "categories",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_cash_sessions_ClosedBy",
                table: "cash_sessions",
                column: "ClosedBy");

            migrationBuilder.CreateIndex(
                name: "IX_cash_sessions_OpenedBy",
                table: "cash_sessions",
                column: "OpenedBy");

            migrationBuilder.CreateIndex(
                name: "IX_cash_sessions_VarianceApprovedBy",
                table: "cash_sessions",
                column: "VarianceApprovedBy");

            migrationBuilder.CreateIndex(
                name: "uq_cash_single_open",
                table: "cash_sessions",
                column: "Status",
                unique: true,
                filter: "\"Status\" <> 'CLOSED'");

            migrationBuilder.CreateIndex(
                name: "IX_book_copies_CopyBarcode",
                table: "book_copies",
                column: "CopyBarcode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_book_copies_EditionId",
                table: "book_copies",
                column: "EditionId");

            migrationBuilder.CreateIndex(
                name: "IX_book_copies_ReceiptLineId",
                table: "book_copies",
                column: "ReceiptLineId");

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_ActorId",
                table: "audit_logs",
                column: "ActorId");

            migrationBuilder.AddForeignKey(
                name: "FK_audit_logs_employee_ActorId",
                table: "audit_logs",
                column: "ActorId",
                principalTable: "employee",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_book_copies_edition_EditionId",
                table: "book_copies",
                column: "EditionId",
                principalTable: "edition",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_book_copies_stock_receipt_lines_ReceiptLineId",
                table: "book_copies",
                column: "ReceiptLineId",
                principalTable: "stock_receipt_lines",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_cash_sessions_employee_ClosedBy",
                table: "cash_sessions",
                column: "ClosedBy",
                principalTable: "employee",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_cash_sessions_employee_OpenedBy",
                table: "cash_sessions",
                column: "OpenedBy",
                principalTable: "employee",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_cash_sessions_employee_VarianceApprovedBy",
                table: "cash_sessions",
                column: "VarianceApprovedBy",
                principalTable: "employee",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_categories_categories_ParentId",
                table: "categories",
                column: "ParentId",
                principalTable: "categories",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_customers_membership_tiers_TierId",
                table: "customers",
                column: "TierId",
                principalTable: "membership_tiers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_edition_employee_MetadataConfirmedBy",
                table: "edition",
                column: "MetadataConfirmedBy",
                principalTable: "employee",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_edition_titles_TitleId",
                table: "edition",
                column: "TitleId",
                principalTable: "titles",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_employee_roles_RoleId",
                table: "employee",
                column: "RoleId",
                principalTable: "roles",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_employee_work_records_employee_ApprovedBy",
                table: "employee_work_records",
                column: "ApprovedBy",
                principalTable: "employee",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_employee_work_records_employee_EmployeeId",
                table: "employee_work_records",
                column: "EmployeeId",
                principalTable: "employee",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_inventory_adjustment_requests_employee_ApprovedBy",
                table: "inventory_adjustment_requests",
                column: "ApprovedBy",
                principalTable: "employee",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_inventory_adjustment_requests_employee_RequestedBy",
                table: "inventory_adjustment_requests",
                column: "RequestedBy",
                principalTable: "employee",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_inventory_adjustment_requests_inventory_checks_InventoryChe~",
                table: "inventory_adjustment_requests",
                column: "InventoryCheckId",
                principalTable: "inventory_checks",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_inventory_checks_book_copies_CopyId",
                table: "inventory_checks",
                column: "CopyId",
                principalTable: "book_copies",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_inventory_checks_employee_CheckedBy",
                table: "inventory_checks",
                column: "CheckedBy",
                principalTable: "employee",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_payments_cash_sessions_CashSessionId",
                table: "payments",
                column: "CashSessionId",
                principalTable: "cash_sessions",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_payments_employee_CreatedBy",
                table: "payments",
                column: "CreatedBy",
                principalTable: "employee",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_payments_employee_work_records_WorkRecordId",
                table: "payments",
                column: "WorkRecordId",
                principalTable: "employee_work_records",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_payments_rental_slips_RentalSlipId",
                table: "payments",
                column: "RentalSlipId",
                principalTable: "rental_slips",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_payments_returns_ReturnId",
                table: "payments",
                column: "ReturnId",
                principalTable: "returns",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_payments_sale_invoices_SaleInvoiceId",
                table: "payments",
                column: "SaleInvoiceId",
                principalTable: "sale_invoices",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_payments_stock_receipts_StockReceiptId",
                table: "payments",
                column: "StockReceiptId",
                principalTable: "stock_receipts",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_rental_extensions_employee_PerformedBy",
                table: "rental_extensions",
                column: "PerformedBy",
                principalTable: "employee",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_rental_extensions_rental_lines_RentalLineId",
                table: "rental_extensions",
                column: "RentalLineId",
                principalTable: "rental_lines",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_rental_lines_book_copies_CopyId",
                table: "rental_lines",
                column: "CopyId",
                principalTable: "book_copies",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_rental_lines_damage_levels_DamageLevelId",
                table: "rental_lines",
                column: "DamageLevelId",
                principalTable: "damage_levels",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_rental_lines_employee_DamageApprovedBy",
                table: "rental_lines",
                column: "DamageApprovedBy",
                principalTable: "employee",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_rental_lines_rental_slips_SlipId",
                table: "rental_lines",
                column: "SlipId",
                principalTable: "rental_slips",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_rental_lines_returns_ReturnId",
                table: "rental_lines",
                column: "ReturnId",
                principalTable: "returns",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_rental_slips_customers_CustomerId",
                table: "rental_slips",
                column: "CustomerId",
                principalTable: "customers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_rental_slips_employee_CreatedBy",
                table: "rental_slips",
                column: "CreatedBy",
                principalTable: "employee",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_rental_slips_membership_tiers_TierId",
                table: "rental_slips",
                column: "TierId",
                principalTable: "membership_tiers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_returns_employee_CreatedBy",
                table: "returns",
                column: "CreatedBy",
                principalTable: "employee",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_returns_rental_slips_SlipId",
                table: "returns",
                column: "SlipId",
                principalTable: "rental_slips",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_sale_invoice_lines_book_copies_CopyId",
                table: "sale_invoice_lines",
                column: "CopyId",
                principalTable: "book_copies",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_sale_invoice_lines_sale_invoices_InvoiceId",
                table: "sale_invoice_lines",
                column: "InvoiceId",
                principalTable: "sale_invoices",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_sale_invoices_cash_sessions_CashSessionId",
                table: "sale_invoices",
                column: "CashSessionId",
                principalTable: "cash_sessions",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_sale_invoices_customers_CustomerId",
                table: "sale_invoices",
                column: "CustomerId",
                principalTable: "customers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_sale_invoices_employee_CreatedBy",
                table: "sale_invoices",
                column: "CreatedBy",
                principalTable: "employee",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_stock_receipt_lines_edition_EditionId",
                table: "stock_receipt_lines",
                column: "EditionId",
                principalTable: "edition",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_stock_receipt_lines_stock_receipts_ReceiptId",
                table: "stock_receipt_lines",
                column: "ReceiptId",
                principalTable: "stock_receipts",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_stock_receipts_customers_SellerId",
                table: "stock_receipts",
                column: "SellerId",
                principalTable: "customers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_stock_receipts_employee_ApprovedBy",
                table: "stock_receipts",
                column: "ApprovedBy",
                principalTable: "employee",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_stock_receipts_employee_CreatedBy",
                table: "stock_receipts",
                column: "CreatedBy",
                principalTable: "employee",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_stock_receipts_suppliers_SupplierId",
                table: "stock_receipts",
                column: "SupplierId",
                principalTable: "suppliers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_system_settings_employee_UpdatedBy",
                table: "system_settings",
                column: "UpdatedBy",
                principalTable: "employee",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_titles_book_series_SeriesId",
                table: "titles",
                column: "SeriesId",
                principalTable: "book_series",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_titles_categories_CategoryId",
                table: "titles",
                column: "CategoryId",
                principalTable: "categories",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_audit_logs_employee_ActorId",
                table: "audit_logs");

            migrationBuilder.DropForeignKey(
                name: "FK_book_copies_edition_EditionId",
                table: "book_copies");

            migrationBuilder.DropForeignKey(
                name: "FK_book_copies_stock_receipt_lines_ReceiptLineId",
                table: "book_copies");

            migrationBuilder.DropForeignKey(
                name: "FK_cash_sessions_employee_ClosedBy",
                table: "cash_sessions");

            migrationBuilder.DropForeignKey(
                name: "FK_cash_sessions_employee_OpenedBy",
                table: "cash_sessions");

            migrationBuilder.DropForeignKey(
                name: "FK_cash_sessions_employee_VarianceApprovedBy",
                table: "cash_sessions");

            migrationBuilder.DropForeignKey(
                name: "FK_categories_categories_ParentId",
                table: "categories");

            migrationBuilder.DropForeignKey(
                name: "FK_customers_membership_tiers_TierId",
                table: "customers");

            migrationBuilder.DropForeignKey(
                name: "FK_edition_employee_MetadataConfirmedBy",
                table: "edition");

            migrationBuilder.DropForeignKey(
                name: "FK_edition_titles_TitleId",
                table: "edition");

            migrationBuilder.DropForeignKey(
                name: "FK_employee_roles_RoleId",
                table: "employee");

            migrationBuilder.DropForeignKey(
                name: "FK_employee_work_records_employee_ApprovedBy",
                table: "employee_work_records");

            migrationBuilder.DropForeignKey(
                name: "FK_employee_work_records_employee_EmployeeId",
                table: "employee_work_records");

            migrationBuilder.DropForeignKey(
                name: "FK_inventory_adjustment_requests_employee_ApprovedBy",
                table: "inventory_adjustment_requests");

            migrationBuilder.DropForeignKey(
                name: "FK_inventory_adjustment_requests_employee_RequestedBy",
                table: "inventory_adjustment_requests");

            migrationBuilder.DropForeignKey(
                name: "FK_inventory_adjustment_requests_inventory_checks_InventoryChe~",
                table: "inventory_adjustment_requests");

            migrationBuilder.DropForeignKey(
                name: "FK_inventory_checks_book_copies_CopyId",
                table: "inventory_checks");

            migrationBuilder.DropForeignKey(
                name: "FK_inventory_checks_employee_CheckedBy",
                table: "inventory_checks");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_cash_sessions_CashSessionId",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_employee_CreatedBy",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_employee_work_records_WorkRecordId",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_rental_slips_RentalSlipId",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_returns_ReturnId",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_sale_invoices_SaleInvoiceId",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_stock_receipts_StockReceiptId",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "FK_rental_extensions_employee_PerformedBy",
                table: "rental_extensions");

            migrationBuilder.DropForeignKey(
                name: "FK_rental_extensions_rental_lines_RentalLineId",
                table: "rental_extensions");

            migrationBuilder.DropForeignKey(
                name: "FK_rental_lines_book_copies_CopyId",
                table: "rental_lines");

            migrationBuilder.DropForeignKey(
                name: "FK_rental_lines_damage_levels_DamageLevelId",
                table: "rental_lines");

            migrationBuilder.DropForeignKey(
                name: "FK_rental_lines_employee_DamageApprovedBy",
                table: "rental_lines");

            migrationBuilder.DropForeignKey(
                name: "FK_rental_lines_rental_slips_SlipId",
                table: "rental_lines");

            migrationBuilder.DropForeignKey(
                name: "FK_rental_lines_returns_ReturnId",
                table: "rental_lines");

            migrationBuilder.DropForeignKey(
                name: "FK_rental_slips_customers_CustomerId",
                table: "rental_slips");

            migrationBuilder.DropForeignKey(
                name: "FK_rental_slips_employee_CreatedBy",
                table: "rental_slips");

            migrationBuilder.DropForeignKey(
                name: "FK_rental_slips_membership_tiers_TierId",
                table: "rental_slips");

            migrationBuilder.DropForeignKey(
                name: "FK_returns_employee_CreatedBy",
                table: "returns");

            migrationBuilder.DropForeignKey(
                name: "FK_returns_rental_slips_SlipId",
                table: "returns");

            migrationBuilder.DropForeignKey(
                name: "FK_sale_invoice_lines_book_copies_CopyId",
                table: "sale_invoice_lines");

            migrationBuilder.DropForeignKey(
                name: "FK_sale_invoice_lines_sale_invoices_InvoiceId",
                table: "sale_invoice_lines");

            migrationBuilder.DropForeignKey(
                name: "FK_sale_invoices_cash_sessions_CashSessionId",
                table: "sale_invoices");

            migrationBuilder.DropForeignKey(
                name: "FK_sale_invoices_customers_CustomerId",
                table: "sale_invoices");

            migrationBuilder.DropForeignKey(
                name: "FK_sale_invoices_employee_CreatedBy",
                table: "sale_invoices");

            migrationBuilder.DropForeignKey(
                name: "FK_stock_receipt_lines_edition_EditionId",
                table: "stock_receipt_lines");

            migrationBuilder.DropForeignKey(
                name: "FK_stock_receipt_lines_stock_receipts_ReceiptId",
                table: "stock_receipt_lines");

            migrationBuilder.DropForeignKey(
                name: "FK_stock_receipts_customers_SellerId",
                table: "stock_receipts");

            migrationBuilder.DropForeignKey(
                name: "FK_stock_receipts_employee_ApprovedBy",
                table: "stock_receipts");

            migrationBuilder.DropForeignKey(
                name: "FK_stock_receipts_employee_CreatedBy",
                table: "stock_receipts");

            migrationBuilder.DropForeignKey(
                name: "FK_stock_receipts_suppliers_SupplierId",
                table: "stock_receipts");

            migrationBuilder.DropForeignKey(
                name: "FK_system_settings_employee_UpdatedBy",
                table: "system_settings");

            migrationBuilder.DropForeignKey(
                name: "FK_titles_book_series_SeriesId",
                table: "titles");

            migrationBuilder.DropForeignKey(
                name: "FK_titles_categories_CategoryId",
                table: "titles");

            migrationBuilder.DropTable(
                name: "book_series");

            migrationBuilder.DropIndex(
                name: "IX_titles_CategoryId",
                table: "titles");

            migrationBuilder.DropIndex(
                name: "IX_titles_SeriesId",
                table: "titles");

            migrationBuilder.DropIndex(
                name: "IX_system_settings_Key",
                table: "system_settings");

            migrationBuilder.DropIndex(
                name: "IX_system_settings_UpdatedBy",
                table: "system_settings");

            migrationBuilder.DropIndex(
                name: "IX_suppliers_TaxCode",
                table: "suppliers");

            migrationBuilder.DropIndex(
                name: "IX_stock_receipts_ApprovedBy",
                table: "stock_receipts");

            migrationBuilder.DropIndex(
                name: "IX_stock_receipts_Code",
                table: "stock_receipts");

            migrationBuilder.DropIndex(
                name: "IX_stock_receipts_CreatedBy",
                table: "stock_receipts");

            migrationBuilder.DropIndex(
                name: "IX_stock_receipts_SellerId",
                table: "stock_receipts");

            migrationBuilder.DropIndex(
                name: "IX_stock_receipts_SupplierId",
                table: "stock_receipts");

            migrationBuilder.DropIndex(
                name: "IX_stock_receipt_lines_EditionId",
                table: "stock_receipt_lines");

            migrationBuilder.DropIndex(
                name: "IX_stock_receipt_lines_ReceiptId",
                table: "stock_receipt_lines");

            migrationBuilder.DropIndex(
                name: "IX_sale_invoices_CashSessionId",
                table: "sale_invoices");

            migrationBuilder.DropIndex(
                name: "IX_sale_invoices_CreatedBy",
                table: "sale_invoices");

            migrationBuilder.DropIndex(
                name: "IX_sale_invoices_CustomerId",
                table: "sale_invoices");

            migrationBuilder.DropIndex(
                name: "IX_sale_invoices_InvoiceNo",
                table: "sale_invoices");

            migrationBuilder.DropIndex(
                name: "IX_sale_invoice_lines_InvoiceId",
                table: "sale_invoice_lines");

            migrationBuilder.DropIndex(
                name: "uq_sale_line_active_copy",
                table: "sale_invoice_lines");

            migrationBuilder.DropIndex(
                name: "IX_roles_RoleName",
                table: "roles");

            migrationBuilder.DropIndex(
                name: "IX_returns_CreatedBy",
                table: "returns");

            migrationBuilder.DropIndex(
                name: "IX_returns_ReturnNo",
                table: "returns");

            migrationBuilder.DropIndex(
                name: "IX_returns_SlipId",
                table: "returns");

            migrationBuilder.DropIndex(
                name: "IX_rental_slips_CreatedBy",
                table: "rental_slips");

            migrationBuilder.DropIndex(
                name: "IX_rental_slips_CustomerId",
                table: "rental_slips");

            migrationBuilder.DropIndex(
                name: "IX_rental_slips_SlipNo",
                table: "rental_slips");

            migrationBuilder.DropIndex(
                name: "IX_rental_slips_TierId",
                table: "rental_slips");

            migrationBuilder.DropIndex(
                name: "IX_rental_lines_DamageApprovedBy",
                table: "rental_lines");

            migrationBuilder.DropIndex(
                name: "IX_rental_lines_DamageLevelId",
                table: "rental_lines");

            migrationBuilder.DropIndex(
                name: "ix_rental_lines_due",
                table: "rental_lines");

            migrationBuilder.DropIndex(
                name: "IX_rental_lines_ReturnId",
                table: "rental_lines");

            migrationBuilder.DropIndex(
                name: "IX_rental_lines_SlipId",
                table: "rental_lines");

            migrationBuilder.DropIndex(
                name: "uq_rental_line_active_copy",
                table: "rental_lines");

            migrationBuilder.DropIndex(
                name: "IX_rental_extensions_PerformedBy",
                table: "rental_extensions");

            migrationBuilder.DropIndex(
                name: "IX_rental_extensions_RentalLineId_Seq",
                table: "rental_extensions");

            migrationBuilder.DropIndex(
                name: "IX_payments_CashSessionId",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_payments_CreatedBy",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_payments_IdempotencyKey",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_payments_PaymentNo",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_payments_QrReference",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_payments_RentalSlipId",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_payments_ReturnId",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_payments_SaleInvoiceId",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_payments_StockReceiptId",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_payments_WorkRecordId",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_membership_tiers_Name",
                table: "membership_tiers");

            migrationBuilder.DropIndex(
                name: "IX_membership_tiers_RankOrder",
                table: "membership_tiers");

            migrationBuilder.DropIndex(
                name: "IX_inventory_checks_CheckCode_CopyId",
                table: "inventory_checks");

            migrationBuilder.DropIndex(
                name: "IX_inventory_checks_CheckedBy",
                table: "inventory_checks");

            migrationBuilder.DropIndex(
                name: "IX_inventory_checks_CopyId",
                table: "inventory_checks");

            migrationBuilder.DropIndex(
                name: "IX_inventory_adjustment_requests_ApprovedBy",
                table: "inventory_adjustment_requests");

            migrationBuilder.DropIndex(
                name: "IX_inventory_adjustment_requests_InventoryCheckId",
                table: "inventory_adjustment_requests");

            migrationBuilder.DropIndex(
                name: "IX_inventory_adjustment_requests_RequestedBy",
                table: "inventory_adjustment_requests");

            migrationBuilder.DropIndex(
                name: "IX_employee_work_records_ApprovedBy",
                table: "employee_work_records");

            migrationBuilder.DropIndex(
                name: "IX_employee_work_records_EmployeeId_WorkDate_ShiftNo",
                table: "employee_work_records");

            migrationBuilder.DropIndex(
                name: "IX_employee_Email",
                table: "employee");

            migrationBuilder.DropIndex(
                name: "ix_edition_isbn",
                table: "edition");

            migrationBuilder.DropIndex(
                name: "IX_edition_MetadataConfirmedBy",
                table: "edition");

            migrationBuilder.DropIndex(
                name: "IX_edition_TitleId",
                table: "edition");

            migrationBuilder.DropIndex(
                name: "IX_customers_Phone",
                table: "customers");

            migrationBuilder.DropIndex(
                name: "IX_categories_ParentId",
                table: "categories");

            migrationBuilder.DropIndex(
                name: "IX_cash_sessions_ClosedBy",
                table: "cash_sessions");

            migrationBuilder.DropIndex(
                name: "IX_cash_sessions_OpenedBy",
                table: "cash_sessions");

            migrationBuilder.DropIndex(
                name: "IX_cash_sessions_VarianceApprovedBy",
                table: "cash_sessions");

            migrationBuilder.DropIndex(
                name: "uq_cash_single_open",
                table: "cash_sessions");

            migrationBuilder.DropIndex(
                name: "IX_book_copies_CopyBarcode",
                table: "book_copies");

            migrationBuilder.DropIndex(
                name: "IX_book_copies_EditionId",
                table: "book_copies");

            migrationBuilder.DropIndex(
                name: "IX_book_copies_ReceiptLineId",
                table: "book_copies");

            migrationBuilder.DropIndex(
                name: "IX_audit_logs_ActorId",
                table: "audit_logs");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "titles");

            migrationBuilder.DropColumn(
                name: "SeriesId",
                table: "titles");

            migrationBuilder.DropColumn(
                name: "RentalRate",
                table: "book_copies");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "titles",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<decimal>(
                name: "Value",
                table: "system_settings",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,4)",
                oldPrecision: 18,
                oldScale: 4);

            migrationBuilder.AlterColumn<long>(
                name: "TotalAmount",
                table: "stock_receipts",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldDefaultValue: 0L);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "stock_receipts",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "DRAFT");

            migrationBuilder.AlterColumn<bool>(
                name: "NeedsApproval",
                table: "stock_receipts",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "stock_receipts",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<int>(
                name: "Quantity",
                table: "stock_receipt_lines",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 1);

            migrationBuilder.AlterColumn<string>(
                name: "Availability",
                table: "stock_receipt_lines",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "BOTH");

            migrationBuilder.AlterColumn<long>(
                name: "TotalPayable",
                table: "sale_invoices",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldDefaultValue: 0L);

            migrationBuilder.AlterColumn<long>(
                name: "Subtotal",
                table: "sale_invoices",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldDefaultValue: 0L);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "sale_invoices",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "DRAFT");

            migrationBuilder.AlterColumn<long>(
                name: "DiscountTotal",
                table: "sale_invoices",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldDefaultValue: 0L);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "sale_invoices",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "sale_invoice_lines",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "ACTIVE");

            migrationBuilder.AlterColumn<decimal>(
                name: "DiscountPct",
                table: "sale_invoice_lines",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(5,2)",
                oldPrecision: 5,
                oldScale: 2,
                oldDefaultValue: 0m);

            migrationBuilder.AlterColumn<long>(
                name: "DiscountAmount",
                table: "sale_invoice_lines",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldDefaultValue: 0L);

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "roles",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: true);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "returns",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "DRAFT");

            migrationBuilder.AlterColumn<DateTime>(
                name: "ReturnedAt",
                table: "returns",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "rental_slips",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "DRAFT");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "rental_slips",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "rental_lines",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "PENDING_DEPOSIT");

            migrationBuilder.AlterColumn<decimal>(
                name: "RentDiscountPct",
                table: "rental_lines",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(5,2)",
                oldPrecision: 5,
                oldScale: 2,
                oldDefaultValue: 0m);

            migrationBuilder.AlterColumn<long>(
                name: "RefundAmount",
                table: "rental_lines",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldDefaultValue: 0L);

            migrationBuilder.AlterColumn<long>(
                name: "LostRetainedAmount",
                table: "rental_lines",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldDefaultValue: 0L);

            migrationBuilder.AlterColumn<long>(
                name: "LockedLatePenalty",
                table: "rental_lines",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldDefaultValue: 0L);

            migrationBuilder.AlterColumn<short>(
                name: "LateDays",
                table: "rental_lines",
                type: "smallint",
                nullable: false,
                oldClrType: typeof(short),
                oldType: "smallint",
                oldDefaultValue: (short)0);

            migrationBuilder.AlterColumn<long>(
                name: "ExtensionFeeTotal",
                table: "rental_lines",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldDefaultValue: 0L);

            migrationBuilder.AlterColumn<short>(
                name: "ExtensionCount",
                table: "rental_lines",
                type: "smallint",
                nullable: false,
                oldClrType: typeof(short),
                oldType: "smallint",
                oldDefaultValue: (short)0);

            migrationBuilder.AlterColumn<bool>(
                name: "DamageNeedsApproval",
                table: "rental_lines",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<long>(
                name: "ChargedRentFee",
                table: "rental_lines",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldDefaultValue: 0L);

            migrationBuilder.AlterColumn<long>(
                name: "ChargedLatePenalty",
                table: "rental_lines",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldDefaultValue: 0L);

            migrationBuilder.AlterColumn<long>(
                name: "ChargedExtensionFee",
                table: "rental_lines",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldDefaultValue: 0L);

            migrationBuilder.AlterColumn<long>(
                name: "ChargedDamagePenalty",
                table: "rental_lines",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldDefaultValue: 0L);

            migrationBuilder.AlterColumn<long>(
                name: "AdditionalAmountPaid",
                table: "rental_lines",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldDefaultValue: 0L);

            migrationBuilder.AlterColumn<long>(
                name: "AdditionalAmountDue",
                table: "rental_lines",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldDefaultValue: 0L);

            migrationBuilder.AlterColumn<long>(
                name: "LatePenaltyLocked",
                table: "rental_extensions",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldDefaultValue: 0L);

            migrationBuilder.AlterColumn<DateTime>(
                name: "ExtendedAt",
                table: "rental_extensions",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "payments",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "PENDING");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "payments",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<Guid>(
                name: "CashSessionId",
                table: "payments",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "notification_outbox",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "PENDING");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "notification_outbox",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<string>(
                name: "Content",
                table: "notification_outbox",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "jsonb");

            migrationBuilder.AlterColumn<short>(
                name: "AttemptCount",
                table: "notification_outbox",
                type: "smallint",
                nullable: false,
                oldClrType: typeof(short),
                oldType: "smallint",
                oldDefaultValue: (short)0);

            migrationBuilder.AlterColumn<decimal>(
                name: "SaleDiscountPct",
                table: "membership_tiers",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(5,2)",
                oldPrecision: 5,
                oldScale: 2,
                oldDefaultValue: 0m);

            migrationBuilder.AlterColumn<decimal>(
                name: "RentDiscountPct",
                table: "membership_tiers",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(5,2)",
                oldPrecision: 5,
                oldScale: 2,
                oldDefaultValue: 0m);

            migrationBuilder.AlterColumn<long>(
                name: "RankOrder",
                table: "membership_tiers",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(short),
                oldType: "smallint");

            migrationBuilder.AlterColumn<long>(
                name: "MinSpend",
                table: "membership_tiers",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldDefaultValue: 0L);

            migrationBuilder.AlterColumn<int>(
                name: "MaxBooks",
                table: "membership_tiers",
                type: "integer",
                nullable: false,
                oldClrType: typeof(short),
                oldType: "smallint");

            migrationBuilder.AlterColumn<bool>(
                name: "IsFound",
                table: "inventory_checks",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CheckedAt",
                table: "inventory_checks",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "inventory_adjustment_requests",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "PENDING_APPROVAL");

            migrationBuilder.AlterColumn<DateTime>(
                name: "RequestedAt",
                table: "inventory_adjustment_requests",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<int>(
                name: "WorkedMinutes",
                table: "employee_work_records",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 0);

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "employee_work_records",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<long>(
                name: "ShiftSalary",
                table: "employee_work_records",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldDefaultValue: 0L);

            migrationBuilder.AlterColumn<short>(
                name: "ShiftNo",
                table: "employee_work_records",
                type: "smallint",
                nullable: false,
                oldClrType: typeof(short),
                oldType: "smallint",
                oldDefaultValue: (short)1);

            migrationBuilder.AlterColumn<string>(
                name: "PaymentStatus",
                table: "employee_work_records",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "UNPAID");

            migrationBuilder.AlterColumn<int>(
                name: "OvertimeMinutes",
                table: "employee_work_records",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 0);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "employee_work_records",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<string>(
                name: "AttendanceStatus",
                table: "employee_work_records",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "PRESENT");

            migrationBuilder.AlterColumn<int>(
                name: "MinStockSale",
                table: "edition",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 0);

            migrationBuilder.AlterColumn<int>(
                name: "MinStockRental",
                table: "edition",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 0);

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "edition",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: true);

            migrationBuilder.AddColumn<long>(
                name: "DefaultRentPrice",
                table: "edition",
                type: "bigint",
                nullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "PenaltyPct",
                table: "damage_levels",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(5,2)",
                oldPrecision: 5,
                oldScale: 2);

            migrationBuilder.AlterColumn<string>(
                name: "CopyStatusAfter",
                table: "damage_levels",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "DAMAGED");

            migrationBuilder.AlterColumn<string>(
                name: "Phone",
                table: "customers",
                type: "character varying(12)",
                maxLength: 12,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(15)",
                oldMaxLength: 15);

            migrationBuilder.AlterColumn<string>(
                name: "NationalId",
                table: "customers",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "IsFlagged",
                table: "customers",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<string>(
                name: "FullName",
                table: "customers",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(150)",
                oldMaxLength: 150);

            migrationBuilder.AlterColumn<string>(
                name: "FlagReason",
                table: "customers",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "customers",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255,
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "EligibleSpend",
                table: "customers",
                type: "integer",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldDefaultValue: 0L);

            migrationBuilder.AlterColumn<string>(
                name: "Address",
                table: "customers",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "cash_sessions",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "OPEN");

            migrationBuilder.AlterColumn<DateTime>(
                name: "OpenedAt",
                table: "cash_sessions",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "book_copies",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "PENDING_RECEIPT");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "book_copies",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<string>(
                name: "Availability",
                table: "book_copies",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "BOTH");

            migrationBuilder.AlterColumn<DateTime>(
                name: "OccurredAt",
                table: "audit_logs",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<string>(
                name: "BeforeData",
                table: "audit_logs",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "jsonb",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AfterData",
                table: "audit_logs",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "jsonb",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_customers_membership_tiers_TierId",
                table: "customers",
                column: "TierId",
                principalTable: "membership_tiers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_employee_roles_RoleId",
                table: "employee",
                column: "RoleId",
                principalTable: "roles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
