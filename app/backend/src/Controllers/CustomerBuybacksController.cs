using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.BuybackDto;
using backend.src.Dto.Common;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/buybacks")]
public class CustomerBuybacksController(CustomerBuybackService buybackService) : ControllerBase
{
    private const string StaffRoles =
        $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)},{nameof(RoleName.CASHIER)}";

    [HttpGet]
    [Authorize(Roles = StaffRoles)]
    [ProducesResponseType<PagedResult<CustomerBuybackDetailResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<CustomerBuybackDetailResponse>>> GetBuybacks(
        [FromQuery] BuybackQuery query,
        CancellationToken cancellationToken)
    {
        var result = await buybackService.GetBuybacksAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = StaffRoles)]
    [ProducesResponseType<CustomerBuybackDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerBuybackDetailResponse>> GetBuybackById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var result = await buybackService.GetBuybackByIdAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpGet("lookup-isbn/{query}")]
    [Authorize(Roles = StaffRoles)]
    [ProducesResponseType<BuybackIsbnLookupResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<BuybackIsbnLookupResponse>> LookupByIsbn(
        [FromRoute] string query,
        CancellationToken cancellationToken)
    {
        var result = await buybackService.LookupByIsbnAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = StaffRoles)]
    [ProducesResponseType<CustomerBuybackDetailResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CustomerBuybackDetailResponse>> CreateBuyback(
        [FromBody] CreateCustomerBuybackRequest request,
        CancellationToken cancellationToken)
    {
        var result = await buybackService.CreateBuybackAsync(
            request,
            User.IsInRole(nameof(RoleName.ADMIN)),
            BuildAuditContext(),
            cancellationToken);
        return CreatedAtAction(nameof(GetBuybackById), new { id = result.Id }, result);
    }

    [HttpPost("{id:guid}/complete")]
    [Authorize(Roles = StaffRoles)]
    [ProducesResponseType<CustomerBuybackDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CustomerBuybackDetailResponse>> CompleteBuyback(
        [FromRoute] Guid id,
        [FromBody] CompleteCustomerBuybackRequest? request,
        CancellationToken cancellationToken)
    {
        var result = await buybackService.CompleteBuybackAsync(
            id,
            request ?? new CompleteCustomerBuybackRequest(),
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
