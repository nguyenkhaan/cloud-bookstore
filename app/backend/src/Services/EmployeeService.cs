using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.EmployeeDto;
using backend.src.Exceptions;
using backend.src.Infrastructure;
using backend.src.Models;
using backend.src.Models.Enums;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using BCryptHasher = BCrypt.Net.BCrypt;

namespace backend.src.Services;

public class EmployeeService(AppDbContext dbContext, AuditLogService auditLogService, EmailService emailService, TokenService tokenService)
{
    public async Task<EmployeeListResultDto> ListAsync(EmployeeListQuery query, CancellationToken cancellationToken = default)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var employees = dbContext.Employees.AsNoTracking().Include(employee => employee.Role).AsQueryable();
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            employees = employees.Where(employee => employee.FullName.ToLower().Contains(search)
                || employee.Email.ToLower().Contains(search) || employee.Phone.Contains(search)
                || (employee.EmployeeCode != null && employee.EmployeeCode.ToLower().Contains(search)));
        }
        if (query.RoleName.HasValue)
            employees = employees.Where(employee => employee.Role.RoleName == query.RoleName.Value);
        if (query.Status.HasValue)
            employees = employees.Where(employee => employee.Status == query.Status.Value);

        var totalCount = await employees.CountAsync(cancellationToken);
        var totalPages = Math.Max(1, (int)Math.Ceiling(totalCount / (double)pageSize));
        page = Math.Min(page, totalPages);
        var items = employees.OrderBy(employee => employee.FullName).ThenBy(employee => employee.Id)
            .Skip((page - 1) * pageSize).Take(pageSize).Select(ToDto).ToList();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var activeCount = await dbContext.Employees.CountAsync(employee => employee.Status == EmployeeStatus.ACTIVE, cancellationToken);
        var newAccountsCount = await dbContext.Employees.CountAsync(employee => employee.Status == EmployeeStatus.INVITED || employee.Status == EmployeeStatus.PENDING_OTP, cancellationToken);
        var inShiftCount = await dbContext.EmployeeWorkRecords.Where(record => record.WorkDate == today && record.CheckInAt != null && record.CheckOutAt == null)
            .Select(record => record.EmployeeId).Distinct()
            .Join(dbContext.Employees.Where(employee => employee.Status == EmployeeStatus.ACTIVE), id => id, employee => employee.Id, (id, employee) => id)
            .CountAsync(cancellationToken);
        var protectedCount = await dbContext.Employees.CountAsync(employee => employee.IsProtected, cancellationToken);
        return new EmployeeListResultDto(items, totalCount, page, pageSize, totalPages,
            new EmployeeListKpiDto(activeCount, newAccountsCount, inShiftCount, protectedCount));
    }

    public async Task<EmployeeDto> GetAsync(Guid employeeId, CancellationToken cancellationToken = default)
    {
        var employee = await dbContext.Employees.AsNoTracking().Include(item => item.Role)
            .SingleOrDefaultAsync(item => item.Id == employeeId, cancellationToken)
            ?? throw new NotFoundException("Employee was not found.");
        return ToDto(employee);
    }

    public async Task<EmployeeShiftListDto> GetShiftsAsync(Guid employeeId, int requestedPage, int requestedPageSize, CancellationToken cancellationToken = default)
    {
        if (!await dbContext.Employees.AnyAsync(item => item.Id == employeeId, cancellationToken))
            throw new NotFoundException("Employee was not found.");
        var page = Math.Max(1, requestedPage);
        var pageSize = Math.Clamp(requestedPageSize, 1, 100);
        var query = dbContext.EmployeeWorkRecords.AsNoTracking().Where(record => record.EmployeeId == employeeId);
        var totalCount = await query.CountAsync(cancellationToken);
        var totalPages = Math.Max(1, (int)Math.Ceiling(totalCount / (double)pageSize));
        page = Math.Min(page, totalPages);
        var items = await query.OrderByDescending(record => record.WorkDate).ThenByDescending(record => record.ShiftNo)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(record => new EmployeeShiftDto(record.Id, record.WorkDate, record.ShiftNo, record.CheckInAt, record.CheckOutAt,
                record.AttendanceStatus.ToString(), record.WorkedMinutes, record.OvertimeMinutes)).ToListAsync(cancellationToken);
        return new EmployeeShiftListDto(items, totalCount, page, pageSize, totalPages);
    }

    public async Task<EmployeeDto> CreateAsync(Guid actorId, CreateEmployeeRequest request, AuditLogContext context, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim();
        if (await dbContext.Employees.AnyAsync(item => item.Email.ToLower() == email.ToLower(), cancellationToken))
            throw new ConflictException("An employee with this email already exists.");
        if (!Enum.IsDefined(request.RoleName))
            throw new BadRequestException("Role is invalid.");
        var role = await dbContext.Roles.SingleOrDefaultAsync(item => item.RoleName == request.RoleName && item.IsActive, cancellationToken)
            ?? throw new BadRequestException("Role is unavailable.");
        var lastCode = await dbContext.Employees.AsNoTracking().Where(item => item.EmployeeCode != null)
            .Select(item => item.EmployeeCode!).OrderByDescending(code => code).FirstOrDefaultAsync(cancellationToken);
        var sequence = 1;
        if (lastCode is not null && lastCode.Length > 3 && int.TryParse(lastCode.AsSpan(3), out var parsed)) sequence = parsed + 1;
        var employeeId = Guid.NewGuid();
        var token = tokenService.GenerateToken(employeeId, backend.src.Bases.Enums.TokenType.RESET_PASSWORD,
            [new System.Security.Claims.Claim("email", email)]);
        var employee = new EmployeeModel
        {
            Id = employeeId, Email = email, FullName = request.FullName.Trim(), Phone = request.Phone.Trim(),
            Password = BCryptHasher.HashPassword(Convert.ToHexString(RandomNumberGenerator.GetBytes(32)), workFactor: 12),
            PasswordResetTokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))),
            RoleId = role.Id, Role = role, Status = EmployeeStatus.INVITED, EmployeeCode = $"NV-{sequence:0000}",
            JobTitle = string.IsNullOrWhiteSpace(request.JobTitle) ? null : request.JobTitle.Trim(),
            BranchName = "Nhà sách Mây · Cơ sở 01", CreatedAt = DateTime.UtcNow
        };
        dbContext.Employees.Add(employee);
        AddAudit("CREATE_EMPLOYEE", employee, null,
            new { employee.EmployeeCode, employee.Email, employee.FullName, Role = role.RoleName, employee.Status }, "Create employee account.", context);
        await dbContext.SaveChangesAsync(cancellationToken);
        await emailService.SendAccountSetupEmailAsync(employee.Email, employee.FullName, token, cancellationToken);
        return ToDto(employee);
    }

    public async Task<EmployeeDto> UpdateAsync(Guid actorId, Guid employeeId, UpdateEmployeeRequest request, AuditLogContext context, CancellationToken cancellationToken = default)
    {
        var employee = await dbContext.Employees.Include(item => item.Role).SingleOrDefaultAsync(item => item.Id == employeeId, cancellationToken)
            ?? throw new NotFoundException("Employee was not found.");
        if (employee.IsProtected && request.Status != employee.Status)
            throw new ForbiddenException("Protected RootAdmin status cannot be changed.");
        if (actorId == employeeId && request.Status is EmployeeStatus.LOCKED or EmployeeStatus.REVOKED)
            throw new ForbiddenException("Administrators cannot lock or revoke their own account.");
        var email = request.Email.Trim();
        if (await dbContext.Employees.AnyAsync(item => item.Id != employeeId && item.Email.ToLower() == email.ToLower(), cancellationToken))
            throw new ConflictException("An employee with this email already exists.");
        var before = new { employee.Email, employee.FullName, employee.Phone, employee.JobTitle, employee.Status };
        employee.Email = email;
        employee.FullName = request.FullName.Trim();
        employee.Phone = request.Phone.Trim();
        employee.JobTitle = string.IsNullOrWhiteSpace(request.JobTitle) ? null : request.JobTitle.Trim();
        employee.Status = request.Status;
        AddAudit("UPDATE_EMPLOYEE", employee, before,
            new { employee.Email, employee.FullName, employee.Phone, employee.JobTitle, employee.Status },
            string.IsNullOrWhiteSpace(request.Reason) ? "Update employee profile." : request.Reason.Trim(), context);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(employee);
    }

    public async Task ResendSetupEmailAsync(Guid employeeId, CancellationToken cancellationToken = default)
    {
        var employee = await dbContext.Employees.SingleOrDefaultAsync(item => item.Id == employeeId, cancellationToken)
            ?? throw new NotFoundException("Employee was not found.");
        if (employee.Status != EmployeeStatus.INVITED)
            throw new ConflictException("Setup email can only be resent for invited accounts.");
        var token = tokenService.GenerateToken(employee.Id, backend.src.Bases.Enums.TokenType.RESET_PASSWORD,
            [new System.Security.Claims.Claim("email", employee.Email)]);
        employee.PasswordResetTokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
        await dbContext.SaveChangesAsync(cancellationToken);
        await emailService.SendAccountSetupEmailAsync(employee.Email, employee.FullName, token, cancellationToken);
    }

    private void AddAudit(string action, EmployeeModel employee, object? before, object after, string reason, AuditLogContext context)
    {
        dbContext.AuditLogs.Add(new AuditLogModel
        {
            ActorId = context.ActorId, IpAddress = context.IpAddress, UserAgent = context.UserAgent, CorrelationId = context.CorrelationId,
            Action = action, EntityType = "employee", EntityId = employee.Id,
            BeforeData = before is null ? null : System.Text.Json.JsonSerializer.Serialize(before),
            AfterData = System.Text.Json.JsonSerializer.Serialize(after), Reason = reason, OccurredAt = DateTime.UtcNow
        });
    }

    private static EmployeeDto ToDto(EmployeeModel employee) => new(employee.Id, employee.EmployeeCode ?? string.Empty,
        employee.Email, employee.FullName, employee.Phone, employee.Role.RoleName, employee.Status, employee.JobTitle,
        employee.BranchName, employee.IsProtected, employee.AvatarUrl, employee.CreatedAt);

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

        if (employee.IsProtected && employee.Role.RoleName != request.RoleName)
            throw new ForbiddenException("Protected RootAdmin role cannot be changed.");
        if (actorId == employeeId && request.RoleName != RoleName.ADMIN)
            throw new ForbiddenException("Administrators cannot demote themselves.");

        var previousRole = employee.Role.RoleName;
        if (previousRole == request.RoleName)
            return new EmployeeRoleResponse(employee.Id, previousRole, request.RoleName, DateTime.UtcNow);

        var createAuditLogEntry = new CreateAuditLogEntry(
            "CHANGE_ROLE",
            "employee",
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
