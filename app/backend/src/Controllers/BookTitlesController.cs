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
}