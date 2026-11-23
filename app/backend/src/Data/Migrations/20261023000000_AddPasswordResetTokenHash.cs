using backend.src.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.src.Data.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261023000000_AddPasswordResetTokenHash")]
public partial class AddPasswordResetTokenHash : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "PasswordResetTokenHash",
            table: "employee",
            type: "character varying(128)",
            maxLength: 128,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "PasswordResetTokenHash",
            table: "employee");
    }
}
