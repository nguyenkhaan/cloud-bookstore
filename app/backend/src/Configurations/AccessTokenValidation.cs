using System.IdentityModel.Tokens.Jwt;
using backend.src.Bases.Enums;
using backend.src.Data;
using backend.src.Infrastructure;
using backend.src.Models.Enums;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Configurations;

internal static class AccessTokenValidation
{
    public static async Task ValidateAsync(TokenValidatedContext context)
    {
        var jti = context.Principal?.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
        if (string.IsNullOrWhiteSpace(jti))
        {
            context.Fail("Token JTI is missing.");
            return;
        }

        var services = context.HttpContext.RequestServices;
        var cancellationToken = context.HttpContext.RequestAborted;
        try
        {
            var tokenStore = services.GetRequiredService<TokenJtiStore>();
            if (!await tokenStore.IsActiveAsync(jti, TokenType.ACCESS, cancellationToken))
            {
                context.Fail("Token has been revoked.");
                return;
            }

            var subject = context.Principal?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            if (!Guid.TryParse(subject, out var employeeId))
            {
                context.Fail("Token subject is invalid.");
                return;
            }

            var dbContext = services.GetRequiredService<AppDbContext>();
            var now = DateTime.UtcNow;
            if (!await dbContext.EmployeeSessions.AnyAsync(item => item.AccessJti == jti && item.EmployeeId == employeeId &&
                item.RevokedAt == null && item.ExpiresAt > now, cancellationToken))
            {
                context.Fail("Session has been revoked or is invalid.");
                return;
            }

            var employee = await dbContext.Employees.AsNoTracking().Include(item => item.Role)
                .SingleOrDefaultAsync(item => item.Id == employeeId, cancellationToken);
            if (employee is null || employee.Status != EmployeeStatus.ACTIVE || employee.LockoutEndUtc > now)
            {
                context.Fail("Account is unavailable.");
                return;
            }

            if (!Enum.TryParse<RoleName>(context.Principal?.FindFirst("role")?.Value, ignoreCase: true, out var jwtRole))
            {
                context.Fail("Token role is invalid.");
                return;
            }

            if (employee.Role.RoleName != jwtRole)
                context.Fail("Account role has been changed");
        }
        catch (Exception)
        {
            context.Fail("Token state is unavailable.");
        }
    }
}
