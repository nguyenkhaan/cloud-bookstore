using System.Reflection;
using backend.src.Data;
using backend.src.Models.Enums;
using backend.src.Services;
using Xunit;

namespace backend.Tests.Services;

public sealed class HrmWaveAContractTests
{
    private static readonly Assembly BackendAssembly = typeof(EmployeeService).Assembly;

    [Fact]
    public void Accepted_pdr_and_feature_catalog_record_the_wave_a_decision()
    {
        var root = FindRepositoryRoot();
        var decisionPath = Path.Combine(root, "docs", "decisions", "PDR-009-periodic-hrm-requests-payroll-and-direct-onboarding.md");
        var decisionIndex = File.ReadAllText(Path.Combine(root, "docs", "decisions", "README.md"));
        var featureCatalog = File.ReadAllText(Path.Combine(root, "docs", "FEATURE.md"));
        var businessRules = File.ReadAllText(Path.Combine(root, "docs", "requirements", "BUSINESS_RULES.md"));

        Assert.True(File.Exists(decisionPath), "PDR-009 must be materialized as an accepted decision.");
        Assert.Contains("Status: Accepted", File.ReadAllText(decisionPath));
        Assert.Contains("PDR-009", decisionIndex);
        Assert.Contains("PDR-009", featureCatalog);
        Assert.Contains("PDR-009", businessRules);
    }

    [Fact]
    public void Employee_and_session_contracts_expose_hr_account_fields_without_credentials()
    {
        var employee = RequiredType("backend.src.Models.EmployeeModel");
        AssertProperties(employee, "EmployeeCode", "JobTitle", "BranchName", "IsProtected", "HourlyRate", "BankName", "BankAccountNumber");

        var sessionUser = RequiredType("backend.src.Dto.AuthDto.BrowserSessionUser");
        AssertProperties(sessionUser, "EmployeeCode");
        Assert.DoesNotContain(sessionUser.GetProperties(), property => property.Name is "Password" or "PasswordResetTokenHash");
    }

    [Fact]
    public void Employee_and_hr_request_entrypoints_are_present_with_expected_route_families()
    {
        var employeeEndpoints = ControllerEndpoints("backend.src.Controllers.EmployeesController");
        var roleEndpoints = ControllerEndpoints("backend.src.Controllers.EmployeeController");
        var requestEndpoints = ControllerEndpoints("backend.src.Controllers.HrRequestsController");

        AssertEndpoint(employeeEndpoints, "GET", "api/employees");
        AssertEndpoint(employeeEndpoints, "POST", "api/employees");
        AssertEndpoint(employeeEndpoints, "GET", "api/employees/{employeeId:guid}");
        AssertEndpoint(employeeEndpoints, "GET", "api/employees/{employeeId:guid}/shifts");
        AssertEndpoint(employeeEndpoints, "PUT", "api/employees/{employeeId:guid}");
        AssertEndpoint(employeeEndpoints, "PATCH", "api/employees/{employeeId:guid}/role");
        AssertEndpoint(employeeEndpoints, "POST", "api/employees/{employeeId:guid}/resend-setup-email");
        AssertEndpoint(roleEndpoints, "PATCH", "api/employee/{employeeId:guid}/role");

        AssertEndpoint(requestEndpoints, "GET", "api/hr/requests");
        AssertEndpoint(requestEndpoints, "GET", "api/hr/requests/options");
        AssertEndpoint(requestEndpoints, "POST", "api/hr/requests");
        AssertEndpoint(requestEndpoints, "POST", "api/hr/requests/{requestId:guid}/cancel");
        AssertEndpoint(requestEndpoints, "POST", "api/hr/requests/{requestId:guid}/review");
    }

    [Fact]
    public void Auth_upload_settings_and_audit_entrypoints_remain_registered()
    {
        AssertEndpoint(ControllerEndpoints("backend.src.Controllers.AuthController"), "GET", "api/auth/session");
        AssertEndpoint(ControllerEndpoints("backend.src.Controllers.AuthController"), "POST", "api/auth/password-resets");
        AssertEndpoint(ControllerEndpoints("backend.src.Controllers.UploadsController"), "POST", "api/uploads/signature");
        AssertEndpoint(ControllerEndpoints("backend.src.Controllers.SettingsController"), "GET", "api/settings/my-permissions");
        AssertEndpoint(ControllerEndpoints("backend.src.Controllers.SettingsController"), "GET", "api/settings/rbac-matrix");
        AssertEndpoint(ControllerEndpoints("backend.src.Controllers.SettingsController"), "PUT", "api/settings/rbac-matrix");
        AssertEndpoint(ControllerEndpoints("backend.src.Controllers.AuditLogController"), "GET", "api/audit");
    }

    [Fact]
    public void Dynamic_permission_catalog_includes_employee_and_request_actions()
    {
        var codes = RolePermissionService.Defaults.Select(item => item.PermissionCode).ToHashSet(StringComparer.Ordinal);

        Assert.Contains(codes, code => code.StartsWith("Employees.", StringComparison.Ordinal));
        Assert.Contains(codes, code => code.StartsWith("HrRequests.", StringComparison.Ordinal));
        Assert.Contains(codes, code => code == "HrRequests.Review");
    }

