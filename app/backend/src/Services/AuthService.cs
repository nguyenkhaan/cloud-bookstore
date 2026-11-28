using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using System.Text.RegularExpressions;
using backend.src.Bases.Enums;
using backend.src.Configurations;
using backend.src.Data;
using backend.src.Dto.AuthDto;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.UploadDto;
using backend.src.Exceptions;
using backend.src.Helpers;
using backend.src.Infrastructure;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.IdentityModel.Tokens;
using backend.src.Models;

namespace backend.src.Services;

public class AuthService(
    AppDbContext dbContext,
    TokenService tokenService,
    SettingService settingService,
    EmailService emailService,
    TokenJtiStore tokenJtiStore,
    CsrfTokenService csrfTokenService,
    AuditLogService auditLogService,
    UploadIntentService uploadIntentService,
    ICloudinaryService cloudinaryService,
    IConfiguration configuration,
    RedisService redisService,
    ILogger<AuthService>? logger = null)
{
    private readonly AuthSecuritySettings securitySettings = AuthSecuritySettings.FromConfiguration(configuration);

    public async Task<BrowserAuthenticationSession> Login(LoginRequest request, string userAgent)
    {
        var normalizedEmail = NormalizeEmail(request.Email);
        var employeeId = await dbContext.Employees
            .Where(user => user.Email.ToLower() == normalizedEmail)
            .Select(user => (Guid?)user.Id)
            .FirstOrDefaultAsync();
        if (employeeId is null)
            throw new UnauthorizedException("Invalid email or password");
        await using var transaction = await BeginEmployeeMutationAsync(employeeId.Value);
        var employee = await GetEmployeeAsync(employeeId.Value);

        var now = DateTime.UtcNow;
        var resetFailures = employee.LockoutEndUtc is not null || employee.FailedLoginAttempts != 0;
        if (employee.LockoutEndUtc is { } lockoutEndUtc)
        {
            if (lockoutEndUtc > now)
                throw new ForbiddenException("Account is temporarily locked. Try again later.");

            employee.LockoutEndUtc = null;
            employee.FailedLoginAttempts = 0;
        }

        var passwordIsValid = PasswordPolicy.Verify(request.Password, employee.Password);
        if (!passwordIsValid)
        {
            employee.FailedLoginAttempts++;
            if (employee.FailedLoginAttempts >= securitySettings.MaxFailedLoginAttempts)
            {
                employee.LockoutEndUtc = now.AddMinutes(securitySettings.LockoutDurationMinutes);
            }

            await dbContext.SaveChangesAsync();
            await transaction.CommitAsync();
            if (employee.LockoutEndUtc is not null)
                throw new ForbiddenException("Account is temporarily locked. Try again later.");

            throw new UnauthorizedException("Invalid email or password");
        }
        if (employee.Status != EmployeeStatus.ACTIVE)
            throw new ForbiddenException("Account is not verified or is unavailable");

        if (resetFailures)
        {
            employee.FailedLoginAttempts = 0;
            employee.LockoutEndUtc = null;
        }

        return await IssueBrowserSessionAsync(employee, userAgent, null, transaction);
    }
    public async Task<RegisterResponse> Register(RegisterRequest request, string? clientIp = null)
    {
        var email = NormalizeEmail(request.Email);
        var atIndex = email.LastIndexOf('@');
        if (email.Length > 200 || !Regex.IsMatch(email, @"\A[^@\s]+@[^@\s.]+(?:\.[^@\s.]+)+\z"))
        {
            throw new BadRequestException("Invalid email address");
        }
        var emailDomains = settingService.GetEmailDomains();
        var emailDomain = email[atIndex..];
        if (!emailDomains.Contains(
            emailDomain,
            StringComparer.OrdinalIgnoreCase))
        {
            throw new BadRequestException("Email domain is not allowed");
        }
        PasswordPolicy.Validate(request.Password);
        var employee = await dbContext.Employees.FirstOrDefaultAsync(em => em.Email.ToLower() == email);
        if (employee is not null && employee.Status != EmployeeStatus.PENDING_OTP)
            throw new ConflictException("User has been registered");

        var fullName = request.FullName.Trim();
        if (await IsEmailThrottledAsync(email, clientIp))
            return new RegisterResponse(email, fullName);

        if (employee is not null)
        {
            var verificationToken = await CreateRegistrationVerificationTokenAsync(employee);
            await emailService.SendAccountVerificationEmailAsync(employee.Email, employee.FullName, verificationToken);
            return new RegisterResponse(employee.Email, employee.FullName);
        }
        var employeeRole = await dbContext.Roles.FirstOrDefaultAsync(r => r.RoleName == RoleName.CASHIER);
        var newEmployee = new EmployeeModel
        {
            Email = email,
            Password = PasswordPolicy.Hash(request.Password),
            FullName = fullName,
            Phone = request.Phone.Trim(),
            Status = EmployeeStatus.PENDING_OTP,
            Role = employeeRole!
        };
        string newEmployeeVerificationToken;
        await using var transaction = await dbContext.Database.BeginTransactionAsync();
        try
        {
            await dbContext.Employees.AddAsync(newEmployee);
            await dbContext.SaveChangesAsync();

            newEmployeeVerificationToken = await CreateRegistrationVerificationTokenAsync(newEmployee);
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
        await emailService.SendAccountVerificationEmailAsync(
            newEmployee.Email,
            newEmployee.FullName,
            newEmployeeVerificationToken);
        return new RegisterResponse(Email: newEmployee.Email, FullName: newEmployee.FullName);
    }

    public async Task ResendVerificationAsync(string email, string? clientIp = null)
    {
        var normalizedEmail = NormalizeEmail(email);
        if (await IsEmailThrottledAsync(normalizedEmail, clientIp))
            return;

        var employee = await dbContext.Employees
            .SingleOrDefaultAsync(item => item.Email.ToLower() == normalizedEmail);
        if (employee is null || employee.Status != EmployeeStatus.PENDING_OTP)
        {
            return;
        }

        var verificationToken = await CreateRegistrationVerificationTokenAsync(employee);
        await emailService.SendAccountVerificationEmailAsync(
            employee.Email,
            employee.FullName,
            verificationToken);
    }

    private async Task<bool> IsEmailThrottledAsync(string normalizedEmail, string? clientIp)
    {
        var window = TimeSpan.FromMinutes(securitySettings.EmailThrottleWindowMinutes);
        try
        {
            if (!string.IsNullOrWhiteSpace(clientIp) &&
                await redisService.IncrementAsync(RedisKeyManager.ForEmailThrottleByIp(clientIp), window) > securitySettings.EmailThrottleMaxPerIp)
            {
                logger?.LogWarning("Suppressed authentication email: IP throttle exceeded.");
                return true;
            }

            if (await redisService.IncrementAsync(RedisKeyManager.ForEmailThrottleByAddress(normalizedEmail), window) > securitySettings.EmailThrottleMaxPerEmail)
            {
                logger?.LogWarning("Suppressed authentication email: address throttle exceeded.");
                return true;
            }

            return false;
        }
        catch (Exception exception) when (RedisService.IsUnavailable(exception, CancellationToken.None))
        {
            throw new ServiceUnavailableException("Authentication email is temporarily unavailable.", exception);
        }
    }

    private async Task<string> CreateRegistrationVerificationTokenAsync(EmployeeModel employee)
    {
        var claims = new List<Claim>
        {
            new("email", employee.Email)
        };
        var token = tokenService.GenerateToken(employee.Id, TokenType.VERIFY_REGISTER, claims);
        await tokenJtiStore.StoreRegistrationVerificationAsync(token);
        return token;
    }

    public async Task Verify(string token)
    {
        ClaimsPrincipal principal;
        try
        {
            principal = tokenService.ValidateRegisterVerificationToken(token);
        }
        catch (Exception exception) when (exception is SecurityTokenException or ArgumentException)
        {
            throw new UnauthorizedException("Invalid or expired verification token");
        }

        var subject = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
        var email = principal.FindFirstValue("email");
        var jti = principal.FindFirstValue(JwtRegisteredClaimNames.Jti);
        if (!Guid.TryParse(subject, out var employeeId) || string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(jti))
            throw new UnauthorizedException("Invalid or expired verification token");

        if (!await tokenJtiStore.IsRegistrationVerificationActiveAsync(employeeId, jti))
            throw new UnauthorizedException("Invalid or expired verification token");

        var employee = await dbContext.Employees.FindAsync(employeeId);
        if (employee is null || !string.Equals(employee.Email, email, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedException("Invalid or expired verification token");

        if (employee.Status == EmployeeStatus.ACTIVE)
        {
            await tokenJtiStore.RevokeRegistrationVerificationAsync(employeeId, jti);
            return;
        }
        if (employee.Status != EmployeeStatus.PENDING_OTP)
            throw new ForbiddenException("Account cannot be verified");

        employee.Status = EmployeeStatus.ACTIVE;
        await dbContext.SaveChangesAsync();
        await tokenJtiStore.RevokeRegistrationVerificationAsync(employeeId, jti);
    }

    public async Task<BrowserAuthenticationSession> Refresh(string refreshToken, string? csrfToken, string userAgent)
    {
        var refreshPrincipal = ValidateRefreshToken(refreshToken);
        var refreshJti = refreshPrincipal.FindFirstValue(JwtRegisteredClaimNames.Jti)!;
        string? accessJti;
        try
        {
            accessJti = await tokenJtiStore.GetAccessJtiForRefreshAsync(refreshJti);
            if (string.IsNullOrWhiteSpace(accessJti))
                throw new UnauthorizedException("Invalid or expired refresh token");

            if (!await csrfTokenService.IsValidAsync(accessJti, csrfToken))
                throw new ForbiddenException("Invalid CSRF token");
        }
        catch (Exception exception) when (RedisService.IsUnavailable(exception, CancellationToken.None))
        {
            throw new ServiceUnavailableException("Token state is temporarily unavailable.", exception);
        }

        var subject = refreshPrincipal.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (!Guid.TryParse(subject, out var employeeId))
            throw new UnauthorizedException("Invalid or expired refresh token");

        await using var transaction = await BeginEmployeeMutationAsync(employeeId);
        var employee = await dbContext.Employees
            .Include(item => item.Role)
            .SingleOrDefaultAsync(item => item.Id == employeeId);
        if (employee is null ||
            employee.Status != EmployeeStatus.ACTIVE ||
            employee.LockoutEndUtc > DateTime.UtcNow)
        {
            throw new UnauthorizedException("Account is unavailable.");
        }

        var device = await dbContext.EmployeeSessions.SingleOrDefaultAsync(item =>
            item.EmployeeId == employeeId && item.RefreshJti == refreshJti && item.AccessJti == accessJti &&
            item.RevokedAt == null && item.ExpiresAt > DateTime.UtcNow);
        if (device is null)
            throw new UnauthorizedException("Invalid or expired refresh token");

        var session = await IssueBrowserSessionAsync(employee, userAgent, device, transaction);
        await CleanupSessionKeysAsync(accessJti, refreshJti);
        return session;
    }

    public async Task LogoutByRefreshTokenAsync(Guid employeeId, string refreshToken, string authenticatedAccessJti)
    {
        var refreshPrincipal = ValidateRefreshToken(refreshToken);
        var refreshJti = refreshPrincipal.FindFirstValue(JwtRegisteredClaimNames.Jti)!;

        var accessJti = await tokenJtiStore.GetAccessJtiForRefreshAsync(refreshJti);
        if (!string.Equals(accessJti, authenticatedAccessJti, StringComparison.Ordinal))
            throw new UnauthorizedException("Invalid or expired refresh token");

        await LogoutByAccessTokenAsync(employeeId, authenticatedAccessJti);
    }

    public async Task LogoutByAccessTokenAsync(Guid employeeId, string accessJti)
    {
        await using var transaction = await BeginEmployeeMutationAsync(employeeId);
        var device = await dbContext.EmployeeSessions.SingleOrDefaultAsync(item =>
            item.EmployeeId == employeeId && item.AccessJti == accessJti);
        if (device is null)
        {
            await transaction.CommitAsync();
            await CleanupLegacySessionAsync(accessJti);
            return;
        }
        device.RevokedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();
        await transaction.CommitAsync();
        await CleanupRevokedDevicesAsync([device]);
    }

    public async Task<BrowserSessionResponse> GetBrowserSessionAsync(string accessJti, Guid employeeId)
    {
        await using var transaction = await BeginEmployeeMutationAsync(employeeId);
        if (!await tokenJtiStore.IsActiveAsync(accessJti, TokenType.ACCESS))
            throw new UnauthorizedException("Invalid or expired access token");

        var now = DateTime.UtcNow;
        if (!await dbContext.EmployeeSessions.AnyAsync(item => item.EmployeeId == employeeId &&
                item.AccessJti == accessJti && item.RevokedAt == null && item.ExpiresAt > now))
            throw new UnauthorizedException("Invalid or expired access token");
        var csrfToken = await csrfTokenService.IssueAsync(
            accessJti,
            TimeSpan.FromMinutes(securitySettings.RefreshTokenLifetimeMinutes));
        var employee = await GetEmployeeAsync(employeeId);
        await transaction.CommitAsync();

        return new BrowserSessionResponse(csrfToken, ToSessionUser(employee));
    }

    public async Task RequestPasswordReset(ForgotPasswordRequest request, string? clientIp = null)
    {
        var email = NormalizeEmail(request.Email);
        if (await IsEmailThrottledAsync(email, clientIp))
            return;

        var employeeId = await dbContext.Employees
            .Where(item => item.Email.ToLower() == email && item.Status == EmployeeStatus.ACTIVE)
            .Select(item => (Guid?)item.Id)
            .FirstOrDefaultAsync();
        if (employeeId is null)
            return;

        await using var transaction = await BeginEmployeeMutationAsync(employeeId.Value);
        var employee = await dbContext.Employees.FindAsync(employeeId.Value);
        if (employee is null || employee.Status != EmployeeStatus.ACTIVE)
            return;

        var resetToken = GenerateEmailToken(employee.Id, employee.Email, TokenType.RESET_PASSWORD);
        var tokenHash = HashToken(resetToken);
        employee.PasswordResetTokenHash = tokenHash;
        await dbContext.SaveChangesAsync();
        await transaction.CommitAsync();

        try
        {
            await emailService.SendPasswordResetEmailAsync(employee.Email, employee.FullName, resetToken);
        }
        catch (Exception exception)
        {
            logger?.LogWarning("Password reset email delivery failed ({ErrorType}).", exception.GetType().Name);
            try
            {
                await ClearFailedResetTokenAsync(employee, tokenHash);
            }
            catch (Exception cleanupException)
            {
                logger?.LogWarning("Password reset email recovery failed ({ErrorType}).", cleanupException.GetType().Name);
            }
        }
    }

    private async Task ClearFailedResetTokenAsync(EmployeeModel employee, string tokenHash)
    {
        if (dbContext.Database.IsRelational())
        {
            await dbContext.Employees
                .Where(item => item.Id == employee.Id && item.PasswordResetTokenHash == tokenHash)
                .ExecuteUpdateAsync(setters => setters.SetProperty(item => item.PasswordResetTokenHash, (string?)null));
            return;
        }

        var employeeEntry = dbContext.Entry(employee);
        await employeeEntry.ReloadAsync();
        if (employeeEntry.State != EntityState.Detached && employee.PasswordResetTokenHash == tokenHash)
        {
            employee.PasswordResetTokenHash = null;
            await dbContext.SaveChangesAsync();
        }
    }

    public async Task ResetPassword(ResetPasswordRequest request)
    {
        ClaimsPrincipal principal;
        try
        {
            principal = tokenService.ValidatePasswordResetToken(request.Token);
        }
        catch (Exception exception) when (exception is SecurityTokenException or ArgumentException)
        {
            throw new UnauthorizedException("Invalid or expired password reset token");
        }

        var subject = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
        var email = principal.FindFirstValue("email");
        if (!Guid.TryParse(subject, out var employeeId) || string.IsNullOrWhiteSpace(email))
            throw new UnauthorizedException("Invalid or expired password reset token");

        await using var transaction = await BeginEmployeeMutationAsync(employeeId);
        var employee = await dbContext.Employees.FindAsync(employeeId);
        if (employee is null ||
            employee.Status != EmployeeStatus.ACTIVE ||
            !string.Equals(employee.Email, email, StringComparison.OrdinalIgnoreCase) ||
            !MatchesTokenHash(employee.PasswordResetTokenHash, request.Token))
        {
            throw new UnauthorizedException("Invalid or expired password reset token");
        }

        PasswordPolicy.Validate(request.NewPassword);
        var now = DateTime.UtcNow;
        employee.Password = PasswordPolicy.Hash(request.NewPassword);
        employee.PasswordChangedAt = now;
        employee.FailedLoginAttempts = 0;
        employee.LockoutEndUtc = null;
        employee.PasswordResetTokenHash = null;
        var revokedDevices = await RevokeActiveDevicesAsync(employeeId, null, now);
        await AppendAuditAsync("RESET_PASSWORD", employeeId, employeeId, "Password reset by email verification.");
        await dbContext.SaveChangesAsync();
        await transaction.CommitAsync();
        await CleanupRevokedDevicesAsync(revokedDevices);
    }

    public async Task<EmployeeProfileResponse> GetProfileAsync(Guid employeeId) =>
        ToProfile(await GetEmployeeAsync(employeeId, asNoTracking: true));

    public async Task<EmployeeProfileResponse> UpdateProfileAsync(Guid employeeId, UpdateProfileRequest request)
    {
        var fullName = request.FullName.Trim();
        if (fullName.Length < 2)
            throw new BadRequestException("Họ và tên phải có ít nhất 2 ký tự.");

        await using var transaction = await BeginEmployeeMutationAsync(employeeId);
        var employee = await GetEmployeeAsync(employeeId);
        var before = new { employee.FullName, employee.Phone };
        employee.FullName = fullName;
        employee.Phone = request.Phone;
        await dbContext.SaveChangesAsync();
        await AppendAuditAsync("UPDATE_PROFILE", employeeId, employeeId, "Updated account profile.", before,
            new { employee.FullName, employee.Phone });
        await transaction.CommitAsync();
        return ToProfile(employee);
    }

    public async Task<EmployeeProfileResponse> UpdateProfileAvatarAsync(Guid employeeId, CloudinaryUploadResultRequest request)
    {
        await using var transaction = await BeginEmployeeMutationAsync(employeeId);
        var employee = await GetEmployeeAsync(employeeId);
        var before = new { employee.AvatarUrl };
        var publicId = await uploadIntentService.ConsumeAsync(employeeId, UploadOwnerType.EMPLOYEE_AVATAR, request);
        employee.AvatarUrl = cloudinaryService.BuildImageUrl(publicId, UploadOwnerType.EMPLOYEE_AVATAR);
        await AppendAuditAsync("UPDATE_PROFILE_AVATAR", employeeId, employeeId, "Updated account avatar.", before,
            new { employee.AvatarUrl });
        await transaction.CommitAsync();
        return ToProfile(employee);
    }

    public async Task ChangePasswordAsync(Guid employeeId, string accessJti, ChangePasswordRequest request)
    {
        await using var transaction = await BeginEmployeeMutationAsync(employeeId);
        await EnsureActiveAccessAsync(accessJti);
        var employee = await GetEmployeeAsync(employeeId);
        if (!PasswordPolicy.Verify(request.CurrentPassword, employee.Password))
            throw new BadRequestException("Current password is incorrect.");
        if (request.NewPassword == request.CurrentPassword)
            throw new BadRequestException("New password must be different from current password.");

        PasswordPolicy.Validate(request.NewPassword);
        var now = DateTime.UtcNow;
        employee.Password = PasswordPolicy.Hash(request.NewPassword);
        employee.PasswordChangedAt = now;
        employee.PasswordResetTokenHash = null;
        var revokedDevices = await RevokeActiveDevicesAsync(employeeId, accessJti, now);
        await AppendAuditAsync("CHANGE_PASSWORD", employeeId, employeeId, "Changed account password.");
        await dbContext.SaveChangesAsync();
        await transaction.CommitAsync();
        await CleanupRevokedDevicesAsync(revokedDevices);
    }

    public async Task<List<EmployeeSessionResponse>> GetSessionsAsync(Guid employeeId, string accessJti)
    {
        var now = DateTime.UtcNow;
        var historyStart = now.AddDays(-7);
        return await dbContext.EmployeeSessions.AsNoTracking()
            .Where(device => device.EmployeeId == employeeId &&
                (device.RevokedAt >= historyStart || (device.RevokedAt == null && device.ExpiresAt > now)))
            .OrderByDescending(device => device.AccessJti == accessJti)
            .ThenByDescending(device => device.RevokedAt == null)
            .ThenByDescending(device => device.RevokedAt ?? device.LastActiveAt)
            .ThenBy(device => device.Id)
            .Take(20)
            .Select(device => new EmployeeSessionResponse(device.Id, device.DeviceName, device.DeviceType,
                device.AccessJti == accessJti && device.RevokedAt == null, device.CreatedAt, device.LastActiveAt,
                device.ExpiresAt, device.RevokedAt == null ? "ACTIVE" : "REVOKED"))
            .ToListAsync();
    }

    public async Task RevokeSessionAsync(Guid employeeId, string accessJti, Guid sessionId)
    {
        await using var transaction = await BeginEmployeeMutationAsync(employeeId);
        await EnsureActiveAccessAsync(accessJti);
        var device = await dbContext.EmployeeSessions.SingleOrDefaultAsync(item => item.Id == sessionId && item.EmployeeId == employeeId)
            ?? throw new NotFoundException("Session was not found.");
        if (device.AccessJti == accessJti)
            throw new BadRequestException("Use logout to end the current session.");
        if (device.RevokedAt is null)
        {
            device.RevokedAt = DateTime.UtcNow;
            await AppendAuditAsync("REVOKE_SESSION", employeeId, employeeId, "Revoked account device session.",
                after: new { SessionId = device.Id });
            await dbContext.SaveChangesAsync();
        }
        await transaction.CommitAsync();
        await CleanupSessionKeysAsync(device.AccessJti, device.RefreshJti);
    }

    public async Task<RevokeOtherSessionsResponse> RevokeOtherSessionsAsync(Guid employeeId, string accessJti)
    {
        await using var transaction = await BeginEmployeeMutationAsync(employeeId);
        await EnsureActiveAccessAsync(accessJti);
        var revokedDevices = await RevokeActiveDevicesAsync(employeeId, accessJti, DateTime.UtcNow);
        await AppendAuditAsync("REVOKE_OTHER_SESSIONS", employeeId, employeeId, "Revoked other account device sessions.",
            after: new { RevokedCount = revokedDevices.Count });
        await dbContext.SaveChangesAsync();
        await transaction.CommitAsync();
        await CleanupRevokedDevicesAsync(revokedDevices);
        return new RevokeOtherSessionsResponse(revokedDevices.Count);
    }

    private async Task<BrowserAuthenticationSession> IssueBrowserSessionAsync(
        EmployeeModel employee, string userAgent, EmployeeSessionModel? device, IDbContextTransaction transaction)
    {
        Claim[] claims = [new("role", employee.Role.RoleName.ToString())];
        var accessToken = tokenService.GenerateToken(employee.Id, TokenType.ACCESS, claims);
        var refreshToken = tokenService.GenerateToken(employee.Id, TokenType.REFRESH, claims);
        var handler = new JwtSecurityTokenHandler();
        var accessJti = handler.ReadJwtToken(accessToken).Id;
        var refreshJwt = handler.ReadJwtToken(refreshToken);
        var now = DateTime.UtcNow;
        if (device is null)
        {
            device = new EmployeeSessionModel { EmployeeId = employee.Id, CreatedAt = now };
            dbContext.EmployeeSessions.Add(device);
        }
        if (!string.IsNullOrEmpty(userAgent) || string.IsNullOrEmpty(device.DeviceName))
            (device.DeviceName, device.DeviceType) = UserAgentParser.Parse(userAgent);
        device.AccessJti = accessJti;
        device.RefreshJti = refreshJwt.Id;
        device.LastActiveAt = now;
        device.ExpiresAt = refreshJwt.ValidTo;
        await dbContext.SaveChangesAsync();

        var sessionKeysStored = false;
        try
        {
            await tokenJtiStore.StoreLoginAsync(accessToken, refreshToken);
            var csrfToken = await csrfTokenService.IssueAsync(accessJti, TimeSpan.FromMinutes(securitySettings.RefreshTokenLifetimeMinutes));
            sessionKeysStored = true;
            await transaction.CommitAsync();
            return new BrowserAuthenticationSession(accessToken, refreshToken, csrfToken, ToSessionUser(employee));
        }
        catch (Exception exception)
        {
            await CleanupSessionKeysAsync(accessJti, refreshJwt.Id);
            if (!sessionKeysStored && RedisService.IsUnavailable(exception, CancellationToken.None))
                throw new ServiceUnavailableException("Token state is temporarily unavailable.", exception);
            throw;
        }
    }

    private async Task<IDbContextTransaction> BeginEmployeeMutationAsync(Guid employeeId)
    {
        var transaction = await dbContext.Database.BeginTransactionAsync();
        try
        {
            if (dbContext.Database.IsNpgsql())
                await dbContext.Database.ExecuteSqlInterpolatedAsync($"SELECT \"Id\" FROM employee WHERE \"Id\" = {employeeId} FOR UPDATE");
            return transaction;
        }
        catch
        {
            await transaction.DisposeAsync();
            throw;
        }
    }

    private async Task EnsureActiveAccessAsync(string accessJti)
    {
        if (!await tokenJtiStore.IsActiveAsync(accessJti, TokenType.ACCESS))
            throw new UnauthorizedException("Invalid or expired access token");
    }

    private async Task<List<EmployeeSessionModel>> RevokeActiveDevicesAsync(Guid employeeId, string? preservedAccessJti, DateTime now)
    {
        var devices = await dbContext.EmployeeSessions.Where(item => item.EmployeeId == employeeId &&
            item.RevokedAt == null && item.ExpiresAt > now && item.AccessJti != preservedAccessJti).ToListAsync();
        foreach (var device in devices)
            device.RevokedAt = now;
        return devices;
    }

    private async Task CleanupRevokedDevicesAsync(IEnumerable<EmployeeSessionModel> devices)
    {
        foreach (var device in devices)
            await CleanupSessionKeysAsync(device.AccessJti, device.RefreshJti);
    }

    private async Task CleanupSessionKeysAsync(string accessJti, string refreshJti)
    {
        await TryDeleteSessionKeyAsync("access", () => tokenJtiStore.RevokeAccessAsync(accessJti));
        await TryDeleteSessionKeyAsync("refresh", () => tokenJtiStore.RevokeRefreshAsync(refreshJti));
        await TryDeleteSessionKeyAsync("CSRF", () => csrfTokenService.RevokeAsync(accessJti));
    }

    private async Task CleanupLegacySessionAsync(string accessJti)
    {
        await TryDeleteSessionKeyAsync("legacy access and refresh", () => tokenJtiStore.RevokeLoginByAccessAsync(accessJti));
        await TryDeleteSessionKeyAsync("CSRF", () => csrfTokenService.RevokeAsync(accessJti));
    }

    private async Task TryDeleteSessionKeyAsync(string keyType, Func<Task> delete)
    {
        try
        {
            await delete();
        }
        catch (Exception exception)
        {
            logger?.LogWarning("Failed to delete {KeyType} session key ({ErrorType}).", keyType, exception.GetType().Name);
        }
    }

    private async Task<EmployeeModel> GetEmployeeAsync(Guid employeeId, bool asNoTracking = false)
    {
        IQueryable<EmployeeModel> employees = dbContext.Employees.Include(item => item.Role);
        if (asNoTracking)
            employees = employees.AsNoTracking();
        return await employees.SingleOrDefaultAsync(item => item.Id == employeeId)
            ?? throw new UnauthorizedException("Account is unavailable.");
    }

    private Task AppendAuditAsync(string action, Guid employeeId, Guid actorId, string reason, object? before = null, object? after = null) =>
        auditLogService.CreateAuditLogEntryAsync(new CreateAuditLogEntry(action, "Employee", employeeId, before,
            after, reason, new AuditLogContext(actorId, null)));

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static EmployeeProfileResponse ToProfile(EmployeeModel employee) => new(employee.Id,
        employee.Email, employee.FullName, employee.Phone, employee.Role.RoleName.ToString(), employee.Status.ToString(),
        employee.AvatarUrl, employee.CreatedAt, employee.PasswordChangedAt);

    private static BrowserSessionUser ToSessionUser(EmployeeModel employee) => new(employee.Id,
        employee.Email, employee.FullName, employee.Role.RoleName.ToString(), employee.AvatarUrl);

    private string GenerateEmailToken(Guid employeeId, string email, TokenType type)
    {
        return tokenService.GenerateToken(employeeId, type, [new Claim("email", email)]);
    }

    private ClaimsPrincipal ValidateRefreshToken(string refreshToken)
    {
        try
        {
            var refreshPrincipal = tokenService.ValidateRefreshToken(refreshToken);
            var refreshJti = refreshPrincipal.FindFirstValue(JwtRegisteredClaimNames.Jti);
            if (string.IsNullOrWhiteSpace(refreshJti))
                throw new UnauthorizedException("Invalid or expired refresh token");

            return refreshPrincipal;
        }
        catch (Exception exception) when (exception is SecurityTokenException or ArgumentException)
        {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }
    }

    private static string HashToken(string token)
    {
        return Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    }

    private static bool MatchesTokenHash(string? storedHash, string token)
    {
        if (string.IsNullOrWhiteSpace(storedHash))
            return false;

        try
        {
            var expectedHash = Convert.FromBase64String(storedHash);
            var actualHash = SHA256.HashData(Encoding.UTF8.GetBytes(token));
            return CryptographicOperations.FixedTimeEquals(expectedHash, actualHash);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
