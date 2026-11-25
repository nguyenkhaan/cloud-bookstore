using System.Reflection;
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
        var employeeRoutes = ControllerRouteTemplates("backend.src.Controllers.EmployeesController");
        var requestRoutes = ControllerRouteTemplates("backend.src.Controllers.HrRequestsController");

        Assert.Contains("api/employees", employeeRoutes.ControllerRoute);
        Assert.Contains("api/employees", employeeRoutes.ActionRoutes);
        Assert.Contains("shifts", employeeRoutes.ActionRoutes);
        Assert.Contains("resend-setup-email", employeeRoutes.ActionRoutes);
        Assert.Contains("role", ControllerRouteTemplates("backend.src.Controllers.EmployeeController").ActionRoutes);

        Assert.Contains("api/hr/requests", requestRoutes.ControllerRoute);
        Assert.Contains("options", requestRoutes.ActionRoutes);
        Assert.Contains("cancel", requestRoutes.ActionRoutes);
        Assert.Contains("review", requestRoutes.ActionRoutes);
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

    private static Type RequiredType(string fullName) =>
        BackendAssembly.GetType(fullName) ?? throw new Xunit.Sdk.XunitException($"Missing contract type: {fullName}");

    private static void AssertProperties(Type type, params string[] propertyNames)
    {
        var names = type.GetProperties(BindingFlags.Public | BindingFlags.Instance).Select(property => property.Name).ToHashSet(StringComparer.Ordinal);
        foreach (var propertyName in propertyNames)
            Assert.Contains(propertyName, names);
    }

    private static (string ControllerRoute, string ActionRoutes) ControllerRouteTemplates(string typeName)
    {
        var controller = RequiredType(typeName);
        var controllerRoute = controller.GetCustomAttributes(inherit: true)
            .Where(attribute => attribute.GetType().Name == "RouteAttribute")
            .Select(attribute => ReadStringProperty(attribute, "Template"))
            .FirstOrDefault() ?? string.Empty;
        var actionRoutes = string.Join(" ", controller.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .SelectMany(method => method.GetCustomAttributes(inherit: true))
            .Where(attribute => attribute.GetType().Name.StartsWith("Http", StringComparison.Ordinal))
            .Select(attribute => ReadStringProperty(attribute, "Template")));
        return (controllerRoute, actionRoutes);
    }

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