    [Fact]
    public void Hrm_controller_authorization_attributes_keep_role_boundaries()
    {
        var employees = ControllerEndpoints("backend.src.Controllers.EmployeesController");
        var requests = ControllerEndpoints("backend.src.Controllers.HrRequestsController");

        Assert.All(employees, action => AssertAdminOnly(action.Attributes));
        AssertAdminOnly(ControllerEndpoints("backend.src.Controllers.EmployeeController")
            .Single(action => action.Method == "PATCH" && action.Route == "api/employee/{employeeId:guid}/role").Attributes);

        foreach (var route in new[] { "api/hr/requests", "api/hr/requests/options" })
            AssertIncludesRoles(FindEndpoint(requests, "GET", route).Attributes, "ADMIN", "CASHIER", "INVENTORY_MANAGER");
        foreach (var route in new[] { "api/hr/requests", "api/hr/requests/{requestId:guid}/cancel" })
            AssertIncludesRoles(FindEndpoint(requests, "POST", route).Attributes, "ADMIN", "CASHIER", "INVENTORY_MANAGER");
        AssertAdminOnly(FindEndpoint(requests, "POST", "api/hr/requests/{requestId:guid}/review").Attributes);
    }

    [Fact]
    public void Employee_and_request_dtos_expose_workflow_fields_not_secret_material()
    {
        var employeeDtos = BackendAssembly.GetTypes()
            .Where(type => type.Namespace == "backend.src.Dto.EmployeeDto")
            .ToArray();
        var requestDtos = BackendAssembly.GetTypes()
            .Where(type => type.Namespace == "backend.src.Dto.HrRequestDto")
            .ToArray();

        Assert.NotEmpty(employeeDtos);
        Assert.NotEmpty(requestDtos);
        var allDtos = employeeDtos.Concat(requestDtos).ToArray();
        Assert.DoesNotContain(allDtos.SelectMany(type => type.GetProperties()), property =>
            property.Name is "Password" or "PasswordResetTokenHash");

        var createEmployee = RequiredType("backend.src.Dto.EmployeeDto.CreateEmployeeRequest");
        AssertProperties(createEmployee, "Email", "FullName", "Phone", "RoleName");
        var updateEmployee = RequiredType("backend.src.Dto.EmployeeDto.UpdateEmployeeRequest");
        AssertProperties(updateEmployee, "Email", "FullName", "Phone", "Status");
    }

    [Fact]
    public void Request_domain_contracts_include_history_and_three_request_states()
    {
        RequiredType("backend.src.Models.HrRequestModel");
        RequiredType("backend.src.Models.HrRequestHistoryModel");
        var requestType = RequiredType("backend.src.Models.Enums.HrRequestType");
        var requestStatus = RequiredType("backend.src.Models.Enums.HrRequestStatus");

        Assert.Contains("SHIFT_SWAP", Enum.GetNames(requestType));
        Assert.Contains("LEAVE", Enum.GetNames(requestType));
        Assert.Contains("ATTENDANCE_EXPLANATION", Enum.GetNames(requestType));
        Assert.Contains("PENDING", Enum.GetNames(requestStatus));
        Assert.Contains("APPROVED", Enum.GetNames(requestStatus));
        Assert.Contains("REJECTED", Enum.GetNames(requestStatus));
        Assert.Contains("CANCELLED", Enum.GetNames(requestStatus));
    }

    [Fact]
    public void Hr_request_persistence_sets_and_wave_a_migration_are_registered()
    {
        var properties = typeof(AppDbContext).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(property => property.Name)
            .ToHashSet(StringComparer.Ordinal);
        var root = FindRepositoryRoot();
        var migrationDirectory = Path.Combine(root, "app", "backend", "src", "Data", "Migrations");

        Assert.Contains("HrRequests", properties);
        Assert.Contains("HrRequestHistories", properties);
        Assert.Contains(Directory.EnumerateFiles(migrationDirectory), file =>
            Path.GetFileName(file).EndsWith("_AddHrmWaveAEmployeesAndRequests.cs", StringComparison.Ordinal));
    }

    [Fact]
    public void Cloudinary_owner_contract_includes_hr_request_and_payroll_proofs()
    {
        var ownerNames = Enum.GetNames<UploadOwnerType>();

        Assert.Contains("HR_REQUEST_PROOF", ownerNames);
        Assert.Contains("PAYSLIP_DISPUTE_PROOF", ownerNames);
        Assert.Contains("PAYROLL_PAYOUT_PROOF", ownerNames);
    }

    private static Type RequiredType(string fullName) =>
        BackendAssembly.GetType(fullName) ?? throw new Xunit.Sdk.XunitException($"Missing contract type: {fullName}");

    private static void AssertProperties(Type type, params string[] propertyNames)
    {
        var names = type.GetProperties(BindingFlags.Public | BindingFlags.Instance).Select(property => property.Name).ToHashSet(StringComparer.Ordinal);
        foreach (var propertyName in propertyNames)
            Assert.Contains(propertyName, names);
    }

    private static IReadOnlyList<(string Method, string Route, IReadOnlyList<object> Attributes)> ControllerEndpoints(string typeName)
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
                    return (httpMethod, route, (IReadOnlyList<object>)attributes);
                })))
            .ToArray();
    }

    private static (string Method, string Route, IReadOnlyList<object> Attributes) FindEndpoint(
        IReadOnlyList<(string Method, string Route, IReadOnlyList<object> Attributes)> endpoints,
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
        IReadOnlyList<(string Method, string Route, IReadOnlyList<object> Attributes)> endpoints,
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
