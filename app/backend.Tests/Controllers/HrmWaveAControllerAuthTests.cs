using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using backend.src.Bases.Enums;
using backend.src.Configurations;
using backend.src.Controllers;
using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.AuthDto;
using backend.src.Dto.HrRequestDto;
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
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;
using BCryptHasher = BCrypt.Net.BCrypt;

namespace backend.Tests.Controllers;

public sealed class HrmWaveAControllerAuthTests
{
    [Fact]
    public void Hr_controllers_keep_admin_and_staff_authorization_boundaries ()
    {
        var employeesClassAttributes = typeof(EmployeesController).GetCustomAttributes(inherit: true);
        Assert.Contains(employeesClassAttributes, attribute =>
            attribute is AuthorizeAttribute authorize && authorize.Roles == nameof(RoleName.ADMIN));

        var requestsClassAttributes = typeof(HrRequestsController).GetCustomAttributes(inherit: true);
        var classPermission = Assert.Single(requestsClassAttributes.OfType<PermissionAttribute>());
        Assert.Equal("ADMIN,CASHIER,INVENTORY_MANAGER", classPermission.DefaultRoles);

        var reviewAttributes = typeof(HrRequestsController)
            .GetMethod(nameof(HrRequestsController.Review))!
            .GetCustomAttributes(inherit: true);
        Assert.Contains(reviewAttributes, attribute =>
            attribute is AuthorizeAttribute authorize && authorize.Roles == nameof(RoleName.ADMIN));
    }

    [Fact]
    public void Dynamic_catalog_marks_employee_permissions_admin_only_and_request_review_admin_only ()
    {
        var defaults = RolePermissionService.Defaults;
        Assert.All(defaults.Where(item => item.PermissionCode.StartsWith("Employees.", StringComparison.Ordinal)),
            item =>
            {
                Assert.True(item.AdminOnly);
                Assert.True(item.AdminAllowed);
                Assert.False(item.CashierAllowed);
                Assert.False(item.WarehouseAllowed);
            });

        var review = defaults.Single(item => item.PermissionCode == "HrRequests.Review");
        Assert.True(review.AdminOnly);

        var staffVisible = defaults.Where(item => item.PermissionCode is
            "HrRequests.List" or "HrRequests.Create" or "HrRequests.Cancel").ToArray();
        Assert.Equal(3, staffVisible.Length);
        Assert.All(staffVisible, item =>
        {
            Assert.False(item.AdminOnly);
            Assert.True(item.CashierAllowed);
            Assert.True(item.WarehouseAllowed);
        });
    }

    [Fact]
    public void Dynamic_permission_validation_rejects_granting_admin_only_employee_permissions ()
    {
        var tampered = RolePermissionService.Defaults
            .Select(item => item.PermissionCode == "Employees.List"
                ? item with { CashierAllowed = true }
                : item)
            .ToArray();

        Assert.Throws<BadRequestException>(() => RolePermissionService.Validate(tampered));
    }

