using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.EmployeeDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace backend.src.Services;

public class EmployeeService(AppDbContext dbContext , AuditLogService auditLogService)
{
    public async Task<EmployeeRoleResponse> ChangeRoleAsync(
        Guid actorId,
        Guid employeeId,
        ChangeEmployeeRequest request,
        AuditLogContext context,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new BadRequestException("Reason is required");

        var actor = await dbContext.Employees
            .Include(employee => employee.Role)
            .FirstOrDefaultAsync(employee => employee.Id == actorId, cancellationToken);
        if (actor is null)
            throw new NotFoundException("Actor for this action is invalid");
        if (actor.Role.RoleName != RoleName.ADMIN)
            throw new ForbiddenException("Only Admin can change employee roles");

        var employee = await dbContext.Employees
            .Include(item => item.Role)
            .FirstOrDefaultAsync(item => item.Id == employeeId, cancellationToken);
        if (employee is null)
            throw new NotFoundException("Employee for this action is invalid");

        var role = await dbContext.Roles.FirstOrDefaultAsync(
            item => item.RoleName == request.RoleName && item.IsActive,
            cancellationToken);
        if (role is null)
            throw new NotFoundException("Role does not exist");

        var previousRole = employee.Role.RoleName;
        if (previousRole == request.RoleName)
            return new EmployeeRoleResponse(employee.Id, previousRole, request.RoleName, DateTime.UtcNow);

        var createAuditLogEntry = new CreateAuditLogEntry(
            "CHANGE_ROLE",
            "EmployeeModel",
            employee.Id,
            previousRole.ToString(),
            request.RoleName.ToString(),
            request.Reason,
            context);

        employee.RoleId = role.Id;
        AuditLogModel auditLog;
        try
        {
            auditLog = await auditLogService.CreateAuditLogEntryAsync(createAuditLogEntry, cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("Employee role was changed by another request. Please retry.");
        }

        return new EmployeeRoleResponse(employee.Id, previousRole, request.RoleName, auditLog.OccurredAt);
    }
}
