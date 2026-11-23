using backend.src.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Xunit;

namespace backend.Tests.Infrastructure;

public sealed class DatabaseModelTests
{
    [Fact]
    public void Cloudinary_schema_maps_replacement_entities_and_direct_image_ids()
    {
        using var dbContext = CreateDbContext();

        Assert.Null(dbContext.Model.FindEntityType("backend.src.Models.AttachmentModel"));

        var uploadIntent = dbContext.Model.FindEntityType("backend.src.Models.UploadIntentModel");
        Assert.NotNull(uploadIntent);
        Assert.Equal("upload_intents", uploadIntent.GetTableName());

        Assert.Equal(
            [
                "AssetId", "Bytes", "CompletedAt", "CreatedAt", "CreatedBy", "Format", "Id",
                "OwnerType", "PublicImageId", "Status"
            ],
            uploadIntent.GetProperties().Select(property => property.Name).OrderBy(name => name));

        Assert.Contains(uploadIntent.GetIndexes(), index =>
            index.IsUnique &&
            index.Properties.Select(property => property.Name).SequenceEqual(["PublicImageId"]));

        var uploadIntentForeignKey = Assert.Single(uploadIntent.GetForeignKeys());
        Assert.Equal("backend.src.Models.EmployeeModel", uploadIntentForeignKey.PrincipalEntityType.Name);
        Assert.Equal(DeleteBehavior.NoAction, uploadIntentForeignKey.DeleteBehavior);
        Assert.True(uploadIntentForeignKey.IsRequired);
        Assert.Equal(["CreatedBy"], uploadIntentForeignKey.Properties.Select(property => property.Name));

        AssertDirectImageId(dbContext, "backend.src.Models.BookSeriesModel", "book_series");
        AssertDirectImageId(dbContext, "backend.src.Models.TitleModel", "titles");
        AssertDirectImageId(dbContext, "backend.src.Models.EditionModel", "edition");
        AssertDirectImageId(dbContext, "backend.src.Models.BookCopyModel", "book_copies");
    }

    [Fact]
    public void Evidence_image_tables_use_required_no_action_foreign_keys()
    {
        using var dbContext = CreateDbContext();

        AssertEvidenceRelationship(
            dbContext,
            "backend.src.Models.RentalLineImageModel",
            "rental_line_images",
            "RentalLineId",
            "backend.src.Models.RentalLineModel");
        AssertEvidenceRelationship(
            dbContext,
            "backend.src.Models.StockReceiptImageModel",
            "stock_receipt_images",
            "StockReceiptId",
            "backend.src.Models.StockReceiptModel");
    }

    private static AppDbContext CreateDbContext()
        => new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options);

    private static void AssertDirectImageId(AppDbContext dbContext, string entityName, string tableName)
    {
        var entity = dbContext.Model.FindEntityType(entityName);
        Assert.NotNull(entity);
        Assert.Equal(tableName, entity.GetTableName());
        Assert.NotNull(entity.FindProperty("PublicImageId"));
        Assert.Null(entity.FindProperty("CoverImageUrl"));
    }

    private static void AssertEvidenceRelationship(
        AppDbContext dbContext,
        string entityName,
        string tableName,
        string foreignKeyProperty,
        string principalEntityName)
    {
        var entity = dbContext.Model.FindEntityType(entityName);
        Assert.NotNull(entity);
        Assert.Equal(tableName, entity.GetTableName());
        Assert.NotNull(entity.FindProperty("PublicImageId"));

        var foreignKey = Assert.Single(entity.GetForeignKeys());
        Assert.Equal(principalEntityName, foreignKey.PrincipalEntityType.Name);
        Assert.Equal(DeleteBehavior.NoAction, foreignKey.DeleteBehavior);
        Assert.True(foreignKey.IsRequired);
        Assert.Equal([foreignKeyProperty], foreignKey.Properties.Select(property => property.Name));
    }
}
