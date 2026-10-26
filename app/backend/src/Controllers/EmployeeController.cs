using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.EmployeeDto;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;
[ApiController]
[Route("api/employee")]
public class EmployeeController(EmployeeService employeeService) : ControllerBase
{
    [HttpPatch("{employeeId:guid}/role")]
    [Authorize(Roles = nameof(RoleName.ADMIN))]
    public async Task<IActionResult> ChangeRole(Guid employeeId , [FromBody] ChangeEmployeeRequest request, CancellationToken cancellationToken)
    {
        //Thuc hien lay thogn tin tu oken do sau 
        var ipAddress = HttpContext.Connection.RemoteIpAddress;
        var actorClaim = User.FindFirstValue(
            JwtRegisteredClaimNames.Sub);
        if (!Guid.TryParse(actorClaim, out var actorId))
        {
            return Unauthorized();
        }
        var context = new AuditLogContext(actorId, ipAddress);
        var response = await employeeService.ChangeRoleAsync(actorId, employeeId, request, context , cancellationToken);
        return Ok(response);
    }
}
