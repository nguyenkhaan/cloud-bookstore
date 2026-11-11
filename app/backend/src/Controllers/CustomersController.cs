using backend.src.Dto.Common;
using backend.src.Dto.CustomerDto;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/customers")]
[Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)},{nameof(RoleName.CASHIER)}")]
public class CustomersController(CustomerService customerService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PagedResult<CustomerDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<CustomerDto>>> GetCustomers(
        [FromQuery] CustomerQuery query,
        CancellationToken cancellationToken)
    {
        var result = await customerService.GetCustomersAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("stats")]
    [ProducesResponseType<CustomerStatsDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CustomerStatsDto>> GetCustomerStats(
        CancellationToken cancellationToken)
    {
        var stats = await customerService.GetStatsAsync(cancellationToken);
        return Ok(stats);
    }

    [HttpGet("check-duplicate")]
    [ProducesResponseType<CustomerDuplicateCheckResult>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CustomerDuplicateCheckResult>> CheckDuplicate(
        [FromQuery] string? phone,
        CancellationToken cancellationToken)
    {
        var result = await customerService.CheckDuplicateAsync(phone, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<CustomerDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerDto>> GetCustomerById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var result = await customerService.GetCustomerByIdAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType<CustomerDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CustomerDto>> CreateCustomer(
        [FromBody] CreateCustomerRequest request,
        CancellationToken cancellationToken)
    {
        var result = await customerService.CreateCustomerAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetCustomerById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType<CustomerDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CustomerDto>> UpdateCustomer(
        [FromRoute] Guid id,
        [FromBody] UpdateCustomerRequest request,
        CancellationToken cancellationToken)
    {
        var result = await customerService.UpdateCustomerAsync(id, request, cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteCustomer(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        await customerService.DeleteCustomerAsync(id, cancellationToken);
        return NoContent();
    }
}
