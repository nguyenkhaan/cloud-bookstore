using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.Common;
using backend.src.Dto.SupplierDto;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/suppliers")]
public class SuppliersController(SupplierService supplierService) : ControllerBase
{
    private const string ReadRoles =
        $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)},{nameof(RoleName.CASHIER)}";

    private const string WriteRoles =
        $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)}";

    [HttpGet]
    [Authorize(Roles = ReadRoles)]
    [ProducesResponseType<PagedResult<SupplierResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<SupplierResponse>>> GetSuppliers(
        [FromQuery] SupplierQuery query,
        CancellationToken cancellationToken)
    {
        var result = await supplierService.GetSuppliersAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("stats")]
    [Authorize(Roles = ReadRoles)]
    [ProducesResponseType<SupplierStatsResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<SupplierStatsResponse>> GetStats(CancellationToken cancellationToken)
    {
        var stats = await supplierService.GetStatsAsync(cancellationToken);
        return Ok(stats);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = ReadRoles)]
    [ProducesResponseType<SupplierResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierResponse>> GetSupplierById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var result = await supplierService.GetSupplierByIdAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = WriteRoles)]
    [ProducesResponseType<SupplierResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SupplierResponse>> CreateSupplier(
        [FromBody] CreateSupplierRequest request,
        CancellationToken cancellationToken)
    {
        var result = await supplierService.CreateSupplierAsync(request, BuildAuditContext(), cancellationToken);
        return CreatedAtAction(nameof(GetSupplierById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = WriteRoles)]
    [ProducesResponseType<SupplierResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SupplierResponse>> UpdateSupplier(
        [FromRoute] Guid id,
        [FromBody] UpdateSupplierRequest request,
        CancellationToken cancellationToken)
    {
        var result = await supplierService.UpdateSupplierAsync(id, request, BuildAuditContext(), cancellationToken);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = WriteRoles)]
    [ProducesResponseType<SupplierResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierResponse>> UpdateSupplierStatus(
        [FromRoute] Guid id,
        [FromBody] UpdateSupplierStatusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await supplierService.UpdateSupplierStatusAsync(id, request, BuildAuditContext(), cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = WriteRoles)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteSupplier(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        await supplierService.DeleteSupplierAsync(id, BuildAuditContext(), cancellationToken);
        return NoContent();
    }

    private Guid? GetActorId()
    {
        var actorClaim = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(actorClaim, out var parsedId) ? parsedId : null;
    }

    private AuditLogContext BuildAuditContext()
        => new(GetActorId(), HttpContext.Connection.RemoteIpAddress);
}
