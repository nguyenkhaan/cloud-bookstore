using backend.src.Dto.AuditLogDto;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/audit")]
public class AuditLogController(AuditLogService auditLogService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = nameof(RoleName.ADMIN))]
    public async Task<IActionResult> Search([FromQuery] AuditLogQuery query)
    {
        var response = await auditLogService.SearchAsync(query);
        return Ok(response);
    }
}
