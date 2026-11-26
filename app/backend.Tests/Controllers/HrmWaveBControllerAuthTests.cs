using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Configurations;
using backend.src.Controllers;
using backend.src.Data;
using backend.src.Dto.PayrollDto;
using backend.src.Dto.UploadDto;
using backend.src.Exceptions;
using backend.src.Infrastructure;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Xunit;

namespace backend.Tests.Controllers;

public sealed class HrmWaveBControllerAuthTests
{
    [Fact]
    public void Wave_b_controllers_enforce_admin_and_staff_authorization_attributes()
    {
        var payrollClassAttributes = typeof(HrPayrollController).GetCustomAttributes(inherit: true);
        Assert.Contains(payrollClassAttributes, attribute =>
            attribute is AuthorizeAttribute authorize && authorize.Roles == nameof(RoleName.ADMIN));

        var myPayslipAttrs = typeof(HrPayslipsController)
            .GetMethod(nameof(HrPayslipsController.GetMyPayslip))!
            .GetCustomAttributes(inherit: true);
        var myPerm = Assert.Single(myPayslipAttrs.OfType<PermissionAttribute>());
        Assert.Equal("ADMIN,CASHIER,INVENTORY_MANAGER", myPerm.DefaultRoles);

        var disputeAttrs = typeof(HrPayslipsController)
            .GetMethod(nameof(HrPayslipsController.CreateDispute))!
            .GetCustomAttributes(inherit: true);
        var disputePerm = Assert.Single(disputeAttrs.OfType<PermissionAttribute>());
        Assert.Equal("ADMIN,CASHIER,INVENTORY_MANAGER", disputePerm.DefaultRoles);

        foreach (var adminMethod in new[]
        {
            nameof(HrPayslipsController.GetEmployeePayslip),
            nameof(HrPayslipsController.RespondDispute),
            nameof(HrPayslipsController.ResendZalo)
        })
        {
            var attrs = typeof(HrPayslipsController).GetMethod(adminMethod)!.GetCustomAttributes(inherit: true);
            Assert.Contains(attrs, attribute =>
                attribute is AuthorizeAttribute authorize && authorize.Roles == nameof(RoleName.ADMIN));
        }
    }

    [Fact]
    public void Dynamic_permission_validation_rejects_granting_admin_only_payroll_or_admin_payslip_permissions_to_staff()
    {
        var defaults = RolePermissionService.Defaults;

        var tamperedPayroll = defaults
            .Select(item => item.PermissionCode == "HrPayroll.ListPeriods"
                ? item with { CashierAllowed = true }
                : item)
            .ToArray();
        Assert.Throws<BadRequestException>(() => RolePermissionService.Validate(tamperedPayroll));

        var tamperedAdminPayslip = defaults
            .Select(item => item.PermissionCode == "HrPayslips.RespondDispute"
                ? item with { WarehouseAllowed = true }
                : item)
            .ToArray();
        Assert.Throws<BadRequestException>(() => RolePermissionService.Validate(tamperedAdminPayslip));

        // Staff-scoped GetMyPayslip and CreateDispute remain safely toggleable
        var toggledStaff = defaults
            .Select(item => item.PermissionCode == "HrPayslips.CreateDispute"
                ? item with { CashierAllowed = false }
                : item)
            .ToArray();
        RolePermissionService.Validate(toggledStaff);
    }

    [Fact]
    public async Task HrPayslipsController_derives_actor_from_sub_claim_and_enforces_unauthorized_and_forbidden_boundaries()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var admin = NewEmployee(roles[RoleName.ADMIN], "Admin", "admin@cloud.io", "NV-0001");
        var cashier = NewEmployee(roles[RoleName.CASHIER], "Cashier", "cashier@cloud.io", "NV-0002");
        var inventory = NewEmployee(roles[RoleName.INVENTORY_MANAGER], "Inventory", "inv@cloud.io", "NV-0003");
        db.Employees.AddRange(admin, cashier, inventory);

        var period = new PayrollPeriodModel
        {
            Id = Guid.NewGuid(),
            PeriodKey = "10/2026",
            Year = 2026,
            Month = 10,
            PayrollCode = "PAY-202610",
            AttendanceSourceCode = "ATT-202610",
            Status = PayrollPeriodStatus.SETTLED
        };
        db.PayrollPeriods.Add(period);

        var cashierEntry = new PayrollEntryModel { Id = Guid.NewGuid(), PayrollPeriodId = period.Id, EmployeeId = cashier.Id, NetPay = 500_000 };
        var adminEntry = new PayrollEntryModel { Id = Guid.NewGuid(), PayrollPeriodId = period.Id, EmployeeId = admin.Id, NetPay = 900_000 };
        db.PayrollEntries.AddRange(cashierEntry, adminEntry);

