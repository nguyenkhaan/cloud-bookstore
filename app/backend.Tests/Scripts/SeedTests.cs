using System.Reflection;
using System.Text.Json;
using backend.src.Scripts;
using Xunit;

namespace backend.Tests.Scripts;

public sealed class SeedTests
{
    [Fact]
    public void GetTablesInDependencyOrder_IgnoresJsonPropertyOrder()
    {
        const string json = """
            {
              "sale_invoice_lines": [],
              "titles": [],
              "book_copies": [],
              "employee": [],
              "edition": [],
              "roles": [],
              "sale_invoices": [],
              "book_series": []
            }
            """;

        Assert.Equal(
            ["roles", "employee", "book_series", "titles", "edition", "book_copies", "sale_invoices", "sale_invoice_lines"],
            GetOrderedNames(json));
    }

    [Fact]
    public void GetTablesInDependencyOrder_RejectsUnsupportedTable()
    {
        var exception = Assert.Throws<InvalidDataException>(() => GetOrderedNames("""{"unknown_table": []}"""));

        Assert.Equal("Unsupported seed table: unknown_table", exception.Message);
    }

    [Fact]
    public void GetTablesInDependencyOrder_RejectsNonArrayRows()
    {
        var exception = Assert.Throws<InvalidDataException>(() => GetOrderedNames("""{"roles": {}}"""));

        Assert.Equal("Seed table roles must contain a JSON array.", exception.Message);
    }

    private static string[] GetOrderedNames(string json)
    {
        using var document = JsonDocument.Parse(json);
        var method = typeof(Seed).GetMethod(
            "GetTablesInDependencyOrder",
            BindingFlags.Static | BindingFlags.NonPublic);
        Assert.NotNull(method);

        try
        {
            var tables = Assert.IsAssignableFrom<IEnumerable<KeyValuePair<string, JsonElement>>>(
                method.Invoke(null, [document.RootElement]));
            return tables.Select(table => table.Key).ToArray();
        }
        catch (TargetInvocationException exception) when (exception.InnerException is not null)
        {
            throw exception.InnerException;
        }
    }
}
