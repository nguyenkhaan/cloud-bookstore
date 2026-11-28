using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Configurations;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.HrRequestDto;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/hr/requests")]
[Permission("ADMIN,CASHIER,INVENTORY_MANAGER")]
public sealed class HrRequestsController(HrRequestService requestService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<HrRequestListDto>> List([FromQuery] HrRequestQuery query, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var actorId)) return Unauthorized();
        var pending = string.Equals(query.Scope, "pending", StringComparison.OrdinalIgnoreCase);
        var isAdmin = User.IsInRole(nameof(RoleName.ADMIN));
        if (pending && !isAdmin) return Forbid();
        if (!pending && !string.Equals(query.Scope, "mine", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Scope must be 'mine' or 'pending'.");
        var result = await requestService.ListAsync(actorId, query, isAdmin, cancellationToken);
        return Ok(result);
    }

    [HttpGet("options")]
    public async Task<ActionResult<HrRequestOptionsDto>> Options(CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var actorId)) return Unauthorized();
        return Ok(await requestService.GetOptionsAsync(actorId, cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<HrRequestDto>> Create([FromBody] CreateHrRequestRequest request, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var actorId)) return Unauthorized();
        var response = await requestService.CreateAsync(actorId, request, BuildContext(actorId), cancellationToken);
        return CreatedAtAction(nameof(List), new { scope = "mine" }, response);
    }

    [HttpPost("{requestId:guid}/cancel")]
    public async Task<ActionResult<HrRequestDto>> Cancel(Guid requestId, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var actorId)) return Unauthorized();
        return Ok(await requestService.CancelAsync(actorId, requestId, BuildContext(actorId), cancellationToken));
    }

    [HttpPost("{requestId:guid}/review")]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = nameof(RoleName.ADMIN))]
    public async Task<ActionResult<HrRequestDto>> Review(Guid requestId, [FromBody] HrRequestReviewRequest request, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var actorId)) return Unauthorized();
        return Ok(await requestService.ReviewAsync(actorId, requestId, request, BuildContext(actorId), cancellationToken));
    }

    private AuditLogContext BuildContext(Guid actorId) => new(actorId, HttpContext.Connection.RemoteIpAddress,
        Request.Headers.UserAgent.ToString(), HttpContext.TraceIdentifier);
}
