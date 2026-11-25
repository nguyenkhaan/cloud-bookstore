using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Configurations;
using backend.src.Controllers;
using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.AuthDto;
using backend.src.Dto.EmployeeDto;
using backend.src.Dto.HrRequestDto;
using backend.src.Dto.UploadDto;
using backend.src.Exceptions;
using backend.src.Infrastructure;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace backend.Tests.Services;

/// <summary>
/// Phase 2 independent verification tests enforcing Single-Fault Isolation and Entrypoint Parity.
/// </summary>
public sealed class HrmWaveAPhase2VerificationTests
{
    private static readonly DateOnly TestDate = new(2026, 11, 22);

    [Fact]
    public async Task CreateAsync_shift_swap_rejects_missing_replacement_even_when_target_shift_is_valid()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var requester = NewEmployee(roles[RoleName.CASHIER], "Requester", "req1@comicpos.vn", "NV-0001");
        db.Employees.Add(requester);
        await db.SaveChangesAsync();
        var service = CreateHrRequestService(db);

        await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(
            requester.Id,
            new CreateHrRequestRequest(
                HrRequestType.SHIFT_SWAP,
                TestDate,
                1,
                TargetShiftNo: 2,
                ReplacementEmployeeId: null,
                CorrectCheckInAt: null,
                CorrectCheckOutAt: null,
                Reason: "Đổi ca với đồng nghiệp."),
            new AuditLogContext(requester.Id, null)));
    }

    [Fact]
    public async Task CreateAsync_shift_swap_rejects_missing_target_shift_even_when_replacement_is_valid()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var requester = NewEmployee(roles[RoleName.CASHIER], "Requester", "req2@comicpos.vn", "NV-0001");
        var replacement = NewEmployee(roles[RoleName.CASHIER], "Replacement", "rep2@comicpos.vn", "NV-0002");
        db.Employees.AddRange(requester, replacement);
        await db.SaveChangesAsync();
        var service = CreateHrRequestService(db);

        await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(
            requester.Id,
            new CreateHrRequestRequest(
                HrRequestType.SHIFT_SWAP,
                TestDate,
                1,
                TargetShiftNo: null,
                ReplacementEmployeeId: replacement.Id,
                CorrectCheckInAt: null,
                CorrectCheckOutAt: null,
                Reason: "Đổi ca với đồng nghiệp."),
            new AuditLogContext(requester.Id, null)));
    }

    [Fact]
    public async Task CreateAsync_attendance_explanation_isolates_missing_check_in_check_out_and_invalid_range()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var requester = NewEmployee(roles[RoleName.CASHIER], "Requester", "req3@comicpos.vn", "NV-0001");
        db.Employees.Add(requester);
        await db.SaveChangesAsync();
        var service = CreateHrRequestService(db);

        var checkIn = TestDate.ToDateTime(new TimeOnly(8, 0));
        var checkOut = TestDate.ToDateTime(new TimeOnly(13, 0));

        await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(
            requester.Id,
            new CreateHrRequestRequest(
                HrRequestType.ATTENDANCE_EXPLANATION,
                TestDate,
                1,
                null,
                null,
                CorrectCheckInAt: null,
                CorrectCheckOutAt: null,
                Reason: "Thiếu cả hai mốc thời gian."),
            new AuditLogContext(requester.Id, null)));

        await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(
            requester.Id,
            new CreateHrRequestRequest(
                HrRequestType.ATTENDANCE_EXPLANATION,
                TestDate,
                1,
                null,
                null,
                CorrectCheckInAt: checkOut,
                CorrectCheckOutAt: checkIn,
                Reason: "Khoảng thời gian không hợp lệ."),
            new AuditLogContext(requester.Id, null)));
    }

    [Fact]
    public async Task ReviewAsync_rejects_request_without_mutating_work_record_and_blocks_non_terminal_status()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var requester = NewEmployee(roles[RoleName.CASHIER], "Requester", "req4@comicpos.vn", "NV-0001");
        var admin = NewEmployee(roles[RoleName.ADMIN], "Admin", "adm4@comicpos.vn", "NV-0002");
        db.Employees.AddRange(requester, admin);
        var record = new EmployeeWorkRecordModel
        {
            EmployeeId = requester.Id,
            WorkDate = TestDate,
            ShiftNo = 1,
            CheckInAt = null,
            CheckOutAt = null,
            AttendanceStatus = AttendanceStatus.INCOMPLETE,
            WorkedMinutes = 0
        };
        db.EmployeeWorkRecords.Add(record);
        var request = new HrRequestModel
        {
            Id = Guid.NewGuid(),
            RequestCode = "HR-20261122-REJ001",
            Type = HrRequestType.ATTENDANCE_EXPLANATION,
            RequesterId = requester.Id,
            ApplyDate = TestDate,
            ShiftNo = 1,
            CorrectCheckInAt = TestDate.ToDateTime(new TimeOnly(8, 0)),
            CorrectCheckOutAt = TestDate.ToDateTime(new TimeOnly(13, 0)),
            Reason = "Máy chấm công mất kết nối.",
            Status = HrRequestStatus.PENDING
        };
        db.HrRequests.Add(request);
        await db.SaveChangesAsync();
        var service = CreateHrRequestService(db);

        await Assert.ThrowsAsync<BadRequestException>(() => service.ReviewAsync(
            admin.Id,
            request.Id,
            new HrRequestReviewRequest(HrRequestStatus.PENDING, "Trạng thái không hợp lệ"),
            new AuditLogContext(admin.Id, null)));

        var rejected = await service.ReviewAsync(
            admin.Id,
            request.Id,
            new HrRequestReviewRequest(HrRequestStatus.REJECTED, "Không khớp nhật ký quầy."),
            new AuditLogContext(admin.Id, null));

        Assert.Equal(HrRequestStatus.REJECTED, rejected.Status);
        Assert.Equal("Không khớp nhật ký quầy.", rejected.ReviewNote);
        Assert.Contains(rejected.History, h => h.Action == "REJECTED");

        var unchangedRecord = await db.EmployeeWorkRecords.SingleAsync();
        Assert.Equal(AttendanceStatus.INCOMPLETE, unchangedRecord.AttendanceStatus);
        Assert.Null(unchangedRecord.CheckInAt);
        Assert.Null(unchangedRecord.CheckOutAt);
    }

    [Fact]
    public async Task HrRequestsController_forbids_pending_scope_for_inventory_manager_and_allows_mine()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var inventory = NewEmployee(roles[RoleName.INVENTORY_MANAGER], "Inventory", "inv@comicpos.vn", "NV-0001");
        db.Employees.Add(inventory);
        await db.SaveChangesAsync();

        var service = CreateHrRequestService(db);
        var controller = new HrRequestsController(service)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = Principal(inventory.Id, RoleName.INVENTORY_MANAGER) }
            }
        };

        var pendingResult = await controller.List(new HrRequestQuery("pending"), CancellationToken.None);
        Assert.IsType<ForbidResult>(pendingResult.Result);

        var mineResult = await controller.List(new HrRequestQuery("mine"), CancellationToken.None);
        var ok = Assert.IsType<OkObjectResult>(mineResult.Result);
        var dto = Assert.IsType<HrRequestListDto>(ok.Value);
        Assert.Empty(dto.ApprovalQueue);
    }

    [Fact]
    public async Task EmployeeService_isolates_missing_employee_non_invited_resend_duplicate_email_and_empty_role_reason()
    {
        await using var db = CreateDbContext();
        var roles = SeedRoles(db);
        var admin = NewEmployee(roles[RoleName.ADMIN], "Admin", "admin@comicpos.vn", "NV-0001");
        var locked = NewEmployee(roles[RoleName.CASHIER], "Locked", "locked@comicpos.vn", "NV-0002", EmployeeStatus.LOCKED);
        db.Employees.AddRange(admin, locked);
        await db.SaveChangesAsync();
        var service = CreateEmployeeService(db);

        await Assert.ThrowsAsync<NotFoundException>(() => service.ResendSetupEmailAsync(Guid.NewGuid()));
        await Assert.ThrowsAsync<ConflictException>(() => service.ResendSetupEmailAsync(locked.Id));

        await Assert.ThrowsAsync<ConflictException>(() => service.UpdateAsync(
            admin.Id,
            locked.Id,
            new UpdateEmployeeRequest("ADMIN@comicpos.vn", locked.FullName, locked.Phone, null, EmployeeStatus.LOCKED, "Test"),
            new AuditLogContext(admin.Id, null)));

        await Assert.ThrowsAsync<BadRequestException>(() => service.ChangeRoleAsync(
            admin.Id,
            locked.Id,
            new ChangeEmployeeRequest(RoleName.INVENTORY_MANAGER, "   "),
            new AuditLogContext(admin.Id, null)));
    }

    [Fact]
    public async Task EmployeeService_create_and_resend_tokens_are_accepted_by_AuthService_ResetPassword()
    {
        await using var db = CreateDbContext();
        SeedRoles(db);
        await db.SaveChangesAsync();
        var config = BuildTestConfiguration();
        var email = new RecordingEmailService();
        var tokenService = new TokenService(config);
        var employeeService = new EmployeeService(db, new AuditLogService(db), email, tokenService);
        var authService = new AuthService(
            db,
            tokenService,
            new SettingService(config),
            email,
            new TokenJtiStore(new RedisService(new HttpClient(), config)),
            new CsrfTokenService(new InMemoryCsrfStore(), CsrfTokenSigningKey.FromSecret("test-csrf-secret-that-is-long-enough")),
            config);

        var actorId = Guid.NewGuid();
        var created = await employeeService.CreateAsync(
            actorId,
            new CreateEmployeeRequest("onboard.roundtrip@comicpos.vn", "Onboard Staff", "0908999888", RoleName.CASHIER),
            new AuditLogContext(actorId, null));
        await employeeService.ResendSetupEmailAsync(created.Id);

        var latestToken = email.SetupEmails.Last().Token;
        await authService.ResetPassword(new ResetPasswordRequest
        {
            Token = latestToken,
            NewPassword = "Valid!OnboardPass2026"
        });

        var persisted = await db.Employees.AsNoTracking().SingleAsync(e => e.Id == created.Id);
        Assert.Equal(EmployeeStatus.ACTIVE, persisted.Status);
        Assert.Null(persisted.PasswordResetTokenHash);
    }

    private static AppDbContext CreateDbContext()
        => new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);

    private static HrRequestService CreateHrRequestService(AppDbContext db)
        => new(db, new UploadIntentService(db, new FakeCloudinaryService(), new AuditLogService(db)), new FakeCloudinaryService());

    private static IConfiguration BuildTestConfiguration()
        => new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:AccessSecret:Key"] = "test-access-secret-key-that-is-long-enough-0001",
            ["Jwt:RefreshSecret:Key"] = "test-refresh-secret-key-that-is-long-enough-0002",
            ["Jwt:VerifyRegisterSecret:Key"] = "test-verify-secret-key-that-is-long-enough-0003",
            ["Jwt:ResetPasswordSecret:Key"] = "test-reset-secret-key-that-is-long-enough-0004"
        }).Build();

    private static EmployeeService CreateEmployeeService(AppDbContext db)
    {
        var config = BuildTestConfiguration();
        return new EmployeeService(db, new AuditLogService(db), new NoopEmailService(), new TokenService(config));
    }

    private static ClaimsPrincipal Principal(Guid employeeId, RoleName role)
        => new(new ClaimsIdentity(
        [
            new Claim(JwtRegisteredClaimNames.Sub, employeeId.ToString()),
            new Claim("role", role.ToString()),
            new Claim(ClaimTypes.Role, role.ToString())
        ], "test"));

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
        string code,
        EmployeeStatus status = EmployeeStatus.ACTIVE)
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
            Status = status
        };

    private sealed class RecordingEmailService()
        : EmailService(Options.Create(new EmailSettings
        {
            FromAddress = "no-reply@test.local",
            FromName = "Test",
            SmtpHost = "localhost",
            SmtpPort = 1025,
            FrontendBaseUrl = "http://localhost:5173"
        }), NullLogger<EmailService>.Instance)
    {
        public List<(string Email, string Name, string Token)> SetupEmails { get; } = [];

        public override Task SendAccountSetupEmailAsync(
            string recipientEmail,
            string recipientName,
            string token,
            CancellationToken cancellationToken = default)
        {
            SetupEmails.Add((recipientEmail, recipientName, token));
            return Task.CompletedTask;
        }
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
        : EmailService(Options.Create(new backend.src.Configurations.EmailSettings
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
