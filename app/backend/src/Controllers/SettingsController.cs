using backend.src.Configurations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Dto.Settings;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/settings")]
public sealed class SettingsController(SystemSettingsService settingsService) : ControllerBase
{
    [HttpGet("my-permissions")]
    [Authorize]
    [ProducesResponseType<IReadOnlyList<string>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<string>>> GetMyPermissions(CancellationToken cancellationToken)
    {
        var role = User.FindFirstValue("role");
        var items = (await settingsService.GetRbacMatrixAsync(cancellationToken)).Items;
        var granted = items.Where(x => role switch {
            "ADMIN" => x.AdminAllowed, "CASHIER" => x.CashierAllowed,
            "INVENTORY_MANAGER" => x.WarehouseAllowed, _ => false
        }).Select(x => x.PermissionCode).ToArray();
        return Ok(granted);
    }

    [HttpGet("history/{group}")]
    [Authorize(Roles = nameof(RoleName.ADMIN))]
    [ProducesResponseType<IReadOnlyList<SettingsHistoryItemDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<SettingsHistoryItemDto>>> GetHistory(string group, CancellationToken cancellationToken)
        => Ok(await settingsService.GetHistoryAsync(group, cancellationToken));

    private const string AllStaffRoles =
        $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)},{nameof(RoleName.CASHIER)}";

    private Guid? CurrentActorId
    {
        get
        {
            var claim = User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claim, out var id) ? id : null;
        }
    }

    #region SCR-SYS-01: Rental Policy
    [HttpGet("rental-policy")]
    [Permission(AllStaffRoles)]
    [ProducesResponseType<RentalPolicyConfigDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<RentalPolicyConfigDto>> GetRentalPolicy(CancellationToken cancellationToken)
    {
        var result = await settingsService.GetRentalPolicyAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPut("rental-policy")]
    [Authorize(Roles = nameof(RoleName.ADMIN))]
    [ProducesResponseType<RentalPolicyConfigDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RentalPolicyConfigDto>> UpdateRentalPolicy(
        [FromBody] UpdateRentalPolicyRequest request,
        CancellationToken cancellationToken)
    {
        if (request.MaxExtensions < 0 || request.ExtensionDaysPerTime <= 0 || request.GracePeriodHours < 0 || request.LatePenaltyRatePct <= 0)
        {
            return BadRequest(new { message = "Tham số chính sách thuê không hợp lệ." });
        }

        var result = await settingsService.UpdateRentalPolicyAsync(request, CurrentActorId, cancellationToken);
        return Ok(result);
    }
    #endregion

    #region SCR-SYS-02: Membership Policy
    [HttpGet("membership-policy")]
    [Permission(AllStaffRoles)]
    [ProducesResponseType<MembershipPolicyConfigDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<MembershipPolicyConfigDto>> GetMembershipPolicy(CancellationToken cancellationToken)
    {
        var result = await settingsService.GetMembershipPolicyAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPut("membership-policy")]
    [Authorize(Roles = nameof(RoleName.ADMIN))]
    [ProducesResponseType<MembershipPolicyConfigDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MembershipPolicyConfigDto>> UpdateMembershipPolicy(
        [FromBody] UpdateMembershipPolicyRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Tiers == null || request.Tiers.Count == 0)
        {
            return BadRequest(new { message = "Danh sách phân hạng thành viên không được rỗng." });
        }

        var result = await settingsService.UpdateMembershipPolicyAsync(request, CurrentActorId, cancellationToken);
        return Ok(result);
    }
    #endregion

    #region SCR-SYS-03: RBAC Matrix
    [HttpGet("rbac-matrix")]
    [Authorize(Roles = nameof(RoleName.ADMIN))]
    [ProducesResponseType<RbacMatrixConfigDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<RbacMatrixConfigDto>> GetRbacMatrix(CancellationToken cancellationToken)
    {
        var result = await settingsService.GetRbacMatrixAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPut("rbac-matrix")]
    [Authorize(Roles = nameof(RoleName.ADMIN))]
    [ProducesResponseType<RbacMatrixConfigDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RbacMatrixConfigDto>> UpdateRbacMatrix(
        [FromBody] UpdateRbacMatrixRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Items == null || request.Items.Count == 0)
        {
            return BadRequest(new { message = "Dữ liệu ma trận phân quyền không được rỗng." });
        }

        var result = await settingsService.UpdateRbacMatrixAsync(request, CurrentActorId, cancellationToken);
        return Ok(result);
    }
    #endregion

    #region SCR-SYS-04: Integrations
    [HttpGet("integrations")]
    [Authorize(Roles = nameof(RoleName.ADMIN))]
    [ProducesResponseType<IntegrationsConfigDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IntegrationsConfigDto>> GetIntegrations(CancellationToken cancellationToken)
    {
        var result = await settingsService.GetIntegrationsAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPut("integrations")]
    [Authorize(Roles = nameof(RoleName.ADMIN))]
    [ProducesResponseType<IntegrationsConfigDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IntegrationsConfigDto>> UpdateIntegrations(
        [FromBody] UpdateIntegrationsRequest request,
        CancellationToken cancellationToken)
    {
        var result = await settingsService.UpdateIntegrationsAsync(request, CurrentActorId, cancellationToken);
        return Ok(result);
    }
    #endregion
}
