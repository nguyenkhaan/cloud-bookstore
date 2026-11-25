using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Configurations;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.EmployeeDto;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/employees")]
[Microsoft.AspNetCore.Authorization.Authorize(Roles = nameof(RoleName.ADMIN))]
public sealed class EmployeesController(EmployeeService employeeService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<EmployeeListResultDto>> List([FromQuery] EmployeeListQuery query, CancellationToken cancellationToken)
        => Ok(await employeeService.ListAsync(query, cancellationToken));

    [HttpPost]
    public async Task<ActionResult<EmployeeDto>> Create([FromBody] CreateEmployeeRequest request, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var actorId)) return Unauthorized();
        var employee = await employeeService.CreateAsync(actorId, request, BuildContext(actorId), cancellationToken);
        return CreatedAtAction(nameof(Get), new { employeeId = employee.Id }, employee);
    }

    [HttpGet("{employeeId:guid}")]
    public async Task<ActionResult<EmployeeDto>> Get(Guid employeeId, CancellationToken cancellationToken)
        => Ok(await employeeService.GetAsync(employeeId, cancellationToken));

    [HttpPut("{employeeId:guid}")]
    public async Task<ActionResult<EmployeeDto>> Update(Guid employeeId, [FromBody] UpdateEmployeeRequest request, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var actorId)) return Unauthorized();
        return Ok(await employeeService.UpdateAsync(actorId, employeeId, request, BuildContext(actorId), cancellationToken));
    }

    [HttpGet("{employeeId:guid}/shifts")]
    public async Task<ActionResult<EmployeeShiftListDto>> Shifts(Guid employeeId, [FromQuery] int page = 1, [FromQuery] int pageSize = 5, CancellationToken cancellationToken = default)
        => Ok(await employeeService.GetShiftsAsync(employeeId, page, pageSize, cancellationToken));

    [HttpPost("{employeeId:guid}/resend-setup-email")]
    public async Task<IActionResult> ResendSetupEmail(Guid employeeId, CancellationToken cancellationToken)
    {
        await employeeService.ResendSetupEmailAsync(employeeId, cancellationToken);
        return Ok();
    }

    [HttpPatch("{employeeId:guid}/role")]
    public async Task<ActionResult<EmployeeRoleResponse>> ChangeRole(Guid employeeId, [FromBody] ChangeEmployeeRequest request, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var actorId)) return Unauthorized();
        return Ok(await employeeService.ChangeRoleAsync(actorId, employeeId, request, BuildContext(actorId), cancellationToken));
    }

    private AuditLogContext BuildContext(Guid actorId) => new(actorId, HttpContext.Connection.RemoteIpAddress,
        Request.Headers.UserAgent.ToString(), HttpContext.TraceIdentifier);
}
