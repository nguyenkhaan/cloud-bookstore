using System.Reflection;
using System.Text.Json;
using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Xunit;

namespace backend.Tests.Services;

public sealed class HrmWaveBContractTests
{
    private static readonly Assembly BackendAssembly = typeof(EmployeeService).Assembly;

    [Fact]
    public void Wave_b_payroll_and_payslip_domain_models_and_enums_exist_with_expected_states()
    {
        var period = RequiredType("backend.src.Models.PayrollPeriodModel");
        var entry = RequiredType("backend.src.Models.PayrollEntryModel");
        var entryItem = RequiredType("backend.src.Models.PayrollEntryItemModel");
        var payoutBatch = RequiredType("backend.src.Models.PayrollPayoutBatchModel");
        var adjustment = RequiredType("backend.src.Models.PayrollAdjustmentModel");
        var dispute = RequiredType("backend.src.Models.PayslipDisputeModel");

        AssertProperties(period, "Id", "PeriodKey", "PayrollCode", "Status");
        AssertProperties(entry, "Id", "PayrollPeriodId", "EmployeeId", "BaseSalary", "OvertimeAmount", "NetPay", "PayoutStatus");
        AssertProperties(entryItem, "Id", "PayrollEntryId", "Amount");
        AssertProperties(payoutBatch, "Id", "PayrollPeriodId");
        AssertProperties(adjustment, "Id", "AdjustmentCode", "EmployeeId", "TargetPeriodKey", "Amount", "Status");
        AssertProperties(dispute, "Id", "DisputeCode", "EmployeeId", "Status");

        var periodStatus = RequiredType("backend.src.Models.Enums.PayrollPeriodStatus");
        AssertEnumValues(periodStatus, "DRAFT", "APPROVED_UNPAID", "PARTIALLY_PAID", "SETTLED");

        var itemCategory = RequiredType("backend.src.Models.Enums.PayrollItemCategory");
        Assert.True(itemCategory.IsEnum, "PayrollItemCategory must be an enum.");
        Assert.NotEmpty(Enum.GetNames(itemCategory));

        var adjustmentType = RequiredType("backend.src.Models.Enums.PayrollAdjustmentType");
        Assert.True(adjustmentType.IsEnum, "PayrollAdjustmentType must be an enum.");
        Assert.NotEmpty(Enum.GetNames(adjustmentType));

        var adjustmentStatus = RequiredType("backend.src.Models.Enums.PayrollAdjustmentStatus");
        AssertEnumValues(adjustmentStatus, "DRAFT", "APPROVED", "APPLIED");

        var disputeCategory = RequiredType("backend.src.Models.Enums.PayslipDisputeCategory");
        Assert.True(disputeCategory.IsEnum, "PayslipDisputeCategory must be an enum.");
        Assert.NotEmpty(Enum.GetNames(disputeCategory));

        var disputeStatus = RequiredType("backend.src.Models.Enums.PayslipDisputeStatus");
        AssertEnumValues(disputeStatus, "PENDING_RESPONSE", "EXPLAINED", "APPROVED_NEXT_PERIOD_ADJUSTMENT");

        var zaloStatus = RequiredType("backend.src.Models.Enums.ZaloDeliveryStatus");
        Assert.True(zaloStatus.IsEnum, "ZaloDeliveryStatus must be an enum.");
        Assert.NotEmpty(Enum.GetNames(zaloStatus));
    }

