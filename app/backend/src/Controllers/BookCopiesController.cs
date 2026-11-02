using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.BookCopyDto;
using backend.src.Dto.Common;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/book-copies")]
public class BookCopiesController(BookCopyService bookCopyService) : ControllerBase
{
    private const string ReadRoles =
        $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)},{nameof(RoleName.CASHIER)}";

    private const string WriteRoles =
        $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)}";

    [HttpGet]
    [Authorize(Roles = ReadRoles)]
    [ProducesResponseType<PagedResult<BookCopyResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<BookCopyResponse>>> GetBookCopies(
        [FromQuery] BookCopyQuery query,
        CancellationToken cancellationToken)
    {
        var result = await bookCopyService.GetBookCopiesAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("by-barcode/{copyBarcode}")]
    [Authorize(Roles = ReadRoles)]
    [ProducesResponseType<BookCopyDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<BookCopyDetailResponse>> GetBookCopyByBarcode(
        [FromRoute] string copyBarcode,
        CancellationToken cancellationToken)
    {
        var result = await bookCopyService.GetBookCopyByBarcodeAsync(copyBarcode, CanViewCost(), cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = ReadRoles)]
    [ProducesResponseType<BookCopyDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<BookCopyDetailResponse>> GetBookCopyById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var result = await bookCopyService.GetBookCopyByIdAsync(id, CanViewCost(), cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}/history")]
    [Authorize(Roles = ReadRoles)]
    [ProducesResponseType<IReadOnlyList<BookCopyHistoryItem>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<BookCopyHistoryItem>>> GetBookCopyHistory(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var result = await bookCopyService.GetBookCopyHistoryAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = WriteRoles)]
    [ProducesResponseType<BookCopyDetailResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<BookCopyDetailResponse>> CreateBookCopy(
        [FromBody] CreateBookCopyRequest request,
        CancellationToken cancellationToken)
    {
        var result = await bookCopyService.CreateBookCopyAsync(request, BuildAuditContext(), cancellationToken);
        return CreatedAtAction(nameof(GetBookCopyById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = WriteRoles)]
    [ProducesResponseType<BookCopyDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<BookCopyDetailResponse>> UpdateBookCopy(
        [FromRoute] Guid id,
        [FromBody] UpdateBookCopyRequest request,
        CancellationToken cancellationToken)
    {
        var result = await bookCopyService.UpdateBookCopyAsync(id, request, BuildAuditContext(), cancellationToken);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = WriteRoles)]
    [ProducesResponseType<BookCopyDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<BookCopyDetailResponse>> UpdateBookCopyStatus(
        [FromRoute] Guid id,
        [FromBody] UpdateBookCopyStatusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await bookCopyService.UpdateBookCopyStatusAsync(
            id, request, User.IsInRole(nameof(RoleName.ADMIN)), BuildAuditContext(), cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id:guid}/label")]
    [Authorize(Roles = WriteRoles)]
    [ProducesResponseType<BookCopyLabelResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<BookCopyLabelResponse>> CreateBookCopyLabel(
        [FromRoute] Guid id,
        [FromBody] BookCopyLabelRequest? request = null,
        CancellationToken cancellationToken = default)
    {
        var result = await bookCopyService.CreateLabelAsync(id, request, BuildAuditContext(), cancellationToken);
        return Ok(result);
    }

    private bool CanViewCost()
        => User.IsInRole(nameof(RoleName.ADMIN)) || User.IsInRole(nameof(RoleName.INVENTORY_MANAGER));

    private Guid? GetActorId()
    {
        var actorClaim = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(actorClaim, out var parsedId) ? parsedId : null;
    }

    private AuditLogContext BuildAuditContext()
        => new(GetActorId(), HttpContext.Connection.RemoteIpAddress);
}