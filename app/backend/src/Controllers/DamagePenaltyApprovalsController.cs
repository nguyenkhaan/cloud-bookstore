using backend.src.Configurations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Dto.ApprovalDto;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.Common;
using backend.src.Models.Enums;
using backend.src.Services.ApprovalServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/approvals/damage-penalty")]
public class DamagePenaltyApprovalsController(DamagePenaltyApprovalService service) : ControllerBase
{
    private const string StaffRoles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)},{nameof(RoleName.CASHIER)}";
    private const string AdminRole = nameof(RoleName.ADMIN);

    [HttpGet]
    [Permission(StaffRoles)]
    [ProducesResponseType<PagedResult<DamagePenaltyApprovalItemResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<DamagePenaltyApprovalItemResponse>>> GetRequests(
        [FromQuery] ApprovalQuery query,
        CancellationToken cancellationToken)
    {
        var result = await service.GetPagedAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Permission(StaffRoles)]
    [ProducesResponseType<DamagePenaltyApprovalDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DamagePenaltyApprovalDetailResponse>> GetById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var result = await service.GetByIdAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [Permission(StaffRoles)]
    [ProducesResponseType<DamagePenaltyApprovalDetailResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<DamagePenaltyApprovalDetailResponse>> Create(
        [FromBody] CreateDamagePenaltyApprovalRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await service.CreateAsync(request, BuildAuditContext(), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = AdminRole)]
    [ProducesResponseType<DamagePenaltyApprovalDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DamagePenaltyApprovalDetailResponse>> UpdateStatus(
        [FromRoute] Guid id,
        [FromBody] UpdateApprovalStatusRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await service.UpdateStatusAsync(
            id,
            request,
            User.IsInRole(AdminRole),
            BuildAuditContext(),
            cancellationToken);
        return Ok(result);
    }

    private Guid? GetActorId()
    {
        var actorClaim = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(actorClaim, out var parsedId) ? parsedId : null;
    }

    private AuditLogContext BuildAuditContext()
        => new(GetActorId(), HttpContext.Connection.RemoteIpAddress);
}
