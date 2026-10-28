// Run from app/backend: dotnet run -- --seed
using System.Globalization;
using System.Net;
using System.Text.Json;
using backend.src.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using NpgsqlTypes;

namespace backend.src.Scripts;

public static class Seed
{
    private static readonly string[] TableOrder =
    [
        "roles",
        "employee",
        "membership_tiers",
        "customers",
        "system_settings",
        "damage_levels",
        "categories",
        "book_series",
        "titles",
        "edition",
        "suppliers",
        "stock_receipts",
        "stock_receipt_lines",
        "book_copies",
        "inventory_checks",
        "inventory_adjustment_requests",
        "cash_sessions",
        "sale_invoices",
        "sale_invoice_lines",
        "rental_slips",
        "returns",
        "rental_lines",
        "rental_extensions",
        "employee_work_records",
        "payments",
        "notification_outbox",
        "audit_logs"
    ];

    public static async Task RunAsync(IServiceProvider services, string contentRootPath)
    {
        using var document = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(contentRootPath, "src", "Data", "data.json")));
        await using var scope = services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.MigrateAsync();
        await using var connection = (NpgsqlConnection)context.Database.GetDbConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        foreach (var table in GetTablesInDependencyOrder(document.RootElement))
        {
            foreach (var row in table.Value.EnumerateArray())
                await InsertRowAsync(connection, transaction, table.Key, row);
        }

        await transaction.CommitAsync();
        Console.WriteLine("Seed data imported successfully.");
    }

    internal static IEnumerable<KeyValuePair<string, JsonElement>> GetTablesInDependencyOrder(JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Object)
            throw new InvalidDataException("Seed data root must be a JSON object.");

        var tables = new Dictionary<string, JsonElement>(StringComparer.Ordinal);
        foreach (var table in root.EnumerateObject())
        {
            if (!TableOrder.Contains(table.Name, StringComparer.Ordinal))
                throw new InvalidDataException($"Unsupported seed table: {table.Name}");
            if (table.Value.ValueKind != JsonValueKind.Array)
                throw new InvalidDataException($"Seed table {table.Name} must contain a JSON array.");
            if (!tables.TryAdd(table.Name, table.Value))
                throw new InvalidDataException($"Duplicate seed table: {table.Name}");
        }

        foreach (var tableName in TableOrder)
            if (tables.TryGetValue(tableName, out var rows))
                yield return new KeyValuePair<string, JsonElement>(tableName, rows);
    }

    private static async Task InsertRowAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, string table, JsonElement row)
    {
        var columns = row.EnumerateObject().ToArray();
        var names = string.Join(", ", columns.Select(column => $"\"{column.Name}\""));
        var values = string.Join(", ", columns.Select(column => $"@{column.Name}"));
        await using var command = new NpgsqlCommand($"INSERT INTO \"{table}\" ({names}) VALUES ({values}) ON CONFLICT DO NOTHING", connection, transaction);
        foreach (var column in columns)
            command.Parameters.Add(CreateParameter(column.Name, column.Value));
        await command.ExecuteNonQueryAsync();
    }

    internal static NpgsqlParameter CreateParameter(string columnName, JsonElement value)
    {
        var parameter = new NpgsqlParameter(columnName, ToDatabaseValue(columnName, value));
        if (value.ValueKind is JsonValueKind.Object or JsonValueKind.Array)
            parameter.NpgsqlDbType = NpgsqlDbType.Jsonb;
        return parameter;
    }

    private static object ToDatabaseValue(string columnName, JsonElement value) => value.ValueKind switch
    {
        JsonValueKind.String => ToDatabaseValue(columnName, value.GetString()!),
        JsonValueKind.Number when value.TryGetInt64(out var integer) => integer,
        JsonValueKind.Number => value.GetDecimal(),
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        JsonValueKind.Null => DBNull.Value,
        JsonValueKind.Object or JsonValueKind.Array => value.GetRawText(),
        _ => throw new InvalidDataException($"Unsupported JSON value: {value.ValueKind}")
    };

    private static object ToDatabaseValue(string columnName, string value)
    {
        if (Guid.TryParse(value, out var guid)) return guid;

        return columnName switch
        {
            "RentDate" or "WorkDate" => DateOnly.Parse(value, CultureInfo.InvariantCulture),
            "IpAddress" => IPAddress.Parse(value),
            _ when columnName.EndsWith("At", StringComparison.Ordinal) => DateTime.Parse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind),
            _ => value
        };
    }
}
