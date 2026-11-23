using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.Common;
using backend.src.Dto.StockOutDto;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/stock-out")]
public class StockOutController(StockOutService stockOutService) : ControllerBase
{
    private const string ReadRoles =
        $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)},{nameof(RoleName.CASHIER)}";

    private const string WriteRoles =
        $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)}";

    [HttpGet]
    [Authorize(Roles = ReadRoles)]
    [ProducesResponseType<PagedResult<StockOutDetailResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<StockOutDetailResponse>>> GetStockOuts(
        [FromQuery] StockOutQuery query,
        CancellationToken cancellationToken)
    {
        var result = await stockOutService.GetStockOutsAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = ReadRoles)]
    [ProducesResponseType<StockOutDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StockOutDetailResponse>> GetStockOutById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var result = await stockOutService.GetStockOutByIdAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = WriteRoles)]
    [ProducesResponseType<StockOutDetailResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<StockOutDetailResponse>> CreateStockOut(
        [FromBody] CreateStockOutRequest request,
        CancellationToken cancellationToken)
    {
        var result = await stockOutService.CreateStockOutAsync(
            request,
            User.IsInRole(nameof(RoleName.ADMIN)),
            BuildAuditContext(),
            cancellationToken);
        return CreatedAtAction(nameof(GetStockOutById), new { id = result.Id }, result);
    }

    [HttpPost("{id:guid}/confirm")]
    [Authorize(Roles = WriteRoles)]
    [ProducesResponseType<StockOutDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<StockOutDetailResponse>> ConfirmStockOut(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var result = await stockOutService.ConfirmStockOutAsync(
            id,
            User.IsInRole(nameof(RoleName.ADMIN)),
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
