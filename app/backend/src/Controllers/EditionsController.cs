using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Dto.Common;
using backend.src.Dto.EditionDto;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/editions")]
public class EditionsController(EditionService editionService) : ControllerBase
{
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
        Guid? actorId = null;
        var actorClaim = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(actorClaim, out var parsedId))
        {
            actorId = parsedId;
        }

        var result = await editionService.CreateEditionAsync(request, actorId, cancellationToken);
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
        Guid? actorId = null;
        var actorClaim = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(actorClaim, out var parsedId))
        {
            actorId = parsedId;
        }

        var result = await editionService.UpdateEditionAsync(id, request, actorId, cancellationToken);
        return Ok(result);
    }
}