using backend.src.Dto.BookSeriesDto;
using backend.src.Dto.Common;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/book-series")]
public class BookSeriesController(BookSeriesService bookSeriesService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)},{nameof(RoleName.CASHIER)}")]
    [ProducesResponseType<PagedResult<BookSeriesResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<BookSeriesResponse>>> GetBookSeries(
        [FromQuery] BookSeriesQuery query,
        CancellationToken cancellationToken)
    {
        var result = await bookSeriesService.GetBookSeriesAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)},{nameof(RoleName.CASHIER)}")]
    [ProducesResponseType<BookSeriesDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<BookSeriesDetailResponse>> GetBookSeriesById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var result = await bookSeriesService.GetBookSeriesByIdAsync(id, cancellationToken);
        return Ok(result);
    }
}