    [Fact]
    public void Wave_b_dbsets_unique_indexes_migration_and_seed_data_are_registered()
    {
        var periodType = RequiredType("backend.src.Models.PayrollPeriodModel");
        var entryType = RequiredType("backend.src.Models.PayrollEntryModel");
        var entryItemType = RequiredType("backend.src.Models.PayrollEntryItemModel");
        var payoutBatchType = RequiredType("backend.src.Models.PayrollPayoutBatchModel");
        var adjustmentType = RequiredType("backend.src.Models.PayrollAdjustmentModel");
        var disputeType = RequiredType("backend.src.Models.PayslipDisputeModel");

        var dbSetEntityTypes = typeof(AppDbContext)
            .GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(p => p.PropertyType.IsGenericType && p.PropertyType.GetGenericTypeDefinition() == typeof(DbSet<>))
            .Select(p => p.PropertyType.GetGenericArguments()[0])
            .ToHashSet();

        foreach (var modelType in new[] { periodType, entryType, entryItemType, payoutBatchType, adjustmentType, disputeType })
        {
            Assert.Contains(modelType, dbSetEntityTypes);
        }

        using var db = CreateInMemoryDbContext();
        AssertTableAndUniqueIndex(db, periodType, "payroll_periods", "PeriodKey");
        AssertTableAndUniqueIndex(db, periodType, "payroll_periods", "PayrollCode");
        AssertTableAndUniqueIndex(db, entryType, "payroll_entries", "PayrollPeriodId", "EmployeeId");
        AssertTableMapped(db, entryItemType, "payroll_entry_items");
        AssertTableMapped(db, payoutBatchType, "payroll_payout_batches");
        AssertTableAndUniqueIndex(db, adjustmentType, "payroll_adjustments", "AdjustmentCode");
        AssertTableAndUniqueIndex(db, disputeType, "payslip_disputes", "DisputeCode");

        var root = FindRepositoryRoot();
        var migrationDirectory = Path.Combine(root, "app", "backend", "src", "Data", "Migrations");
        Assert.Contains(
            Directory.EnumerateFiles(migrationDirectory),
            file => Path.GetFileName(file).EndsWith("_AddHrmWaveBPayrollAndPayslips.cs", StringComparison.Ordinal));

        using var seedDoc = JsonDocument.Parse(File.ReadAllText(Path.Combine(root, "app", "backend", "src", "Data", "data.json")));
        var rootElem = seedDoc.RootElement;
        foreach (var table in new[]
        {
            "payroll_periods",
            "payroll_entries",
            "payroll_entry_items",
            "payroll_payout_batches",
            "payroll_adjustments",
            "payslip_disputes"
        })
        {
            Assert.True(rootElem.TryGetProperty(table, out var arrayElem) && arrayElem.ValueKind == JsonValueKind.Array,
                $"Seed data.json must define array '{table}'.");
            Assert.True(arrayElem.GetArrayLength() > 0, $"Seed data.json '{table}' must contain seeded rows.");
        }

        var periodStatuses = rootElem.GetProperty("payroll_periods")
            .EnumerateArray()
            .Select(item => item.TryGetProperty("status", out var s) ? s.GetString() : null)
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        Assert.Contains("SETTLED", periodStatuses);
        Assert.Contains("APPROVED_UNPAID", periodStatuses);
        Assert.Contains("DRAFT", periodStatuses);

        // PDR-009 invariant: AttachmentModel must never be reintroduced; Cloudinary owner types remain.
        Assert.Null(BackendAssembly.GetType("backend.src.Models.AttachmentModel"));
        var ownerNames = Enum.GetNames<UploadOwnerType>();
        Assert.Contains("PAYROLL_PAYOUT_PROOF", ownerNames);
        Assert.Contains("PAYSLIP_DISPUTE_PROOF", ownerNames);
    }

    [Fact]
    public void Wave_b_payroll_and_payslip_entrypoints_match_spec_route_contracts()
    {
        var payrollEndpoints = ControllerEndpoints("backend.src.Controllers.HrPayrollController");
        var payslipEndpoints = ControllerEndpoints("backend.src.Controllers.HrPayslipsController");

        // SCR-HRM-05 Payroll endpoints
        AssertEndpoint(payrollEndpoints, "GET", "api/hr/payroll/periods");
        AssertEndpoint(payrollEndpoints, "GET", "api/hr/payroll/periods/{periodKey}");
        AssertEndpoint(payrollEndpoints, "POST", "api/hr/payroll/periods/{periodKey}/initialize");
        AssertEndpoint(payrollEndpoints, "PATCH", "api/hr/payroll/periods/{periodKey}/employees/{employeeId:guid}");
        AssertEndpoint(payrollEndpoints, "POST", "api/hr/payroll/periods/{periodKey}/approve");
        AssertEndpoint(payrollEndpoints, "POST", "api/hr/payroll/periods/{periodKey}/unlock");
        AssertEndpoint(payrollEndpoints, "POST", "api/hr/payroll/periods/{periodKey}/payouts");
        AssertEndpoint(payrollEndpoints, "POST", "api/hr/payroll/periods/{periodKey}/send-zalo");
        AssertEndpoint(payrollEndpoints, "GET", "api/hr/payroll/periods/{periodKey}/employees/{employeeId:guid}/breakdown");
        AssertEndpoint(payrollEndpoints, "GET", "api/hr/payroll/adjustments");
        AssertEndpoint(payrollEndpoints, "POST", "api/hr/payroll/adjustments");

        // SCR-HRM-06 Payslip & Disputes endpoints
        AssertEndpoint(payslipEndpoints, "GET", "api/hr/payslips/me");
        AssertEndpoint(payslipEndpoints, "GET", "api/hr/payslips/{employeeId:guid}");
        AssertEndpoint(payslipEndpoints, "POST", "api/hr/payslips/{entryId:guid}/disputes");
        AssertEndpoint(payslipEndpoints, "POST", "api/hr/payslips/disputes/{disputeId:guid}/respond");
        AssertEndpoint(payslipEndpoints, "POST", "api/hr/payslips/{entryId:guid}/resend-zalo");
    }

