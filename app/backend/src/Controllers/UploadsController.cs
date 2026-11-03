using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.UploadDto;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/uploads")]
[Authorize(Roles = StaffRoles)]
public sealed class UploadsController(UploadIntentService uploadIntentService) : ControllerBase
{
    private const string StaffRoles =
        $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)},{nameof(RoleName.CASHIER)}";

    [HttpPost("signature")]
    [ProducesResponseType<UploadSignatureResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UploadSignatureResponse>> CreateSignature(
        [FromBody] UploadSignatureRequest request,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var actorId))
        {
            return Unauthorized();
        }

        var response = await uploadIntentService.CreateSignatureAsync(
            actorId,
            request,
            new AuditLogContext(actorId, HttpContext.Connection.RemoteIpAddress),
            cancellationToken);
        return Ok(response);
    }
}
