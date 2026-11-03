using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.src.Data.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceAttachmentsWithCloudinaryImages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "attachments");

            migrationBuilder.DropColumn(
                name: "CoverImageUrl",
                table: "edition");

            migrationBuilder.AddColumn<string>(
                name: "PublicImageId",
                table: "titles",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PublicImageId",
                table: "edition",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PublicImageId",
                table: "book_series",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PublicImageId",
                table: "book_copies",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "rental_line_images",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RentalLineId = table.Column<Guid>(type: "uuid", nullable: false),
                    PublicImageId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rental_line_images", x => x.Id);
                    table.ForeignKey(
                        name: "FK_rental_line_images_rental_lines_RentalLineId",
                        column: x => x.RentalLineId,
                        principalTable: "rental_lines",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "stock_receipt_images",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StockReceiptId = table.Column<Guid>(type: "uuid", nullable: false),
                    PublicImageId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stock_receipt_images", x => x.Id);
                    table.ForeignKey(
                        name: "FK_stock_receipt_images_stock_receipts_StockReceiptId",
                        column: x => x.StockReceiptId,
                        principalTable: "stock_receipts",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "upload_intents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerType = table.Column<string>(type: "text", nullable: false),
                    PublicImageId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false, defaultValue: "PENDING"),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AssetId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Format = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Bytes = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_upload_intents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_upload_intents_employee_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "employee",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_rental_line_images_PublicImageId",
                table: "rental_line_images",
                column: "PublicImageId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_rental_line_images_RentalLineId",
                table: "rental_line_images",
                column: "RentalLineId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_receipt_images_PublicImageId",
                table: "stock_receipt_images",
                column: "PublicImageId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_stock_receipt_images_StockReceiptId",
                table: "stock_receipt_images",
                column: "StockReceiptId");

            migrationBuilder.CreateIndex(
                name: "IX_upload_intents_CreatedBy",
                table: "upload_intents",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_upload_intents_PublicImageId",
                table: "upload_intents",
                column: "PublicImageId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "rental_line_images");

            migrationBuilder.DropTable(
                name: "stock_receipt_images");

            migrationBuilder.DropTable(
                name: "upload_intents");

            migrationBuilder.DropColumn(
                name: "PublicImageId",
                table: "titles");

            migrationBuilder.DropColumn(
                name: "PublicImageId",
                table: "edition");

            migrationBuilder.DropColumn(
                name: "PublicImageId",
                table: "book_series");

            migrationBuilder.DropColumn(
                name: "PublicImageId",
                table: "book_copies");

            migrationBuilder.AddColumn<string>(
                name: "CoverImageUrl",
                table: "edition",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "attachments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    ObjectKey = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    OriginalFileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    OwnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerType = table.Column<string>(type: "text", nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    UploadedBy = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_attachments_employee_DeletedBy",
                        column: x => x.DeletedBy,
                        principalTable: "employee",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_attachments_employee_UploadedBy",
                        column: x => x.UploadedBy,
                        principalTable: "employee",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_attachments_DeletedBy",
                table: "attachments",
                column: "DeletedBy");

            migrationBuilder.CreateIndex(
                name: "IX_attachments_ObjectKey",
                table: "attachments",
                column: "ObjectKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_attachments_owner",
                table: "attachments",
                columns: new[] { "OwnerType", "OwnerId" });

            migrationBuilder.CreateIndex(
                name: "IX_attachments_UploadedBy",
                table: "attachments",
                column: "UploadedBy");
        }
    }
}
