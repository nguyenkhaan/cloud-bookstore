using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.Common;
using backend.src.Dto.StockReceiptDto;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/stock-receipts")]
public class StockReceiptsController(StockReceiptService stockReceiptService) : ControllerBase
{
    private const string ReadRoles =
        $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)},{nameof(RoleName.CASHIER)}";

    private const string WriteRoles =
        $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)}";

    [HttpGet]
    [Authorize(Roles = ReadRoles)]
    [ProducesResponseType<PagedResult<StockReceiptSummaryResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<StockReceiptSummaryResponse>>> GetStockReceipts(
        [FromQuery] StockReceiptQuery query,
        CancellationToken cancellationToken)
    {
        var result = await stockReceiptService.GetStockReceiptsAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = ReadRoles)]
    [ProducesResponseType<StockReceiptDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StockReceiptDetailResponse>> GetStockReceiptById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var result = await stockReceiptService.GetStockReceiptByIdAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = WriteRoles)]
    [ProducesResponseType<StockReceiptDetailResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StockReceiptDetailResponse>> CreateStockReceipt(
        [FromBody] CreateStockReceiptRequest request,
        CancellationToken cancellationToken)
    {
        var result = await stockReceiptService.CreateStockReceiptAsync(
            request,
            BuildAuditContext(),
            cancellationToken);
        return CreatedAtAction(nameof(GetStockReceiptById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = WriteRoles)]
    [ProducesResponseType<StockReceiptDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<StockReceiptDetailResponse>> UpdateStockReceipt(
        [FromRoute] Guid id,
        [FromBody] UpdateStockReceiptRequest request,
        CancellationToken cancellationToken)
    {
        var result = await stockReceiptService.UpdateStockReceiptAsync(
            id,
            request,
            BuildAuditContext(),
            cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id:guid}/complete")]
    [Authorize(Roles = WriteRoles)]
    [ProducesResponseType<StockReceiptDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<StockReceiptDetailResponse>> CompleteStockReceipt(
        [FromRoute] Guid id,
        [FromBody] CompleteStockReceiptRequest? request,
        CancellationToken cancellationToken)
    {
        var result = await stockReceiptService.CompleteStockReceiptAsync(
            id,
            request ?? new CompleteStockReceiptRequest(),
            BuildAuditContext(),
            cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id:guid}/activate")]
    [Authorize(Roles = WriteRoles)]
    [ProducesResponseType<StockReceiptDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StockReceiptDetailResponse>> ActivateReceiptCopies(
        [FromRoute] Guid id,
        [FromBody] ActivateStockReceiptCopiesRequest? request,
        CancellationToken cancellationToken)
    {
        var result = await stockReceiptService.ActivateReceiptCopiesAsync(
            id,
            request,
            BuildAuditContext(),
            cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id:guid}/cancel")]
    [Authorize(Roles = WriteRoles)]
    [ProducesResponseType<StockReceiptDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<StockReceiptDetailResponse>> CancelStockReceipt(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var result = await stockReceiptService.CancelStockReceiptAsync(
            id,
            BuildAuditContext(),
            cancellationToken);
        return Ok(result);
    }

    private Guid? GetActorId()
    {
        var actorClaim = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(actorClaim, out var parsedId) ? parsedId : null;
    }

    private AuditLogContext BuildAuditContext()
        => new(GetActorId(), HttpContext.Connection.RemoteIpAddress);
}
