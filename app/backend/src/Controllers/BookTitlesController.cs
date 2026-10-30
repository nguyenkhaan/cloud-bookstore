using backend.src.Dto.Common;
using backend.src.Dto.TitleDto;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/book-titles")]
public class BookTitlesController(TitleService titleService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)},{nameof(RoleName.CASHIER)}")]
    [ProducesResponseType<PagedResult<TitleResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<TitleResponse>>> GetTitles(
        [FromQuery] TitleQuery query,
        CancellationToken cancellationToken)
    {
        var result = await titleService.GetTitlesAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)},{nameof(RoleName.CASHIER)}")]
    [ProducesResponseType<TitleDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TitleDetailResponse>> GetTitleById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var result = await titleService.GetTitleByIdAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)}")]
    [ProducesResponseType<TitleResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TitleResponse>> CreateTitle(
        [FromBody] CreateTitleRequest request,
        CancellationToken cancellationToken)
    {
        var result = await titleService.CreateTitleAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetTitleById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)}")]
    [ProducesResponseType<TitleResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TitleResponse>> UpdateTitle(
        [FromRoute] Guid id,
        [FromBody] UpdateTitleRequest request,
        CancellationToken cancellationToken)
    {
        var result = await titleService.UpdateTitleAsync(id, request, cancellationToken);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)}")]
    [ProducesResponseType<TitleResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TitleResponse>> UpdateTitleStatus(
        [FromRoute] Guid id,
        [FromBody] UpdateTitleStatusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await titleService.UpdateTitleStatusAsync(id, request, cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteTitle(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        await titleService.DeleteTitleAsync(id, cancellationToken);
        return NoContent();
    }
}