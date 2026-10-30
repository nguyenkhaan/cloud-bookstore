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
}

