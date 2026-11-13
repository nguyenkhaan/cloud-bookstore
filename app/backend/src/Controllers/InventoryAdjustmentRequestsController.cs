using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.Common;
using backend.src.Dto.InventoryAdjustmentDto;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

/// <summary>
/// Manages inventory adjustment requests, admin approval processing, and retention cleanup.
/// </summary>
[ApiController]
[Route("api/inventory-adjustment-requests")]
public class InventoryAdjustmentRequestsController(InventoryAdjustmentService adjustmentService) : ControllerBase
{
    private const string StaffWriteRoles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)}";
    private const string AdminRole = nameof(RoleName.ADMIN);

    [HttpGet]
    [Authorize(Roles = StaffWriteRoles)]
    [ProducesResponseType<PagedResult<InventoryAdjustmentRequestResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedResult<InventoryAdjustmentRequestResponse>>> GetRequests(
        [FromQuery] InventoryAdjustmentQuery query,
        CancellationToken cancellationToken)
    {
        var result = await adjustmentService.GetRequestsAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("stats")]
    [Authorize(Roles = StaffWriteRoles)]
    [ProducesResponseType<InventoryAdjustmentStatsResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<InventoryAdjustmentStatsResponse>> GetStats(CancellationToken cancellationToken)
    {
        var stats = await adjustmentService.GetStatsAsync(cancellationToken);
        return Ok(stats);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = StaffWriteRoles)]
    [ProducesResponseType<InventoryAdjustmentRequestDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InventoryAdjustmentRequestDetailResponse>> GetRequestById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var result = await adjustmentService.GetByIdAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = StaffWriteRoles)]
    [ProducesResponseType<InventoryAdjustmentRequestDetailResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<InventoryAdjustmentRequestDetailResponse>> CreateRequest(
        [FromBody] CreateInventoryAdjustmentRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await adjustmentService.CreateAsync(request, BuildAuditContext(), cancellationToken);
        return CreatedAtAction(nameof(GetRequestById), new { id = result.Id }, result);
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = AdminRole)]
    [ProducesResponseType<InventoryAdjustmentRequestDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<InventoryAdjustmentRequestDetailResponse>> UpdateRequestStatus(
        [FromRoute] Guid id,
        [FromBody] UpdateInventoryAdjustmentStatusDto request,
        CancellationToken cancellationToken)
    {
        var result = await adjustmentService.UpdateStatusAsync(
            id,
            request,
            User.IsInRole(AdminRole),
            BuildAuditContext(),
            cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id:guid}/cancel")]
    [Authorize(Roles = StaffWriteRoles)]
    [ProducesResponseType<InventoryAdjustmentRequestDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<InventoryAdjustmentRequestDetailResponse>> CancelRequest(
        [FromRoute] Guid id,
        [FromBody] CancelInventoryAdjustmentRequestDto? request = null,
        CancellationToken cancellationToken = default)
    {
        var result = await adjustmentService.CancelAsync(
            id,
            request,
            User.IsInRole(AdminRole),
            BuildAuditContext(),
            cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = AdminRole)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteExpiredRequest(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        await adjustmentService.DeleteByRetentionAsync(
            id,
            User.IsInRole(AdminRole),
            BuildAuditContext(),
            cancellationToken);
        return NoContent();
    }

    private Guid? GetActorId()
    {
        var actorClaim = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(actorClaim, out var parsedId) ? parsedId : null;
    }

    private AuditLogContext BuildAuditContext()
        => new(GetActorId(), HttpContext.Connection.RemoteIpAddress);
}
