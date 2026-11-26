using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.src.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddHrmWaveBPayrollAndPayslips : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "payroll_adjustments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AdjustmentCode = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    SourcePeriodKey = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: true),
                    SourcePayrollCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    SourceVoucherRef = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    TargetPeriodKey = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                    Category = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    AdjustmentType = table.Column<string>(type: "text", nullable: false),
                    Amount = table.Column<long>(type: "bigint", nullable: false),
                    ReferenceCode = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    Reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ProofPublicId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false, defaultValue: "DRAFT"),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    AppliedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payroll_adjustments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_payroll_adjustments_employee_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "employee",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_payroll_adjustments_employee_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "employee",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "payroll_periods",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PeriodKey = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    PayrollCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AttendanceSourceCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false, defaultValue: "DRAFT"),
                    ApprovedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payroll_periods", x => x.Id);
                    table.ForeignKey(
                        name: "FK_payroll_periods_employee_ApprovedBy",
                        column: x => x.ApprovedBy,
                        principalTable: "employee",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "payroll_payout_batches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PayrollPeriodId = table.Column<Guid>(type: "uuid", nullable: false),
                    BatchNumber = table.Column<int>(type: "integer", nullable: false),
                    Method = table.Column<string>(type: "text", nullable: false),
                    TransactionRef = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    PayoutAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Amount = table.Column<long>(type: "bigint", nullable: false),
                    Note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ProofPublicId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    ConfirmedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payroll_payout_batches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_payroll_payout_batches_employee_ConfirmedBy",
                        column: x => x.ConfirmedBy,
                        principalTable: "employee",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_payroll_payout_batches_payroll_periods_PayrollPeriodId",
                        column: x => x.PayrollPeriodId,
                        principalTable: "payroll_periods",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "payroll_entries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PayrollPeriodId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    StandardHours = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    HourlyRate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    BaseSalary = table.Column<long>(type: "bigint", nullable: false),
                    OvertimeHours = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    OvertimeAmount = table.Column<long>(type: "bigint", nullable: false),
                    Bonus = table.Column<long>(type: "bigint", nullable: false),
                    Allowance = table.Column<long>(type: "bigint", nullable: false),
                    Deduction = table.Column<long>(type: "bigint", nullable: false),
                    MandatoryContribution = table.Column<long>(type: "bigint", nullable: false),
                    Tax = table.Column<long>(type: "bigint", nullable: false),
                    NetPay = table.Column<long>(type: "bigint", nullable: false),
                    ContributionNote = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    PayoutStatus = table.Column<string>(type: "text", nullable: false, defaultValue: "UNPAID"),
                    PayoutBatchId = table.Column<Guid>(type: "uuid", nullable: true),
                    PaymentId = table.Column<Guid>(type: "uuid", nullable: true),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ZaloStatus = table.Column<string>(type: "text", nullable: false, defaultValue: "UNSENT"),
                    ZaloSentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ZaloErrorReason = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payroll_entries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_payroll_entries_employee_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "employee",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_payroll_entries_payments_PaymentId",
                        column: x => x.PaymentId,
                        principalTable: "payments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_payroll_entries_payroll_payout_batches_PayoutBatchId",
                        column: x => x.PayoutBatchId,
                        principalTable: "payroll_payout_batches",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_payroll_entries_payroll_periods_PayrollPeriodId",
                        column: x => x.PayrollPeriodId,
                        principalTable: "payroll_periods",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "payroll_entry_items",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PayrollEntryId = table.Column<Guid>(type: "uuid", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    Label = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Amount = table.Column<long>(type: "bigint", nullable: false),
                    VoucherCode = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    SourceType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    SourceId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payroll_entry_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_payroll_entry_items_payroll_entries_PayrollEntryId",
                        column: x => x.PayrollEntryId,
                        principalTable: "payroll_entries",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "payslip_disputes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DisputeCode = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    PayrollEntryId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    Content = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ProofPublicId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false, defaultValue: "PENDING_RESPONSE"),
                    RespondedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    RespondedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AdminResponse = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CalculationNote = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    AdjustmentNote = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    LinkedAdjustmentId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payslip_disputes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_payslip_disputes_employee_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "employee",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_payslip_disputes_employee_RespondedBy",
                        column: x => x.RespondedBy,
                        principalTable: "employee",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_payslip_disputes_payroll_adjustments_LinkedAdjustmentId",
                        column: x => x.LinkedAdjustmentId,
                        principalTable: "payroll_adjustments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_payslip_disputes_payroll_entries_PayrollEntryId",
                        column: x => x.PayrollEntryId,
                        principalTable: "payroll_entries",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_payroll_adjustments_AdjustmentCode",
                table: "payroll_adjustments",
                column: "AdjustmentCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payroll_adjustments_CreatedBy",
                table: "payroll_adjustments",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_payroll_adjustments_EmployeeId",
                table: "payroll_adjustments",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_payroll_adjustments_TargetPeriodKey_Status",
                table: "payroll_adjustments",
                columns: new[] { "TargetPeriodKey", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_payroll_entries_EmployeeId",
                table: "payroll_entries",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_payroll_entries_PaymentId",
                table: "payroll_entries",
                column: "PaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_payroll_entries_PayoutBatchId",
                table: "payroll_entries",
                column: "PayoutBatchId");

            migrationBuilder.CreateIndex(
                name: "IX_payroll_entries_PayrollPeriodId_EmployeeId",
                table: "payroll_entries",
                columns: new[] { "PayrollPeriodId", "EmployeeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payroll_entry_items_PayrollEntryId",
                table: "payroll_entry_items",
                column: "PayrollEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_payroll_payout_batches_ConfirmedBy",
                table: "payroll_payout_batches",
                column: "ConfirmedBy");

            migrationBuilder.CreateIndex(
                name: "IX_payroll_payout_batches_PayrollPeriodId_BatchNumber",
                table: "payroll_payout_batches",
                columns: new[] { "PayrollPeriodId", "BatchNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payroll_periods_ApprovedBy",
                table: "payroll_periods",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_payroll_periods_PayrollCode",
                table: "payroll_periods",
                column: "PayrollCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payroll_periods_PeriodKey",
                table: "payroll_periods",
                column: "PeriodKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payslip_disputes_DisputeCode",
                table: "payslip_disputes",
                column: "DisputeCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payslip_disputes_EmployeeId",
                table: "payslip_disputes",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_payslip_disputes_LinkedAdjustmentId",
                table: "payslip_disputes",
                column: "LinkedAdjustmentId");

            migrationBuilder.CreateIndex(
                name: "IX_payslip_disputes_PayrollEntryId",
                table: "payslip_disputes",
                column: "PayrollEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_payslip_disputes_RespondedBy",
                table: "payslip_disputes",
                column: "RespondedBy");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "payroll_entry_items");

            migrationBuilder.DropTable(
                name: "payslip_disputes");

            migrationBuilder.DropTable(
                name: "payroll_adjustments");

            migrationBuilder.DropTable(
                name: "payroll_entries");

            migrationBuilder.DropTable(
                name: "payroll_payout_batches");

            migrationBuilder.DropTable(
                name: "payroll_periods");
        }
    }
}