    [Fact]
    public async Task ResetPassword_accepts_invited_account_transitioning_it_to_active_and_clearing_lockout ()
    {
        await using var db = CreateDbContext();
        var role = new RoleModel { RoleName = RoleName.CASHIER, IsActive = true };
        db.Roles.Add(role);
        var configuration = BuildConfiguration();
        var tokenService = new TokenService(configuration);
        var employeeId = Guid.NewGuid();
        var employee = new EmployeeModel
        {
            Id = employeeId,
            Email = "invited@comicpos.vn",
            FullName = "Invited Staff",
            Password = "old-hash",
            Phone = "0900000000",
            EmployeeCode = "NV-0001",
            RoleId = role.Id,
            Role = role,
            Status = EmployeeStatus.INVITED,
            FailedLoginAttempts = 4,
            LockoutEndUtc = DateTime.UtcNow.AddMinutes(10)
        };
        var token = tokenService.GenerateToken(employeeId, TokenType.RESET_PASSWORD, [new Claim("email", employee.Email)]);
        employee.PasswordResetTokenHash = HashToken(token);
        db.Employees.Add(employee);
        await db.SaveChangesAsync();

        var authService = CreateAuthService(db, tokenService, configuration);

        await authService.ResetPassword(new ResetPasswordRequest
        {
            Token = token,
            NewPassword = "Brand-New-Passphrase-2026"
        });

        var updated = await db.Employees.AsNoTracking().SingleAsync();
        Assert.Equal(EmployeeStatus.ACTIVE, updated.Status);
        Assert.Equal(0, updated.FailedLoginAttempts);
        Assert.Null(updated.LockoutEndUtc);
        Assert.Null(updated.PasswordResetTokenHash);
        Assert.True(BCryptHasher.Verify("Brand-New-Passphrase-2026", updated.Password));

        await Assert.ThrowsAsync<UnauthorizedException>(() => authService.ResetPassword(new ResetPasswordRequest
        {
            Token = token,
            NewPassword = "Another-Passphrase-2026"
        }));
    }

    [Fact]
    public async Task ResetPassword_rejects_locked_accounts ()
    {
        await using var db = CreateDbContext();
        var role = new RoleModel { RoleName = RoleName.CASHIER, IsActive = true };
        db.Roles.Add(role);
        var configuration = BuildConfiguration();
        var tokenService = new TokenService(configuration);
        var employeeId = Guid.NewGuid();
        var employee = new EmployeeModel
        {
            Id = employeeId,
            Email = "locked@comicpos.vn",
            FullName = "Locked Staff",
            Password = "old-hash",
            Phone = "0900000000",
            EmployeeCode = "NV-0002",
            RoleId = role.Id,
            Role = role,
            Status = EmployeeStatus.LOCKED
        };
        var token = tokenService.GenerateToken(employeeId, TokenType.RESET_PASSWORD, [new Claim("email", employee.Email)]);
        employee.PasswordResetTokenHash = HashToken(token);
        db.Employees.Add(employee);
        await db.SaveChangesAsync();

        var authService = CreateAuthService(db, tokenService, configuration);

        await Assert.ThrowsAsync<UnauthorizedException>(() => authService.ResetPassword(new ResetPasswordRequest
        {
            Token = token,
            NewPassword = "Brand-New-Passphrase-2026"
        }));
    }