        var ownAdminDispute = new PayslipDisputeModel
        {
            Id = Guid.NewGuid(),
            DisputeCode = "DC-202610-0001",
            PayrollEntryId = adminEntry.Id,
            EmployeeId = admin.Id,
            Category = PayslipDisputeCategory.BONUS,
            Content = "Self dispute",
            Status = PayslipDisputeStatus.PENDING_RESPONSE,
            CreatedAt = DateTime.UtcNow
        };
        db.PayslipDisputes.Add(ownAdminDispute);
        await db.SaveChangesAsync();

        var payslipService = new HrPayslipService(db,
            new UploadIntentService(db, new FakeCloudinaryService(), new AuditLogService(db)),
            new FakeCloudinaryService());

        // Missing Sub claim returns UnauthorizedResult
        var unauthenticatedController = new HrPayslipsController(payslipService)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity()) } }
        };
        Assert.IsType<UnauthorizedResult>((await unauthenticatedController.GetMyPayslip(null, CancellationToken.None)).Result);

        // Cashier calling /me strictly receives cashier's own payslip
        var cashierController = new HrPayslipsController(payslipService)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = Principal(cashier.Id, RoleName.CASHIER) } }
        };
        var meResult = await cashierController.GetMyPayslip("10/2026", CancellationToken.None);
        var ok = Assert.IsType<OkObjectResult>(meResult.Result);
        var dto = Assert.IsType<PayslipDetailDto>(ok.Value);
        Assert.Equal(cashier.Id, dto.EmployeeId);
        Assert.Equal(500_000, dto.NetPay);

        // Inventory manager cannot dispute cashier's entry (403 ForbiddenException)
        var inventoryController = new HrPayslipsController(payslipService)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = Principal(inventory.Id, RoleName.INVENTORY_MANAGER) } }
        };
        await Assert.ThrowsAsync<ForbiddenException>(() => inventoryController.CreateDispute(
            cashierEntry.Id,
            new CreatePayslipDisputeRequest(PayslipDisputeCategory.BONUS, "Đối chiếu hộ"),
            CancellationToken.None));

        // Admin cannot respond to own dispute (403 ForbiddenException)
        var adminController = new HrPayslipsController(payslipService)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = Principal(admin.Id, RoleName.ADMIN) } }
        };
        await Assert.ThrowsAsync<ForbiddenException>(() => adminController.RespondDispute(
            ownAdminDispute.Id,
            new RespondPayslipDisputeRequest(PayslipDisputeStatus.EXPLAINED, "Tự giải trình"),
            CancellationToken.None));
    }

    private static ClaimsPrincipal Principal(Guid employeeId, RoleName role)
        => new(new ClaimsIdentity(
        [
            new Claim(JwtRegisteredClaimNames.Sub, employeeId.ToString()),
            new Claim("role", role.ToString()),
            new Claim(ClaimTypes.Role, role.ToString())
        ], "test"));

    private static AppDbContext CreateDbContext()
        => new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"HrmWaveBAuth_{Guid.NewGuid():N}")
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);

    private static Dictionary<RoleName, RoleModel> SeedRoles(AppDbContext db)
    {
        var roles = new Dictionary<RoleName, RoleModel>();
        foreach (var roleName in Enum.GetValues<RoleName>())
        {
            var role = new RoleModel { RoleName = roleName, IsActive = true };
            roles[roleName] = role;
            db.Roles.Add(role);
        }

        return roles;
    }

    private static EmployeeModel NewEmployee(
        RoleModel role,
        string fullName,
        string email,
        string code)
        => new()
        {
            Id = Guid.NewGuid(),
            Email = email,
            FullName = fullName,
            Password = "hashed-password",
            Phone = "0900000000",
            EmployeeCode = code,
            RoleId = role.Id,
            Role = role,
            Status = EmployeeStatus.ACTIVE
        };

    private sealed class FakeCloudinaryService : ICloudinaryService
    {
        public CloudinaryUploadPolicy GetPolicy(UploadOwnerType ownerType)
            => new("authenticated", "test-preset", "private/disputes");

        public CloudinaryUploadSignature CreateUploadSignature(UploadOwnerType ownerType, Guid intentId)
            => new("test-api-key", "https://api.cloudinary.com/v1_1/test/image/upload",
                $"cloud-bookstore/private/disputes/{intentId:N}", "cloud-bookstore/private/disputes",
                "test-preset", "authenticated", false, 1_735_689_100, "upload-signature");

        public bool VerifyUploadResponse(string publicImageId, long version, string responseSignature) => true;

        public string BuildImageUrl(string publicImageId, UploadOwnerType ownerType)
            => $"https://res.cloudinary.com/test/image/upload/{publicImageId}";

        public Task DestroyAsync(string publicImageId, UploadOwnerType ownerType, CancellationToken cancellationToken = default)
            => Task.CompletedTask;
    }
}
