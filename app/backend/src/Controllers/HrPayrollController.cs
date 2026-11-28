using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.PayrollDto;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/hr/payroll")]
[Authorize(Roles = nameof(RoleName.ADMIN))]
public sealed class HrPayrollController(HrPayrollService payrollService) : ControllerBase
{
    [HttpGet("periods")]
    public async Task<ActionResult<IReadOnlyList<PayrollPeriodListItemDto>>> ListPeriods(CancellationToken cancellationToken)
        => Ok(await payrollService.ListPeriodsAsync(cancellationToken));

    [HttpGet("periods/{periodKey}")]
    public async Task<ActionResult<PayrollPeriodDetailDto>> GetPeriod(string periodKey, [FromQuery] PayrollPeriodQuery query, CancellationToken cancellationToken)
        => Ok(await payrollService.GetPeriodAsync(periodKey, query, cancellationToken));

    [HttpPost("periods/{periodKey}/initialize")]
    public async Task<ActionResult<PayrollPeriodDetailDto>> Initialize(string periodKey, CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actorId)) return Unauthorized();
        return Ok(await payrollService.InitializeAsync(actorId, periodKey, BuildContext(actorId), cancellationToken));
    }

    [HttpPatch("periods/{periodKey}/employees/{employeeId:guid}")]
    public async Task<ActionResult<PayrollPeriodDetailDto>> AdjustEmployee(
        string periodKey, Guid employeeId, [FromBody] PatchPayrollEmployeeRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actorId)) return Unauthorized();
        return Ok(await payrollService.AdjustEmployeeAsync(actorId, periodKey, employeeId, request, BuildContext(actorId), cancellationToken));
    }

    [HttpPost("periods/{periodKey}/approve")]
    public async Task<ActionResult<PayrollPeriodDetailDto>> Approve(string periodKey, CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actorId)) return Unauthorized();
        return Ok(await payrollService.ApproveAsync(actorId, periodKey, BuildContext(actorId), cancellationToken));
    }

    [HttpPost("periods/{periodKey}/unlock")]
    public async Task<ActionResult<PayrollPeriodDetailDto>> Unlock(string periodKey, [FromBody] UnlockPayrollRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actorId)) return Unauthorized();
        return Ok(await payrollService.UnlockAsync(actorId, periodKey, request, BuildContext(actorId), cancellationToken));
    }

    [HttpPost("periods/{periodKey}/payouts")]
    public async Task<ActionResult<PayrollPeriodDetailDto>> Payout(string periodKey, [FromBody] BatchPayoutRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actorId)) return Unauthorized();
        return Ok(await payrollService.PayoutAsync(actorId, periodKey, request, BuildContext(actorId), cancellationToken));
    }

    [HttpPost("periods/{periodKey}/send-zalo")]
    public async Task<ActionResult<SendPayrollZaloResultDto>> SendZalo(string periodKey, [FromBody] SendPayrollZaloRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actorId)) return Unauthorized();
        return Ok(await payrollService.SendZaloAsync(actorId, periodKey, request ?? new SendPayrollZaloRequest(), BuildContext(actorId), cancellationToken));
    }

    [HttpGet("periods/{periodKey}/employees/{employeeId:guid}/breakdown")]
    public async Task<ActionResult<PayrollBreakdownDto>> GetBreakdown(string periodKey, Guid employeeId, CancellationToken cancellationToken)
        => Ok(await payrollService.GetBreakdownAsync(periodKey, employeeId, cancellationToken));

    [HttpGet("adjustments")]
    public async Task<ActionResult<IReadOnlyList<PayrollAdjustmentDto>>> ListAdjustments([FromQuery] string? periodKey, CancellationToken cancellationToken)
        => Ok(await payrollService.ListAdjustmentsAsync(periodKey, cancellationToken));

    [HttpPost("adjustments")]
    public async Task<ActionResult<PayrollAdjustmentDto>> CreateAdjustment([FromBody] CreatePayrollAdjustmentRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actorId)) return Unauthorized();
        var created = await payrollService.CreateAdjustmentAsync(actorId, request, BuildContext(actorId), cancellationToken);
        return CreatedAtAction(nameof(ListAdjustments), new { periodKey = created.TargetPeriodKey }, created);
    }

    private bool TryGetActor(out Guid actorId)
        => Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out actorId);

    private AuditLogContext BuildContext(Guid actorId) => new(actorId, HttpContext.Connection.RemoteIpAddress,
        Request.Headers.UserAgent.ToString(), HttpContext.TraceIdentifier);
}