    [Fact]
    public async Task HrRequests_list_forbids_pending_scope_for_non_admin_and_rejects_self_review ()
    {
        await using var db = CreateDbContext();
        var role = new RoleModel { RoleName = RoleName.CASHIER, IsActive = true };
        db.Roles.Add(role);
        var requesterId = Guid.NewGuid();
        var employee = new EmployeeModel
        {
            Id = requesterId,
            Email = "cashier@comicpos.vn",
            FullName = "Cashier",
            Password = "hash",
            Phone = "0900000000",
            EmployeeCode = "NV-0001",
            RoleId = role.Id,
            Role = role,
            Status = EmployeeStatus.ACTIVE
        };
        db.Employees.Add(employee);
        var request = new HrRequestModel
        {
            Id = Guid.NewGuid(),
            RequestCode = "HR-20261126-SELF01",
            Type = HrRequestType.LEAVE,
            RequesterId = requesterId,
            ApplyDate = new DateOnly(2026, 11, 26),
            ShiftNo = 1,
            Reason = "Nghỉ phép.",
            Status = HrRequestStatus.PENDING
        };
        db.HrRequests.Add(request);
        await db.SaveChangesAsync();

        var service = new HrRequestService(db,
            new UploadIntentService(db, new FakeCloudinaryService(), new AuditLogService(db)),
            new FakeCloudinaryService());

        var cashierController = new HrRequestsController(service)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = Principal(requesterId, RoleName.CASHIER) } }
        };
        var pendingResult = await cashierController.List(new HrRequestQuery("pending"), CancellationToken.None);
        Assert.IsType<ForbidResult>(pendingResult.Result);

        var mineResult = await cashierController.List(new HrRequestQuery("mine"), CancellationToken.None);
        var okResult = Assert.IsType<OkObjectResult>(mineResult.Result);
        var payload = Assert.IsType<HrRequestListDto>(okResult.Value);
        Assert.Single(payload.MyRequests);
        Assert.Empty(payload.ApprovalQueue);
    }

    [Fact]
    public async Task HrRequests_review_throws_forbidden_for_self_review_maker_checker ()
    {
        await using var db = CreateDbContext();
        var role = new RoleModel { RoleName = RoleName.ADMIN, IsActive = true };
        db.Roles.Add(role);
        var adminId = Guid.NewGuid();
        var admin = new EmployeeModel
        {
            Id = adminId,
            Email = "admin@comicpos.vn",
            FullName = "Admin",
            Password = "hash",
            Phone = "0900000000",
            EmployeeCode = "NV-0001",
            RoleId = role.Id,
            Role = role,
            Status = EmployeeStatus.ACTIVE
        };
        db.Employees.Add(admin);
        var request = new HrRequestModel
        {
            Id = Guid.NewGuid(),
            RequestCode = "HR-20261126-SELF02",
            Type = HrRequestType.LEAVE,
            RequesterId = adminId,
            ApplyDate = new DateOnly(2026, 11, 26),
            ShiftNo = 1,
            Reason = "Nghỉ phép.",
            Status = HrRequestStatus.PENDING
        };
        db.HrRequests.Add(request);
        await db.SaveChangesAsync();

        var service = new HrRequestService(db,
            new UploadIntentService(db, new FakeCloudinaryService(), new AuditLogService(db)),
            new FakeCloudinaryService());

        await Assert.ThrowsAsync<ForbiddenException>(() => service.ReviewAsync(adminId, request.Id,
            new HrRequestReviewRequest(HrRequestStatus.APPROVED, "Tự duyệt"), new AuditLogContext(adminId, null)));
    }

    [Fact]
    public async Task Audit_log_resolves_employee_and_hr_request_entity_labels ()
    {
        await using var db = CreateDbContext();
        var role = new RoleModel { RoleName = RoleName.CASHIER, IsActive = true };
        db.Roles.Add(role);
        var employee = new EmployeeModel
        {
            Id = Guid.NewGuid(),
            Email = "label@comicpos.vn",
            FullName = "Label Employee",
            Password = "hash",
            Phone = "0900000000",
            EmployeeCode = "NV-0007",
            RoleId = role.Id,
            Role = role,
            Status = EmployeeStatus.ACTIVE
        };
        var request = new HrRequestModel
        {
            Id = Guid.NewGuid(),
            RequestCode = "HR-20261126-LBL001",
            Type = HrRequestType.LEAVE,
            RequesterId = employee.Id,
            ApplyDate = new DateOnly(2026, 11, 26),
            ShiftNo = 1,
            Reason = "Nghỉ phép.",
            Status = HrRequestStatus.PENDING
        };
        db.Employees.Add(employee);
        db.HrRequests.Add(request);
        foreach (var entityType in new[] { "employee", "employees", "employeemodel" })
        {
            db.AuditLogs.Add(new AuditLogModel
            {
                ActorId = employee.Id,
                Action = "UPDATE_EMPLOYEE",
                EntityType = entityType,
                EntityId = employee.Id,
                Reason = "test",
                OccurredAt = DateTime.UtcNow
            });
        }
        foreach (var entityType in new[] { "hr_request", "hrrequest" })
        {
            db.AuditLogs.Add(new AuditLogModel
            {
                ActorId = employee.Id,
                Action = "CREATE_HR_REQUEST",
                EntityType = entityType,
                EntityId = request.Id,
                Reason = "test",
                OccurredAt = DateTime.UtcNow
            });
        }
        await db.SaveChangesAsync();

        var auditLogService = new AuditLogService(db);
        var responses = await auditLogService.SearchAsync(new AuditLogQuery(PageSize: 20));

        Assert.Equal(5, responses.Count);
        Assert.All(responses.Where(item => item.EntityId == employee.Id),
            item => Assert.Equal("Label Employee", item.EntityLabel));
        Assert.All(responses.Where(item => item.EntityId == request.Id),
            item => Assert.Equal("HR-20261126-LBL001", item.EntityLabel));
    }

    private static string HashToken(string token)
        => Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private static ClaimsPrincipal Principal(Guid employeeId, RoleName role)
        => new(new ClaimsIdentity(
        [
            new Claim(JwtRegisteredClaimNames.Sub, employeeId.ToString()),
            new Claim("role", role.ToString()),
            new Claim(ClaimTypes.Role, role.ToString())
        ], "test"));

    private static AppDbContext CreateDbContext()
        => new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);

    private static IConfiguration BuildConfiguration()
        => new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:AccessSecret:Key"] = "test-access-secret-key-that-is-long-enough-0001",
            ["Jwt:RefreshSecret:Key"] = "test-refresh-secret-key-that-is-long-enough-0002",
            ["Jwt:VerifyRegisterSecret:Key"] = "test-verify-secret-key-that-is-long-enough-0003",
            ["Jwt:ResetPasswordSecret:Key"] = "test-reset-secret-key-that-is-long-enough-0004"
        }).Build();

    private static AuthService CreateAuthService(AppDbContext db, TokenService tokenService, IConfiguration configuration)
    {
        var redisService = new RedisService(new HttpClient(), configuration);
        return new AuthService(
            db,
            tokenService,
            new SettingService(configuration),
            new NoopEmailService(),
            new TokenJtiStore(redisService),
            new CsrfTokenService(new InMemoryCsrfStore(), CsrfTokenSigningKey.FromSecret("test-csrf-secret-that-is-long-enough")),
            configuration);
    }

    private sealed class InMemoryCsrfStore : ICsrfTokenStore
    {
        private readonly Dictionary<string, string> values = [];

        public Task StoreAsync(string accessJti, string tokenHash, TimeSpan lifetime, CancellationToken cancellationToken = default)
        {
            values[accessJti] = tokenHash;
            return Task.CompletedTask;
        }

        public Task<string?> GetAsync(string accessJti, CancellationToken cancellationToken = default)
            => Task.FromResult(values.TryGetValue(accessJti, out var value) ? value : null);

        public Task RemoveAsync(string accessJti, CancellationToken cancellationToken = default)
        {
            values.Remove(accessJti);
            return Task.CompletedTask;
        }
    }

    private sealed class NoopEmailService()
        : EmailService(Options.Create(new EmailSettings
        {
            FromAddress = "no-reply@test.local",
            FromName = "Test",
            SmtpHost = "localhost",
            SmtpPort = 1025,
            FrontendBaseUrl = "http://localhost:5173"
        }), NullLogger<EmailService>.Instance);

    private sealed class FakeCloudinaryService : ICloudinaryService
    {
        public CloudinaryUploadPolicy GetPolicy(UploadOwnerType ownerType)
            => new("authenticated", "test-preset", "private/hr/requests");

        public CloudinaryUploadSignature CreateUploadSignature(UploadOwnerType ownerType, Guid intentId)
            => new("test-api-key", "https://api.cloudinary.com/v1_1/test/image/upload",
                $"cloud-bookstore/private/hr/requests/{intentId:N}", "cloud-bookstore/private/hr/requests",
                "test-preset", "authenticated", false, 1_735_689_100, "upload-signature");

        public bool VerifyUploadResponse(string publicImageId, long version, string responseSignature) => true;

        public string BuildImageUrl(string publicImageId, UploadOwnerType ownerType)
            => $"https://res.cloudinary.com/test/image/upload/{publicImageId}";

        public Task DestroyAsync(string publicImageId, UploadOwnerType ownerType, CancellationToken cancellationToken = default)
            => Task.CompletedTask;
    }
}
