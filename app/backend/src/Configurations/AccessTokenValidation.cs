using System.IdentityModel.Tokens.Jwt;
using backend.src.Bases.Enums;
using backend.src.Data;
using backend.src.Infrastructure;
using backend.src.Models.Enums;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Configurations;

internal sealed class AccessTokenValidation(TimeProvider clock, ILogger<AccessTokenValidation> logger)
{
    private static readonly TimeSpan ActivityThrottle = TimeSpan.FromMinutes(1);

    public async Task ValidateAsync(TokenValidatedContext context)
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
            var now = clock.GetUtcNow().UtcDateTime;
            var session = await dbContext.EmployeeSessions.AsNoTracking()
                .Where(item => item.AccessJti == jti && item.EmployeeId == employeeId &&
                    item.RevokedAt == null && item.ExpiresAt > now)
                .Select(item => new { item.Id, item.LastActiveAt })
                .SingleOrDefaultAsync(cancellationToken);
            if (session is null)
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
            {
                context.Fail("Account role has been changed");
                return;
            }

            var activityAt = clock.GetUtcNow().UtcDateTime;
            if (session.LastActiveAt <= activityAt - ActivityThrottle)
                await TryRecordActivityAsync(dbContext, session.Id, jti, activityAt, cancellationToken);
        }
        catch (Exception)
        {
            context.Fail("Token state is unavailable.");
        }
    }

    private async Task TryRecordActivityAsync(AppDbContext dbContext, Guid sessionId, string jti, DateTime now,
        CancellationToken cancellationToken)
    {
        try
        {
            var threshold = now - ActivityThrottle;
            var eligible = dbContext.EmployeeSessions.Where(item => item.Id == sessionId && item.AccessJti == jti &&
                item.RevokedAt == null && item.ExpiresAt > now && item.LastActiveAt <= threshold);

            if (dbContext.Database.IsRelational())
            {
                await eligible.ExecuteUpdateAsync(setters => setters.SetProperty(item => item.LastActiveAt, now), cancellationToken);
                return;
            }

            var session = await eligible.SingleOrDefaultAsync(cancellationToken);
            if (session is null)
                return;

            var activity = dbContext.Entry(session).Property(item => item.LastActiveAt);
            try
            {
                activity.CurrentValue = now;
                await dbContext.SaveChangesAsync(cancellationToken);
            }
            finally
            {
                activity.IsModified = false;
            }
        }
        catch (Exception exception)
        {
            logger.LogWarning("Could not record device session activity ({FailureType}).", exception.GetType().Name);
        }
    }
}
