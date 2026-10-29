using System.Text.Json;
using System.Xml.Linq;
using Xunit;

namespace backend.Tests.Data;

public sealed class SeedDataContractTests
{
    [Fact]
    public void SeedData_IsIncludedInBuildAndPublishOutputs()
    {
        var projectFile = XDocument.Load(Path.Combine(FindRepositoryRoot(), "app", "backend", "backend.csproj"));
        var seedItem = projectFile.Descendants("None")
            .SingleOrDefault(element => (string?)element.Attribute("Update") == "src/Data/data.json");

        Assert.NotNull(seedItem);
        Assert.Equal("PreserveNewest", seedItem.Element("CopyToOutputDirectory")?.Value);
        Assert.Equal("PreserveNewest", seedItem.Element("CopyToPublishDirectory")?.Value);
    }

    [Fact]
    public void CatalogData_CoversSeriesIndependentTitlesAndEditionVariants()
    {
        using var document = LoadSeed();
        var root = document.RootElement;
        Assert.True(root.TryGetProperty("book_series", out var series));
        var titles = root.GetProperty("titles").EnumerateArray().ToArray();
        var editions = root.GetProperty("edition").EnumerateArray().ToArray();

        Assert.NotEmpty(series.EnumerateArray());
        Assert.Contains(titles, HasNonNullSeriesId);
        Assert.Contains(titles, title => !HasNonNullSeriesId(title));
        Assert.Contains(
            titles.Where(HasNonNullSeriesId).GroupBy(title => title.GetProperty("SeriesId").GetString()),
            group => group.Count() >= 2 && group.All(title => title.TryGetProperty("VolumeLabel", out _)));
        Assert.Contains(
            editions.GroupBy(edition => edition.GetProperty("TitleId").GetString()),
            group => group.Count() >= 2);

        var isbnValues = editions
            .Select(edition => edition.TryGetProperty("Isbn", out var isbn) && isbn.ValueKind != JsonValueKind.Null
                ? isbn.GetString()
                : null)
            .ToArray();
        Assert.True(
            isbnValues.Any(isbn => isbn is null) ||
            isbnValues.Where(isbn => isbn is not null).GroupBy(isbn => isbn).Any(group => group.Count() >= 2));
        Assert.DoesNotContain(editions, edition => edition.TryGetProperty("DefaultRentPrice", out _));
    }

    [Fact]
    public void BookCopies_HaveUniqueIdentityPricingAndConsistentReceiptEdition()
    {
        using var document = LoadSeed();
        var root = document.RootElement;
        var copies = root.GetProperty("book_copies").EnumerateArray().ToArray();
        var receiptLines = root.GetProperty("stock_receipt_lines").EnumerateArray()
            .ToDictionary(line => line.GetProperty("Id").GetString()!);

        Assert.Equal(
            copies.Length,
            copies.Select(copy => copy.GetProperty("CopyBarcode").GetString()).Distinct(StringComparer.Ordinal).Count());

        foreach (var copy in copies)
        {
            var editionId = copy.GetProperty("EditionId").GetString();
            var receiptLineId = copy.GetProperty("ReceiptLineId").GetString()!;
            Assert.False(string.IsNullOrWhiteSpace(editionId));
            Assert.True(receiptLines.TryGetValue(receiptLineId, out var receiptLine));
            Assert.Equal(editionId, receiptLine.GetProperty("EditionId").GetString());

            var rentalCapable = copy.GetProperty("Availability").GetString() != "SALE_ONLY";
            var activeForRental = copy.GetProperty("Status").GetString() is "AVAILABLE" or "RENTED";
            if (rentalCapable && activeForRental)
            {
                Assert.True(copy.TryGetProperty("RentalRate", out var rentalRate));
                Assert.True(rentalRate.GetInt64() > 0);
            }
        }
    }

