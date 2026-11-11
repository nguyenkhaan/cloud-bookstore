using backend.src.Dto.Membership;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api")]
public sealed class MembershipController(MembershipService membershipService) : ControllerBase
{
    private const string StaffRoles =
        $"{nameof(RoleName.ADMIN)},{nameof(RoleName.CASHIER)},{nameof(RoleName.INVENTORY_MANAGER)}";

    [HttpGet("policy")]
    [Authorize(Roles = StaffRoles)]
    [ProducesResponseType<IReadOnlyList<MembershipTierPolicyResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<MembershipTierPolicyResponse>>> GetCurrentPolicy(
        CancellationToken cancellationToken)
    {
        var result = await membershipService.GetMembershipPolicyAsync(cancellationToken);
        return Ok(result);
    }
}
