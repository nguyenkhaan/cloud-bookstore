using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Configurations;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.PayrollDto;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/hr/payslips")]
public sealed class HrPayslipsController(HrPayslipService payslipService) : ControllerBase
{
    /// <summary>Strict SELF scope: the employee is always the authenticated actor.</summary>
    [HttpGet("me")]
    [Permission("ADMIN,CASHIER,INVENTORY_MANAGER")]
    public async Task<ActionResult<PayslipDetailDto>> GetMyPayslip([FromQuery] string? periodKey, CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actorId)) return Unauthorized();
        return Ok(await payslipService.GetMyPayslipAsync(actorId, periodKey, cancellationToken));
    }

    [HttpGet("{employeeId:guid}")]
    [Authorize(Roles = nameof(RoleName.ADMIN))]
    public async Task<ActionResult<PayslipDetailDto>> GetEmployeePayslip(Guid employeeId, [FromQuery] string? periodKey, CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actorId)) return Unauthorized();
        return Ok(await payslipService.GetPayslipAsync(employeeId, periodKey, actorId, cancellationToken));
    }

    [HttpPost("{entryId:guid}/disputes")]
    [Permission("ADMIN,CASHIER,INVENTORY_MANAGER")]
    public async Task<ActionResult<PayslipDisputeDto>> CreateDispute(Guid entryId, [FromBody] CreatePayslipDisputeRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actorId)) return Unauthorized();
        var created = await payslipService.CreateDisputeAsync(actorId, entryId, request, BuildContext(actorId), cancellationToken);
        return CreatedAtAction(nameof(GetMyPayslip), new { }, created);
    }

    [HttpPost("disputes/{disputeId:guid}/respond")]
    [Authorize(Roles = nameof(RoleName.ADMIN))]
    public async Task<ActionResult<PayslipDisputeDto>> RespondDispute(Guid disputeId, [FromBody] RespondPayslipDisputeRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actorId)) return Unauthorized();
        return Ok(await payslipService.RespondDisputeAsync(actorId, disputeId, request, BuildContext(actorId), cancellationToken));
    }

    [HttpPost("{entryId:guid}/resend-zalo")]
    [Authorize(Roles = nameof(RoleName.ADMIN))]
    public async Task<ActionResult<ZaloSendResultDto>> ResendZalo(Guid entryId, CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actorId)) return Unauthorized();
        return Ok(await payslipService.ResendZaloAsync(actorId, entryId, BuildContext(actorId), cancellationToken));
    }

    private bool TryGetActor(out Guid actorId)
        => Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out actorId);

    private AuditLogContext BuildContext(Guid actorId) => new(actorId, HttpContext.Connection.RemoteIpAddress,
        Request.Headers.UserAgent.ToString(), HttpContext.TraceIdentifier);
}
