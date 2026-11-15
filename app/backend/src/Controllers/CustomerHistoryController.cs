using backend.src.Dto.Common;
using backend.src.Dto.CustomerDto;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/customers/{customerId:guid}/history")]
public class CustomerHistoryController(CustomerHistoryService historyService) : ControllerBase
{
    private const string FullAccess = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.CASHIER)}";
    private const string BuybackAccess =
        $"{nameof(RoleName.ADMIN)},{nameof(RoleName.CASHIER)},{nameof(RoleName.INVENTORY_MANAGER)}";

    [HttpGet("summary")]
    [Authorize(Roles = FullAccess)]
    [ProducesResponseType<CustomerHistorySummaryResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerHistorySummaryResponse>> GetSummary(
        [FromRoute] Guid customerId, CancellationToken cancellationToken) =>
        Ok(await historyService.GetSummaryAsync(customerId, cancellationToken));

    [HttpGet("rentals")]
    [Authorize(Roles = FullAccess)]
    [ProducesResponseType<PagedResult<CustomerRentalHistoryItem>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PagedResult<CustomerRentalHistoryItem>>> GetRentals(
        [FromRoute] Guid customerId, [FromQuery] CustomerHistoryQuery query, CancellationToken cancellationToken) =>
        Ok(await historyService.GetRentalsAsync(customerId, query, cancellationToken));

    [HttpGet("sales")]
    [Authorize(Roles = FullAccess)]
    [ProducesResponseType<PagedResult<CustomerSaleHistoryItem>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PagedResult<CustomerSaleHistoryItem>>> GetSales(
        [FromRoute] Guid customerId, [FromQuery] CustomerHistoryQuery query, CancellationToken cancellationToken) =>
        Ok(await historyService.GetSalesAsync(customerId, query, cancellationToken));

    [HttpGet("buybacks")]
    [Authorize(Roles = BuybackAccess)]
    [ProducesResponseType<PagedResult<CustomerBuybackHistoryItem>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PagedResult<CustomerBuybackHistoryItem>>> GetBuybacks(
        [FromRoute] Guid customerId, [FromQuery] CustomerHistoryQuery query, CancellationToken cancellationToken) =>
        Ok(await historyService.GetBuybacksAsync(customerId, query, cancellationToken));

    [HttpGet("violations")]
    [Authorize(Roles = FullAccess)]
    [ProducesResponseType<PagedResult<CustomerViolationItem>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PagedResult<CustomerViolationItem>>> GetViolations(
        [FromRoute] Guid customerId, [FromQuery] CustomerHistoryQuery query, CancellationToken cancellationToken) =>
        Ok(await historyService.GetViolationsAsync(customerId, query, cancellationToken));
}