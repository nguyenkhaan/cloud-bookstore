using backend.src.Data;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Xunit;

namespace backend.Tests.Data;

public sealed class AppDbContextModelTests
{
    private static IModel BuildModel()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite("Data Source=:memory:")
            .Options;
        using var context = new AppDbContext(options);
        return context.Model;
    }

    [Fact]
    public void CatalogHierarchy_MapsSeriesTitleEditionAndCopyRelationships()
    {
        var model = BuildModel();
        var series = model.FindEntityType("backend.src.Models.BookSeriesModel");
        var title = model.FindEntityType("backend.src.Models.TitleModel");
        var edition = model.FindEntityType("backend.src.Models.EditionModel");
        var copy = model.FindEntityType("backend.src.Models.BookCopyModel");

        Assert.NotNull(series);
        Assert.Equal("book_series", series.GetTableName());

        var seriesId = AssertProperty(title, "SeriesId");
        Assert.True(seriesId.IsNullable);
        AssertForeignKey(title!, "SeriesId", series);

        var titleId = AssertProperty(edition, "TitleId");
        Assert.False(titleId.IsNullable);
        AssertForeignKey(edition!, "TitleId", title);

        var editionId = AssertProperty(copy, "EditionId");
        Assert.False(editionId.IsNullable);
        AssertForeignKey(copy!, "EditionId", edition);
    }

    [Fact]
    public void EditionIdentity_IndexesOptionalNonUniqueIsbnAndHasNoDefaultRentPrice()
    {
        var model = BuildModel();
        var edition = model.FindEntityType("backend.src.Models.EditionModel");
        var isbn = AssertProperty(edition, "Isbn");

        Assert.True(isbn.IsNullable);
        Assert.Equal(20, isbn.GetMaxLength());
        Assert.Contains(edition!.GetIndexes(), index =>
            !index.IsUnique && index.Properties.Select(property => property.Name).SequenceEqual(["Isbn"]));
        Assert.Null(edition.FindProperty("DefaultRentPrice"));
    }

    [Fact]
    public void BookCopyIdentity_RequiresUniqueBarcodeAndSupportsPerCopyRentalRate()
    {
        var model = BuildModel();
        var copy = model.FindEntityType("backend.src.Models.BookCopyModel");
        var barcode = AssertProperty(copy, "CopyBarcode");
        var rentalRate = AssertProperty(copy, "RentalRate");

        Assert.False(barcode.IsNullable);
        Assert.Equal(30, barcode.GetMaxLength());
        Assert.True(rentalRate.IsNullable);
        Assert.Equal(typeof(long?), rentalRate.ClrType);
        Assert.Contains(copy!.GetIndexes(), index =>
            index.IsUnique && index.Properties.Select(property => property.Name).SequenceEqual(["CopyBarcode"]));
    }

    [Fact]
    public void CustomerAndPaymentFacets_MatchDatabaseContract()
    {
        var model = BuildModel();
        var customer = model.FindEntityType("backend.src.Models.CustomerModel");
        var payment = model.FindEntityType("backend.src.Models.PaymentModel");

        Assert.Equal(15, AssertProperty(customer, "Phone").GetMaxLength());
        Assert.Equal(150, AssertProperty(customer, "FullName").GetMaxLength());
        Assert.True(AssertProperty(customer, "Email").IsNullable);
        Assert.Equal(255, AssertProperty(customer, "Email").GetMaxLength());
        Assert.True(AssertProperty(customer, "NationalId").IsNullable);
        Assert.Equal(20, AssertProperty(customer, "NationalId").GetMaxLength());
        Assert.True(AssertProperty(customer, "Address").IsNullable);
        Assert.True(AssertProperty(customer, "FlagReason").IsNullable);
        Assert.Equal(typeof(long), AssertProperty(customer, "EligibleSpend").ClrType);
        AssertForeignKey(customer!, "TierId", model.FindEntityType("backend.src.Models.MembershipTierModel"));

        Assert.True(AssertProperty(payment, "CashSessionId").IsNullable);
    }

    [Fact]
    public void EmployeeAuthProperties_RemainMapped()
    {
        var employee = BuildModel().FindEntityType("backend.src.Models.EmployeeModel");

        Assert.NotNull(AssertProperty(employee, "FailedLoginAttempts"));
        Assert.NotNull(AssertProperty(employee, "LockoutEndUtc"));
        Assert.NotNull(AssertProperty(employee, "PasswordResetTokenHash"));
    }

    [Fact]
    public void DatabaseDefaults_MatchWorkflowStartingStates()
    {
        var model = BuildModel();

        AssertDatabaseDefault(model, "backend.src.Models.BookCopyModel", "Status", BookCopyStatus.PENDING_RECEIPT);
        AssertDatabaseDefault(model, "backend.src.Models.StockReceiptLineModel", "Availability", BookChannelAvailability.BOTH);
        AssertDatabaseDefault(model, "backend.src.Models.StockReceiptModel", "Status", ApprovalStatus.DRAFT);
        AssertDatabaseDefault(model, "backend.src.Models.InventoryAdjustmentRequestModel", "Status", InventoryAdjustmentStatus.PENDING_APPROVAL);
        AssertDatabaseDefault(model, "backend.src.Models.PaymentModel", "Status", PaymentStatus.PENDING);
        AssertDatabaseDefault(model, "backend.src.Models.NotificationOutboxModel", "Status", NotificationStatus.PENDING);
    }

    [Fact]
    public void DamageLevelDefault_UsesSentinelOutsideBookCopyStatusDomain()
    {
        var property = AssertProperty(
            BuildModel().FindEntityType("backend.src.Models.DamageLevelModel"),
            "CopyStatusAfter");

        Assert.Equal((BookCopyStatus)(-1), property.Sentinel);
    }

    private static IProperty AssertProperty(IEntityType? entity, string propertyName)
    {
        Assert.NotNull(entity);
        var property = entity.FindProperty(propertyName);
        Assert.NotNull(property);
        return property;
    }

    private static void AssertForeignKey(IEntityType entity, string propertyName, IEntityType? principal)
    {
        Assert.NotNull(principal);
        Assert.Contains(entity.GetForeignKeys(), foreignKey =>
            foreignKey.PrincipalEntityType == principal &&
            foreignKey.Properties.Select(property => property.Name).SequenceEqual([propertyName]));
    }

    private static void AssertDatabaseDefault(IModel model, string entityName, string propertyName, object expected)
    {
        var property = AssertProperty(model.FindEntityType(entityName), propertyName);
        var annotation = property.FindAnnotation(RelationalAnnotationNames.DefaultValue);
        Assert.NotNull(annotation);
        Assert.Equal(expected, annotation.Value);
    }
}
