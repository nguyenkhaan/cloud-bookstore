using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.EmployeeDto;
using backend.src.Exceptions;
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
        //Thuc hien tao moi cac gia tri ben trong AuditLog table 
        var actor = await dbContext.Employees.FirstOrDefaultAsync(e => e.Id == actorId , cancellationToken);
        if (actor is null) 
            throw new NotFoundException("Actor for this action is invalid");
        var employee = await dbContext.Employees
            .Include(e => e.Role)
            .FirstOrDefaultAsync(e => e.Id == employeeId, cancellationToken);
        if (employee is null)
            throw new NotFoundException("Employee for this action is invalid");
        var role = await dbContext.Roles.FirstOrDefaultAsync(r => r.RoleName == request.RoleName, cancellationToken);
        if (role is null)
            throw new NotFoundException("Role does not exist");
        //Update the role
        var previousRole = employee.Role.RoleName.ToString();

        var createAuditLogEntry = new CreateAuditLogEntry(
                "CHANGE_ROLE",
                "EmployeeModel",
                employee.Id,
                employee.Role.RoleName.ToString(),
                request.RoleName.ToString(),
                "Admin Promote Role",
                context
            );
        auditLogService.CreateAuditLogEntryAsync(entry, cancellationToken);

    }
}
