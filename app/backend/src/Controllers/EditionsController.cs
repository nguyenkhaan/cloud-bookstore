using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.Common;
using backend.src.Dto.EditionDto;
using backend.src.Dto.UploadDto;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/editions")]
public class EditionsController(EditionService editionService) : ControllerBase
{
    private const string StaffRoles =
        $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)},{nameof(RoleName.CASHIER)}";

    [HttpGet]
    [Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)},{nameof(RoleName.CASHIER)}")]
    [ProducesResponseType<PagedResult<EditionResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<EditionResponse>>> GetEditions(
        [FromQuery] EditionQuery query,
        CancellationToken cancellationToken)
    {
        var result = await editionService.GetEditionsAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)},{nameof(RoleName.CASHIER)}")]
    [ProducesResponseType<EditionDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EditionDetailResponse>> GetEditionById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var result = await editionService.GetEditionByIdAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)}")]
    [ProducesResponseType<EditionResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<EditionResponse>> CreateEdition(
        [FromBody] CreateEditionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await editionService.CreateEditionAsync(request, BuildAuditContext(), cancellationToken);
        return CreatedAtAction(nameof(GetEditionById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)}")]
    [ProducesResponseType<EditionResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<EditionResponse>> UpdateEdition(
        [FromRoute] Guid id,
        [FromBody] UpdateEditionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await editionService.UpdateEditionAsync(id, request, BuildAuditContext(), cancellationToken);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)}")]
    [ProducesResponseType<EditionResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EditionResponse>> UpdateEditionStatus(
        [FromRoute] Guid id,
        [FromBody] UpdateEditionStatusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await editionService.UpdateEditionStatusAsync(id, request, cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteEdition(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        await editionService.DeleteEditionAsync(id, BuildAuditContext(), cancellationToken);
        return NoContent();
    }

    [HttpPut("{id:guid}/image")]
    [Authorize(Roles = StaffRoles)]
    [ProducesResponseType<EditionResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<EditionResponse>> UpdateEditionImage(
        [FromRoute] Guid id,
        [FromBody] CloudinaryUploadResultRequest request,
        CancellationToken cancellationToken)
    {
        var result = await editionService.UpdateEditionImageAsync(id, request, BuildAuditContext(), cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{id:guid}/image")]
    [Authorize(Roles = StaffRoles)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteEditionImage(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        await editionService.DeleteEditionImageAsync(id, BuildAuditContext(), cancellationToken);
        return NoContent();
    }

    private AuditLogContext BuildAuditContext()
    {
        var actorClaim = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return new AuditLogContext(
            Guid.TryParse(actorClaim, out var actorId) ? actorId : null,
            HttpContext.Connection.RemoteIpAddress);
    }
}
