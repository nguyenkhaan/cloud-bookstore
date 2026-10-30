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
}
