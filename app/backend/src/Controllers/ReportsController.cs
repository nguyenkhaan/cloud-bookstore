using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Dto.Common;
using backend.src.Dto.ReportDto;
using backend.src.Models.Enums;
using backend.src.Services.ReportServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/reports")]
public class ReportsController(ReportsService reportsService) : ControllerBase
{
    [HttpGet("overview")]
    [Authorize]
    [ProducesResponseType<OverviewReportResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<OverviewReportResponse>> GetOverview(
        [FromQuery] DateOnly? date = null,
        [FromQuery] string? trendRange = "week",
        CancellationToken cancellationToken = default)
    {
        var isCashierScoped = User.IsInRole(nameof(RoleName.CASHIER)) &&
                              !User.IsInRole(nameof(RoleName.ADMIN)) &&
                              !User.IsInRole(nameof(RoleName.INVENTORY_MANAGER));

        var result = await reportsService.GetOverviewAsync(
            date,
            trendRange,
            GetCurrentEmployeeId(),
            isCashierScoped,
            cancellationToken);
        return Ok(result);
    }

    [HttpGet("revenue-expense")]
    [Authorize(Roles = nameof(RoleName.ADMIN))]
    [ProducesResponseType<RevenueExpenseReportResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<RevenueExpenseReportResponse>> GetRevenueExpense(
        [FromQuery] RevenueExpenseQuery query,
        CancellationToken cancellationToken)
    {
        var result = await reportsService.GetRevenueExpenseAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("revenue-expense/documents")]
    [Authorize(Roles = nameof(RoleName.ADMIN))]
    [ProducesResponseType<PagedResult<RevenueExpenseDocumentRowDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<RevenueExpenseDocumentRowDto>>> GetRevenueExpenseDocuments(
        [FromQuery] RevenueExpenseQuery query,
        CancellationToken cancellationToken)
    {
        var result = await reportsService.GetRevenueExpenseDocumentsAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("deposit-reconciliation")]
    [Authorize(Roles = nameof(RoleName.ADMIN))]
    [ProducesResponseType<DepositReconciliationReportResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<DepositReconciliationReportResponse>> GetDepositReconciliation(
        [FromQuery] DepositReconciliationQuery query,
        CancellationToken cancellationToken)
    {
        var result = await reportsService.GetDepositReconciliationAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("tax-declaration")]
    [Authorize(Roles = nameof(RoleName.ADMIN))]
    [ProducesResponseType<TaxDeclarationReportResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TaxDeclarationReportResponse>> GetTaxDeclaration(
        [FromQuery] TaxDeclarationQuery query,
        CancellationToken cancellationToken)
    {
        var result = await reportsService.GetTaxDeclarationAsync(query, cancellationToken);
        return Ok(result);
    }

    private Guid? GetCurrentEmployeeId()
    {
        var claim = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
