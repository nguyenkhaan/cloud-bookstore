using backend.src.Configurations;
using backend.src.Dto.ApprovalDto;
using backend.src.Models.Enums;
using backend.src.Services.ApprovalServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/approvals/overview")]
public class ApprovalsOverviewController(ApprovalsOverviewService service) : ControllerBase
{
    private const string StaffRoles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)},{nameof(RoleName.CASHIER)}";

    [HttpGet("stats")]
    [Permission(StaffRoles)]
    [ProducesResponseType<ApprovalsOverviewStatsResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ApprovalsOverviewStatsResponse>> GetStats(CancellationToken cancellationToken)
    {
        var stats = await service.GetOverviewStatsAsync(cancellationToken);
        return Ok(stats);
    }
}
