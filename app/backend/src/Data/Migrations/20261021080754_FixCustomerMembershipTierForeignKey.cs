using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.src.Data.Migrations
{
    /// <inheritdoc />
    public partial class FixCustomerMembershipTierForeignKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_customers_membership_tiers_MembershipTierId",
                table: "customers");

            migrationBuilder.DropIndex(
                name: "IX_customers_MembershipTierId",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "MembershipTierId",
                table: "customers");

            migrationBuilder.CreateIndex(
                name: "IX_customers_TierId",
                table: "customers",
                column: "TierId");

            migrationBuilder.AddForeignKey(
                name: "FK_customers_membership_tiers_TierId",
                table: "customers",
                column: "TierId",
                principalTable: "membership_tiers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_customers_membership_tiers_TierId",
                table: "customers");

            migrationBuilder.DropIndex(
                name: "IX_customers_TierId",
                table: "customers");

            migrationBuilder.AddColumn<Guid>(
                name: "MembershipTierId",
                table: "customers",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_customers_MembershipTierId",
                table: "customers",
                column: "MembershipTierId");

            migrationBuilder.AddForeignKey(
                name: "FK_customers_membership_tiers_MembershipTierId",
                table: "customers",
                column: "MembershipTierId",
                principalTable: "membership_tiers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
