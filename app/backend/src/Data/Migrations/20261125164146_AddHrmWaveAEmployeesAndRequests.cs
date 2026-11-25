using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.src.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddHrmWaveAEmployeesAndRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BankAccountNumber",
                table: "employee",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BankName",
                table: "employee",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BranchName",
                table: "employee",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmployeeCode",
                table: "employee",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "HourlyRate",
                table: "employee",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsProtected",
                table: "employee",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "JobTitle",
                table: "employee",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "hr_requests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestCode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    RequesterId = table.Column<Guid>(type: "uuid", nullable: false),
                    ApplyDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ShiftNo = table.Column<short>(type: "smallint", nullable: false),
                    TargetShiftNo = table.Column<short>(type: "smallint", nullable: true),
                    ReplacementEmployeeId = table.Column<Guid>(type: "uuid", nullable: true),
                    Reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    CorrectCheckInAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CorrectCheckOutAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ProofPublicId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ReviewedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReviewNote = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_hr_requests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_hr_requests_employee_ReplacementEmployeeId",
                        column: x => x.ReplacementEmployeeId,
                        principalTable: "employee",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_hr_requests_employee_RequesterId",
                        column: x => x.RequesterId,
                        principalTable: "employee",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_hr_requests_employee_ReviewedBy",
                        column: x => x.ReviewedBy,
                        principalTable: "employee",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "hr_request_history",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Action = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    OccurredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_hr_request_history", x => x.Id);
                    table.ForeignKey(
                        name: "FK_hr_request_history_employee_ActorId",
                        column: x => x.ActorId,
                        principalTable: "employee",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_hr_request_history_hr_requests_RequestId",
                        column: x => x.RequestId,
                        principalTable: "hr_requests",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_employee_EmployeeCode",
                table: "employee",
                column: "EmployeeCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_hr_request_history_ActorId",
                table: "hr_request_history",
                column: "ActorId");

            migrationBuilder.CreateIndex(
                name: "IX_hr_request_history_RequestId_OccurredAt",
                table: "hr_request_history",
                columns: new[] { "RequestId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_hr_requests_ReplacementEmployeeId",
                table: "hr_requests",
                column: "ReplacementEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_hr_requests_RequestCode",
                table: "hr_requests",
                column: "RequestCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_hr_requests_RequesterId_Status_CreatedAt",
                table: "hr_requests",
                columns: new[] { "RequesterId", "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_hr_requests_ReviewedBy",
                table: "hr_requests",
                column: "ReviewedBy");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "hr_request_history");

            migrationBuilder.DropTable(
                name: "hr_requests");

            migrationBuilder.DropIndex(
                name: "IX_employee_EmployeeCode",
                table: "employee");

            migrationBuilder.DropColumn(
                name: "BankAccountNumber",
                table: "employee");

            migrationBuilder.DropColumn(
                name: "BankName",
                table: "employee");

            migrationBuilder.DropColumn(
                name: "BranchName",
                table: "employee");

            migrationBuilder.DropColumn(
                name: "EmployeeCode",
                table: "employee");

            migrationBuilder.DropColumn(
                name: "HourlyRate",
                table: "employee");

            migrationBuilder.DropColumn(
                name: "IsProtected",
                table: "employee");

            migrationBuilder.DropColumn(
                name: "JobTitle",
                table: "employee");
        }
    }
}
