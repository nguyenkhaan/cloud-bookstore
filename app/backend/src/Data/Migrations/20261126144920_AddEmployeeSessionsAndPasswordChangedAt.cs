using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.src.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployeeSessionsAndPasswordChangedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "PasswordChangedAt",
                table: "employee",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "employee_sessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    DeviceName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DeviceType = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    AccessJti = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    RefreshJti = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    LastActiveAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_employee_sessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_employee_sessions_employee_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "employee",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_employee_sessions_AccessJti",
                table: "employee_sessions",
                column: "AccessJti",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_employee_sessions_EmployeeId_RevokedAt_ExpiresAt",
                table: "employee_sessions",
                columns: new[] { "EmployeeId", "RevokedAt", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_employee_sessions_RefreshJti",
                table: "employee_sessions",
                column: "RefreshJti",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "employee_sessions");

            migrationBuilder.DropColumn(
                name: "PasswordChangedAt",
                table: "employee");
        }
    }
}
