using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.src.Data.Migrations
{
    /// <inheritdoc />
    public partial class CorrectMembershipTierPolicy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            UpdatePolicies(
                migrationBuilder,
                regular: [(short)3, (short)14, 0m, 0m],
                silver: [(short)5, (short)21, 5m, 5m],
                gold: [(short)8, (short)30, 10m, 10m]);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            UpdatePolicies(
                migrationBuilder,
                regular: [(short)2, (short)7, 0m, 0m],
                silver: [(short)4, (short)10, 5m, 3m],
                gold: [(short)6, (short)14, 10m, 5m]);
        }

        private static void UpdatePolicies(
            MigrationBuilder migrationBuilder,
            object[] regular,
            object[] silver,
            object[] gold)
        {
            var columns = new[] { "MaxBooks", "MaxRentalDays", "RentDiscountPct", "SaleDiscountPct" };

            migrationBuilder.UpdateData(
                table: "membership_tiers",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000101"),
                columns: columns,
                values: regular);
            migrationBuilder.UpdateData(
                table: "membership_tiers",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000102"),
                columns: columns,
                values: silver);
            migrationBuilder.UpdateData(
                table: "membership_tiers",
                keyColumn: "Id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000103"),
                columns: columns,
                values: gold);
        }
    }
}
