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

    [HttpPost]
    [Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)}")]
    [ProducesResponseType<BookSeriesResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<BookSeriesResponse>> CreateBookSeries(
        [FromBody] CreateBookSeriesRequest request,
        CancellationToken cancellationToken)
    {
        var result = await bookSeriesService.CreateBookSeriesAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetBookSeriesById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)}")]
    [ProducesResponseType<BookSeriesResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<BookSeriesResponse>> UpdateBookSeries(
        [FromRoute] Guid id,
        [FromBody] UpdateBookSeriesRequest request,
        CancellationToken cancellationToken)
    {
        var result = await bookSeriesService.UpdateBookSeriesAsync(id, request, cancellationToken);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)}")]
    [ProducesResponseType<BookSeriesResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<BookSeriesResponse>> UpdateBookSeriesStatus(
        [FromRoute] Guid id,
        [FromBody] UpdateBookSeriesStatusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await bookSeriesService.UpdateBookSeriesStatusAsync(id, request, cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteBookSeries(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        await bookSeriesService.DeleteBookSeriesAsync(id, cancellationToken);
        return NoContent();
    }
}