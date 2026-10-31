using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using backend.src.Bases.Enums;
using backend.src.Configurations;
using backend.src.Data;
using backend.src.Dto.AuthDto;
using backend.src.Exceptions;
using backend.src.Infrastructure;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using BCryptHasher = BCrypt.Net.BCrypt;
using backend.src.Models;

namespace backend.src.Services;

public class AuthService(
    AppDbContext dbContext,
    TokenService tokenService,
    SettingService settingService,
    EmailService emailService,
    TokenJtiStore tokenJtiStore,
    CsrfTokenService csrfTokenService,
    IConfiguration configuration)
{
    private readonly AuthSecuritySettings securitySettings = AuthSecuritySettings.FromConfiguration(configuration);

    public async Task<BrowserAuthenticationSession> Login(LoginRequest request)
    {
        var email = request.Email.Trim();
        var normalizedEmail = email.ToLowerInvariant();
        var employee = await dbContext.Employees
            .Include(employee => employee.Role)
            .FirstOrDefaultAsync(user => user.Email.ToLower() == normalizedEmail);
        if (employee is null)
            throw new UnauthorizedException("Invalid email or password");

        var now = DateTime.UtcNow;
        if (employee.LockoutEndUtc is { } lockoutEndUtc)
        {
            if (lockoutEndUtc > now)
                throw new ForbiddenException("Account is temporarily locked. Try again later.");

            employee.LockoutEndUtc = null;
            employee.FailedLoginAttempts = 0;
        }

        var passwordIsValid = BCryptHasher.Verify(request.Password, employee.Password);
        if (!passwordIsValid)
        {
            employee.FailedLoginAttempts++;
            if (employee.FailedLoginAttempts >= securitySettings.MaxFailedLoginAttempts)
            {
                employee.LockoutEndUtc = now.AddMinutes(securitySettings.LockoutDurationMinutes);
            }

            await dbContext.SaveChangesAsync();
            if (employee.LockoutEndUtc is not null)
                throw new ForbiddenException("Account is temporarily locked. Try again later.");

            throw new UnauthorizedException("Invalid email or password");
        }
        if (employee.Status != EmployeeStatus.ACTIVE)
            throw new ForbiddenException("Account is not verified or is unavailable");

        if (employee.FailedLoginAttempts != 0 || employee.LockoutEndUtc is not null)
        {
            employee.FailedLoginAttempts = 0;
            employee.LockoutEndUtc = null;
            await dbContext.SaveChangesAsync();
        }

        var claims = new List<Claim>
        {
            new ("role" , employee.Role.RoleName.ToString())
        };
        var accessToken = tokenService.GenerateToken(employee.Id, TokenType.ACCESS, claims);
        var refreshToken = tokenService.GenerateToken(employee.Id, TokenType.REFRESH, claims);
        var accessJti = await tokenJtiStore.StoreLoginAsync(accessToken, refreshToken);
        var csrfToken = await csrfTokenService.IssueAsync(
            accessJti,
            TimeSpan.FromMinutes(securitySettings.RefreshTokenLifetimeMinutes));
        return new BrowserAuthenticationSession(accessToken, refreshToken, csrfToken);
    }
    public async Task<RegisterResponse> Register(RegisterRequest request)
    {
        var email = request.Email.Trim();
        var atIndex = email.LastIndexOf('@');
        if (atIndex <= 0 || atIndex == email.Length - 1)
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
        var employee = await dbContext.Employees.FirstOrDefaultAsync(em => em.Email == email);
        if (employee != null)
        {
            if (employee.Status == EmployeeStatus.PENDING_OTP)
            {
                var verificationToken = await CreateRegistrationVerificationTokenAsync(employee);
                await emailService.SendAccountVerificationEmailAsync(employee.Email, employee.FullName, verificationToken);
                return new RegisterResponse(employee.Email, employee.FullName);
            }

            throw new ConflictException("User has been registered");
        }
        var employeeRole = await dbContext.Roles.FirstOrDefaultAsync(r => r.RoleName == RoleName.CASHIER);
        var newEmployee = new EmployeeModel
        {
            Email = request.Email,
            Password = BCryptHasher.HashPassword(request.Password, workFactor: 12),
            FullName = request.FullName,
            Phone = request.Phone,
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

    public async Task ResendVerificationAsync(string email)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
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

    public async Task<BrowserAuthenticationSession> Refresh(string refreshToken, string? csrfToken)
    {
        var refreshPrincipal = ValidateRefreshToken(refreshToken);
        var refreshJti = refreshPrincipal.FindFirstValue(JwtRegisteredClaimNames.Jti)!;
        var accessJti = await tokenJtiStore.GetAccessJtiForRefreshAsync(refreshJti);
        if (string.IsNullOrWhiteSpace(accessJti))
            throw new UnauthorizedException("Invalid or expired refresh token");

        if (!await csrfTokenService.IsValidAsync(accessJti, csrfToken))
            throw new ForbiddenException("Invalid CSRF token");

        var subject = refreshPrincipal.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (!Guid.TryParse(subject, out var employeeId))
            throw new UnauthorizedException("Invalid or expired refresh token");

        var employee = await dbContext.Employees
            .Include(item => item.Role)
            .SingleOrDefaultAsync(item => item.Id == employeeId);
        if (employee is null ||
            employee.Status != EmployeeStatus.ACTIVE ||
            employee.LockoutEndUtc > DateTime.UtcNow)
        {
            throw new UnauthorizedException("Account is unavailable.");
        }

        if (!await tokenJtiStore.ConsumeRefreshAsync(refreshJti))
            throw new UnauthorizedException("Invalid or expired refresh token");

        await tokenJtiStore.RevokeAccessAsync(accessJti);
        await csrfTokenService.RevokeAsync(accessJti);

        var claims = new List<Claim>
        {
            new("role", employee.Role.RoleName.ToString())
        };
        var accessToken = tokenService.GenerateToken(employee.Id, TokenType.ACCESS, claims);
        var nextRefreshToken = tokenService.GenerateToken(employee.Id, TokenType.REFRESH, claims);
        var nextAccessJti = await tokenJtiStore.StoreLoginAsync(accessToken, nextRefreshToken);
        var nextCsrfToken = await csrfTokenService.IssueAsync(
            nextAccessJti,
            TimeSpan.FromMinutes(securitySettings.RefreshTokenLifetimeMinutes));
        return new BrowserAuthenticationSession(accessToken, nextRefreshToken, nextCsrfToken);
    }

    public async Task LogoutByRefreshTokenAsync(string refreshToken, string authenticatedAccessJti)
    {
        var refreshPrincipal = ValidateRefreshToken(refreshToken);
        var refreshJti = refreshPrincipal.FindFirstValue(JwtRegisteredClaimNames.Jti)!;

        var accessJti = await tokenJtiStore.GetAccessJtiForRefreshAsync(refreshJti);
        if (!string.Equals(accessJti, authenticatedAccessJti, StringComparison.Ordinal))
            throw new UnauthorizedException("Invalid or expired refresh token");

        await tokenJtiStore.RevokeLoginAsync(authenticatedAccessJti, refreshJti);
        await csrfTokenService.RevokeAsync(authenticatedAccessJti);
    }

    public async Task LogoutByAccessTokenAsync(string accessJti)
    {
        await tokenJtiStore.RevokeLoginByAccessAsync(accessJti);
        await csrfTokenService.RevokeAsync(accessJti);
    }

    public async Task<BrowserSessionResponse> GetBrowserSessionAsync(string accessJti)
    {
        var csrfToken = await csrfTokenService.IssueAsync(
            accessJti,
            TimeSpan.FromMinutes(securitySettings.RefreshTokenLifetimeMinutes));
        return new BrowserSessionResponse(csrfToken);
    }

    public async Task RequestPasswordReset(ForgotPasswordRequest request)
    {
        var email = request.Email.Trim();
        var employee = await dbContext.Employees.FirstOrDefaultAsync(employee => employee.Email == email);
        if (employee is null || employee.Status != EmployeeStatus.ACTIVE)
            return;

        var resetToken = GenerateEmailToken(employee.Id, employee.Email, TokenType.RESET_PASSWORD);
        employee.PasswordResetTokenHash = HashToken(resetToken);
        await dbContext.SaveChangesAsync();

        await emailService.SendPasswordResetEmailAsync(employee.Email, employee.FullName, resetToken);
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

        var employee = await dbContext.Employees.FindAsync(employeeId);
        if (employee is null ||
            employee.Status != EmployeeStatus.ACTIVE ||
            !string.Equals(employee.Email, email, StringComparison.OrdinalIgnoreCase) ||
            !MatchesTokenHash(employee.PasswordResetTokenHash, request.Token))
        {
            throw new UnauthorizedException("Invalid or expired password reset token");
        }

        employee.Password = BCryptHasher.HashPassword(request.NewPassword, workFactor: 12);
        employee.PasswordResetTokenHash = null;
        await dbContext.SaveChangesAsync();
    }

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