    [Fact]
    public void Adjacent_affected_entrypoints_remain_registered_for_parity()
    {
        AssertEndpoint(ControllerEndpoints("backend.src.Controllers.UploadsController"), "POST", "api/uploads/signature");
        AssertEndpoint(ControllerEndpoints("backend.src.Controllers.SettingsController"), "GET", "api/settings/my-permissions");
        AssertEndpoint(ControllerEndpoints("backend.src.Controllers.AuditLogController"), "GET", "api/audit");
        AssertEndpoint(ControllerEndpoints("backend.src.Controllers.ReportsController"), "GET", "api/reports/revenue-expense");
    }

    [Fact]
    public void Wave_b_controller_authorization_enforces_admin_boundaries_and_self_scope_for_payslips()
    {
        var payrollEndpoints = ControllerEndpoints("backend.src.Controllers.HrPayrollController");
        var payslipEndpoints = ControllerEndpoints("backend.src.Controllers.HrPayslipsController");

        Assert.NotEmpty(payrollEndpoints);
        Assert.All(payrollEndpoints, action => AssertAdminOnly(action.Attributes));

        var myPayslip = FindEndpoint(payslipEndpoints, "GET", "api/hr/payslips/me");
        AssertIncludesRoles(myPayslip.Attributes, "ADMIN", "CASHIER", "INVENTORY_MANAGER");
        Assert.DoesNotContain(
            myPayslip.ActionMethod.GetParameters(),
            p => string.Equals(p.Name, "employeeId", StringComparison.OrdinalIgnoreCase));

        var createDispute = FindEndpoint(payslipEndpoints, "POST", "api/hr/payslips/{entryId:guid}/disputes");
        AssertIncludesRoles(createDispute.Attributes, "ADMIN", "CASHIER", "INVENTORY_MANAGER");

        AssertAdminOnly(FindEndpoint(payslipEndpoints, "GET", "api/hr/payslips/{employeeId:guid}").Attributes);
        AssertAdminOnly(FindEndpoint(payslipEndpoints, "POST", "api/hr/payslips/disputes/{disputeId:guid}/respond").Attributes);
        AssertAdminOnly(FindEndpoint(payslipEndpoints, "POST", "api/hr/payslips/{entryId:guid}/resend-zalo").Attributes);
    }

    [Fact]
    public void Wave_b_services_and_dtos_exist_without_exposing_credentials()
    {
        RequiredType("backend.src.Services.HrPayrollService");
        RequiredType("backend.src.Services.HrPayslipService");

        var payrollDtos = BackendAssembly.GetTypes()
            .Where(type => type.Namespace == "backend.src.Dto.PayrollDto")
            .ToArray();

        Assert.NotEmpty(payrollDtos);
        Assert.DoesNotContain(
            payrollDtos.SelectMany(type => type.GetProperties(BindingFlags.Public | BindingFlags.Instance)),
            property => property.Name is "Password" or "PasswordResetTokenHash");
    }