    [Fact]
    public void ForeignKeys_ResolveToSeededPrincipals()
    {
        using var document = LoadSeed();
        var root = document.RootElement;

        AssertReferences(root, "employee", "RoleId", "roles");
        AssertReferences(root, "customers", "TierId", "membership_tiers");
        AssertReferences(root, "system_settings", "UpdatedBy", "employee");
        AssertReferences(root, "categories", "ParentId", "categories");
        AssertReferences(root, "titles", "SeriesId", "book_series");
        AssertReferences(root, "titles", "CategoryId", "categories");
        AssertReferences(root, "edition", "TitleId", "titles");
        AssertReferences(root, "edition", "MetadataConfirmedBy", "employee");
        AssertReferences(root, "stock_receipts", "SupplierId", "suppliers");
        AssertReferences(root, "stock_receipts", "SellerId", "customers");
        AssertReferences(root, "stock_receipts", "ApprovedBy", "employee");
        AssertReferences(root, "stock_receipts", "CreatedBy", "employee");
        AssertReferences(root, "stock_receipt_lines", "ReceiptId", "stock_receipts");
        AssertReferences(root, "stock_receipt_lines", "EditionId", "edition");
        AssertReferences(root, "book_copies", "EditionId", "edition");
        AssertReferences(root, "book_copies", "ReceiptLineId", "stock_receipt_lines");
        AssertReferences(root, "inventory_checks", "CopyId", "book_copies");
        AssertReferences(root, "inventory_checks", "CheckedBy", "employee");
        AssertReferences(root, "inventory_adjustment_requests", "InventoryCheckId", "inventory_checks");
        AssertReferences(root, "inventory_adjustment_requests", "RequestedBy", "employee");
        AssertReferences(root, "inventory_adjustment_requests", "ApprovedBy", "employee");
        AssertReferences(root, "cash_sessions", "OpenedBy", "employee");
        AssertReferences(root, "cash_sessions", "VarianceApprovedBy", "employee");
        AssertReferences(root, "cash_sessions", "ClosedBy", "employee");
        AssertReferences(root, "sale_invoices", "CustomerId", "customers");
        AssertReferences(root, "sale_invoices", "CashSessionId", "cash_sessions");
        AssertReferences(root, "sale_invoices", "CreatedBy", "employee");
        AssertReferences(root, "sale_invoice_lines", "InvoiceId", "sale_invoices");
        AssertReferences(root, "sale_invoice_lines", "CopyId", "book_copies");
        AssertReferences(root, "rental_slips", "CustomerId", "customers");
        AssertReferences(root, "rental_slips", "TierId", "membership_tiers");
        AssertReferences(root, "rental_slips", "CreatedBy", "employee");
        AssertReferences(root, "returns", "SlipId", "rental_slips");
        AssertReferences(root, "returns", "CreatedBy", "employee");
        AssertReferences(root, "rental_lines", "SlipId", "rental_slips");
        AssertReferences(root, "rental_lines", "CopyId", "book_copies");
        AssertReferences(root, "rental_lines", "ReturnId", "returns");
        AssertReferences(root, "rental_lines", "DamageLevelId", "damage_levels");
        AssertReferences(root, "rental_lines", "DamageApprovedBy", "employee");
        AssertReferences(root, "rental_extensions", "RentalLineId", "rental_lines");
        AssertReferences(root, "rental_extensions", "PerformedBy", "employee");
        AssertReferences(root, "employee_work_records", "EmployeeId", "employee");
        AssertReferences(root, "employee_work_records", "ApprovedBy", "employee");
        AssertReferences(root, "payments", "CashSessionId", "cash_sessions");
        AssertReferences(root, "payments", "SaleInvoiceId", "sale_invoices");
        AssertReferences(root, "payments", "RentalSlipId", "rental_slips");
        AssertReferences(root, "payments", "StockReceiptId", "stock_receipts");
        AssertReferences(root, "payments", "ReturnId", "returns");
        AssertReferences(root, "payments", "WorkRecordId", "employee_work_records");
        AssertReferences(root, "payments", "CreatedBy", "employee");
        AssertReferences(root, "audit_logs", "ActorId", "employee");
    }

    [Fact]
    public void CashSessions_HaveAtMostOneUnclosedSession()
    {
        using var document = LoadSeed();
        var unclosedSessions = document.RootElement.GetProperty("cash_sessions").EnumerateArray()
            .Count(session => session.GetProperty("Status").GetString() != "CLOSED");

        Assert.InRange(unclosedSessions, 0, 1);
    }

    private static JsonDocument LoadSeed()
    {
        var path = Path.Combine(FindRepositoryRoot(), "app", "backend", "src", "Data", "data.json");
        return JsonDocument.Parse(File.ReadAllText(path));
    }

    private static string FindRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "backend.sln")))
            directory = directory.Parent;

        Assert.NotNull(directory);
        return directory.FullName;
    }

    private static bool HasNonNullSeriesId(JsonElement title) =>
        title.TryGetProperty("SeriesId", out var seriesId) && seriesId.ValueKind != JsonValueKind.Null;

    private static void AssertReferences(JsonElement root, string tableName, string foreignKey, string principalTable)
    {
        var principalIds = root.GetProperty(principalTable).EnumerateArray()
            .Select(row => row.GetProperty("Id").GetString())
            .ToHashSet(StringComparer.Ordinal);

        foreach (var row in root.GetProperty(tableName).EnumerateArray())
        {
            if (!row.TryGetProperty(foreignKey, out var value) || value.ValueKind == JsonValueKind.Null)
                continue;

            Assert.Contains(value.GetString(), principalIds);
        }
    }
}