    [Fact]
    public void Dynamic_permission_catalog_registers_hr_payroll_and_hr_payslips_with_role_ceilings()
    {
        var defaults = RolePermissionService.Defaults;
        var hrPayrollPerms = defaults
            .Where(item => item.PermissionCode.StartsWith("HrPayroll.", StringComparison.Ordinal))
            .ToArray();
        var hrPayslipPerms = defaults
            .Where(item => item.PermissionCode.StartsWith("HrPayslips.", StringComparison.Ordinal))
            .ToArray();

        Assert.NotEmpty(hrPayrollPerms);
        Assert.All(hrPayrollPerms, perm =>
        {
            Assert.True(perm.AdminOnly, $"{perm.PermissionCode} must be AdminOnly.");
            Assert.True(perm.AdminAllowed, $"{perm.PermissionCode} must allow ADMIN.");
            Assert.False(perm.CashierAllowed, $"{perm.PermissionCode} must not allow CASHIER.");
            Assert.False(perm.WarehouseAllowed, $"{perm.PermissionCode} must not allow INVENTORY_MANAGER.");
        });

        Assert.NotEmpty(hrPayslipPerms);
        var getMyPayslip = Assert.Single(hrPayslipPerms, p => p.PermissionCode == "HrPayslips.GetMyPayslip");
        Assert.True(getMyPayslip.AdminAllowed);
        Assert.True(getMyPayslip.CashierAllowed);
        Assert.True(getMyPayslip.WarehouseAllowed);

        var createDispute = Assert.Single(hrPayslipPerms, p => p.PermissionCode == "HrPayslips.CreateDispute");
        Assert.True(createDispute.AdminAllowed);
        Assert.True(createDispute.CashierAllowed);
        Assert.True(createDispute.WarehouseAllowed);

        Assert.Contains(hrPayslipPerms, p => p.AdminOnly);
    }

    [Fact]
    public async Task Audit_log_service_resolves_payroll_period_adjustment_and_dispute_labels()
    {
        var periodType = RequiredType("backend.src.Models.PayrollPeriodModel");
        var adjustmentType = RequiredType("backend.src.Models.PayrollAdjustmentModel");
        var disputeType = RequiredType("backend.src.Models.PayslipDisputeModel");

        await using var db = CreateInMemoryDbContext();
        var actorId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var adjustmentId = Guid.NewGuid();
        var disputeId = Guid.NewGuid();

        var periodEntity = CreateSeedEntity(periodType, new Dictionary<string, object?>
        {
            ["Id"] = periodId,
            ["PeriodKey"] = "10/2026",
            ["PayrollCode"] = "PAY-202610"
        });
        var adjustmentEntity = CreateSeedEntity(adjustmentType, new Dictionary<string, object?>
        {
            ["Id"] = adjustmentId,
            ["AdjustmentCode"] = "ADJ-202610-0001",
            ["EmployeeId"] = actorId,
            ["TargetPeriodKey"] = "11/2026"
        });
        var disputeEntity = CreateSeedEntity(disputeType, new Dictionary<string, object?>
        {
            ["Id"] = disputeId,
            ["DisputeCode"] = "DC-202610-0001",
            ["EmployeeId"] = actorId
        });

        db.Add(periodEntity);
        db.Add(adjustmentEntity);
        db.Add(disputeEntity);
        await db.SaveChangesAsync();

        var auditService = new AuditLogService(db);
        var ctx = new AuditLogContext(actorId, null);
        await auditService.CreateAuditLogEntryAsync(new CreateAuditLogEntry(
            "APPROVE_PAYROLL_PERIOD", "payroll_period", periodId, null, null, "Approve payroll", ctx));
        await auditService.CreateAuditLogEntryAsync(new CreateAuditLogEntry(
            "CREATE_PAYROLL_ADJUSTMENT", "payroll_adjustment", adjustmentId, null, null, "Create adjustment", ctx));
        await auditService.CreateAuditLogEntryAsync(new CreateAuditLogEntry(
            "CREATE_PAYSLIP_DISPUTE", "payslip_dispute", disputeId, null, null, "Create dispute", ctx));

        var page = await auditService.SearchPagedAsync(new AuditLogQuery(Page: 1, PageSize: 10), restrictToInventoryScope: false);

        var periodLog = Assert.Single(page.Items, x => x.EntityType == "payroll_period" && x.EntityId == periodId);
        Assert.False(string.IsNullOrWhiteSpace(periodLog.EntityLabel));
        Assert.NotEqual(periodId.ToString(), periodLog.EntityLabel);
        Assert.True(
            periodLog.EntityLabel!.Contains("PAY-202610", StringComparison.Ordinal) ||
            periodLog.EntityLabel!.Contains("10/2026", StringComparison.Ordinal),
            $"Expected resolved payroll_period label, got '{periodLog.EntityLabel}'.");

        var adjLog = Assert.Single(page.Items, x => x.EntityType == "payroll_adjustment" && x.EntityId == adjustmentId);
        Assert.Contains("ADJ-202610-0001", adjLog.EntityLabel ?? string.Empty, StringComparison.Ordinal);

        var disputeLog = Assert.Single(page.Items, x => x.EntityType == "payslip_dispute" && x.EntityId == disputeId);
        Assert.Contains("DC-202610-0001", disputeLog.EntityLabel ?? string.Empty, StringComparison.Ordinal);
    }

    [Fact]
    public void Ssot_docs_record_implemented_wave_b_routes_and_todo_evidence()
    {
        var root = FindRepositoryRoot();
        var missingApis = File.ReadAllText(Path.Combine(root, "docs", "api", "hrm-missing-apis.md"));
        var todo = File.ReadAllText(Path.Combine(root, "docs", "plans", "todo.md"));

        Assert.Contains("/api/hr/payroll/periods", missingApis);
        Assert.Contains("/api/hr/payslips/me", missingApis);
        Assert.Contains("/api/hr/payslips/disputes/{disputeId}/respond", missingApis);
        Assert.DoesNotContain("hr-payroll.mock.ts", missingApis);

        Assert.DoesNotContain("| `P11-S04` | [Thanh toán lương ca](./phase-11-nhan-su-cham-cong-luong.md) | Chưa gán | TODO |", todo);
    }

    private static AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"HrmWaveBContract_{Guid.NewGuid():N}")
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new AppDbContext(options);
    }

    private static object CreateSeedEntity(Type type, Dictionary<string, object?> overrides)
    {
        var instance = Activator.CreateInstance(type)
            ?? throw new Xunit.Sdk.XunitException($"Could not instantiate {type.FullName}");

        foreach (var prop in type.GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            if (!prop.CanWrite) continue;
            if (overrides.TryGetValue(prop.Name, out var value))
            {
                prop.SetValue(instance, value);
            }
            else if (prop.PropertyType == typeof(string) && prop.GetValue(instance) is null)
            {
                prop.SetValue(instance, string.Empty);
            }
        }

        return instance;
    }

    private static Type RequiredType(string fullName) =>
        BackendAssembly.GetType(fullName) ?? throw new Xunit.Sdk.XunitException($"Missing contract type: {fullName}");

    private static void AssertProperties(Type type, params string[] propertyNames)
    {
        var names = type.GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(property => property.Name)
            .ToHashSet(StringComparer.Ordinal);
        foreach (var propertyName in propertyNames)
            Assert.Contains(propertyName, names);
    }

    private static void AssertEnumValues(Type enumType, params string[] expectedValues)
    {
        Assert.True(enumType.IsEnum, $"{enumType.FullName} must be an enum.");
        var actual = Enum.GetNames(enumType);
        foreach (var expected in expectedValues)
            Assert.Contains(expected, actual);
    }

    private static void AssertTableMapped(AppDbContext db, Type entityType, string expectedTableName)
    {
        var efEntity = db.Model.FindEntityType(entityType);
        Assert.NotNull(efEntity);
        var tableAnnotation = efEntity!.FindAnnotation("Relational:TableName")?.Value?.ToString();
        Assert.Equal(expectedTableName, tableAnnotation);
    }

    private static void AssertTableAndUniqueIndex(AppDbContext db, Type entityType, string expectedTableName, params string[] expectedPropertyNames)
    {
        AssertTableMapped(db, entityType, expectedTableName);
        var efEntity = db.Model.FindEntityType(entityType)!;
        var hasUniqueIndex = efEntity.GetIndexes().Any(index =>
            index.IsUnique &&
            index.Properties.Select(p => p.Name).SequenceEqual(expectedPropertyNames, StringComparer.Ordinal));
        Assert.True(
            hasUniqueIndex,
            $"Entity {entityType.Name} must configure a unique index on ({string.Join(", ", expectedPropertyNames)}).");
    }

    private static IReadOnlyList<(string Method, string Route, IReadOnlyList<object> Attributes, MethodInfo ActionMethod)> ControllerEndpoints(string typeName)
    {
        var controller = RequiredType(typeName);
        var controllerAttributes = controller.GetCustomAttributes(inherit: true).ToArray();
        var controllerRoute = controller.GetCustomAttributes(inherit: true)
            .Where(attribute => attribute.GetType().Name == "RouteAttribute")
            .Select(attribute => ReadStringProperty(attribute, "Template"))
            .FirstOrDefault() ?? string.Empty;
        return controller.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .SelectMany(method => method.GetCustomAttributes(inherit: true)
                .Where(attribute => attribute.GetType().Name.StartsWith("Http", StringComparison.Ordinal))
                .SelectMany(attribute => ReadHttpMethods(attribute).Select(httpMethod =>
                {
                    var actionRoute = ReadStringProperty(attribute, "Template");
                    var route = string.Join("/", new[] { controllerRoute.Trim('/'), actionRoute.Trim('/') }
                        .Where(part => !string.IsNullOrEmpty(part)));
                    var attributes = controllerAttributes
                        .Concat(method.GetCustomAttributes(inherit: true))
                        .Where(item => item.GetType().Name is "AuthorizeAttribute" or "PermissionAttribute")
                        .ToArray();
                    return (httpMethod, route, (IReadOnlyList<object>)attributes, method);
                })))
            .ToArray();
    }

    private static (string Method, string Route, IReadOnlyList<object> Attributes, MethodInfo ActionMethod) FindEndpoint(
        IReadOnlyList<(string Method, string Route, IReadOnlyList<object> Attributes, MethodInfo ActionMethod)> endpoints,
        string method,
        string route) => endpoints.Single(endpoint => endpoint.Method == method && endpoint.Route == route);

    private static void AssertAdminOnly(IReadOnlyList<object> attributes)
    {
        Assert.Contains(attributes, attribute =>
            attribute.GetType().Name == "AuthorizeAttribute" && ReadStringProperty(attribute, "Roles") == "ADMIN" ||
            attribute.GetType().Name == "PermissionAttribute" && ReadStringProperty(attribute, "DefaultRoles") == "ADMIN");
    }

    private static void AssertIncludesRoles(IReadOnlyList<object> attributes, params string[] requiredRoles)
    {
        var roleStrings = attributes.Select(attribute => attribute.GetType().Name switch
        {
            "AuthorizeAttribute" => ReadStringProperty(attribute, "Roles"),
            "PermissionAttribute" => ReadStringProperty(attribute, "DefaultRoles"),
            _ => string.Empty
        }).Where(value => !string.IsNullOrWhiteSpace(value)).ToArray();
        Assert.Contains(roleStrings, roles => requiredRoles.All(role => roles.Split(',').Contains(role, StringComparer.Ordinal)));
    }

    private static IEnumerable<string> ReadHttpMethods(object instance) =>
        instance.GetType().GetProperty("HttpMethods")?.GetValue(instance) is IEnumerable<string> methods
            ? methods
            : [];

    private static void AssertEndpoint(
        IReadOnlyList<(string Method, string Route, IReadOnlyList<object> Attributes, MethodInfo ActionMethod)> endpoints,
        string method,
        string route) =>
        Assert.Contains(endpoints, endpoint => endpoint.Method == method && endpoint.Route == route);

    private static string ReadStringProperty(object instance, string propertyName) =>
        instance.GetType().GetProperty(propertyName)?.GetValue(instance)?.ToString() ?? string.Empty;

    private static string FindRepositoryRoot()
    {
        for (var directory = new DirectoryInfo(Directory.GetCurrentDirectory()); directory is not null; directory = directory.Parent)
        {
            if (File.Exists(Path.Combine(directory.FullName, "AGENTS.md")) && Directory.Exists(Path.Combine(directory.FullName, "docs")))
                return directory.FullName;
        }

        throw new DirectoryNotFoundException("Could not locate repository root.");
    }
}
