using backend.src.Dto.AuditLogDto;
using backend.src.Dto.Common;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/audit")]
[Authorize(Roles = $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)}")]
public class AuditLogController(AuditLogService auditLogService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PagedResult<AuditLogResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<AuditLogResponse>>> Search(
        [FromQuery] AuditLogQuery query,
        CancellationToken cancellationToken)
    {
        var response = await auditLogService.SearchPagedAsync(
            query,
            restrictToInventoryScope: IsInventoryScopedOnly(),
            cancellationToken);
        return Ok(response);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<AuditLogDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AuditLogDetailResponse>> GetById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var response = await auditLogService.GetByIdWithRelatedAsync(
            id,
            restrictToInventoryScope: IsInventoryScopedOnly(),
            cancellationToken);
        return Ok(response);
    }

    [HttpGet("metadata")]
    [ProducesResponseType<AuditLogMetadataResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AuditLogMetadataResponse>> GetMetadata(CancellationToken cancellationToken)
    {
        var response = await auditLogService.GetMetadataAsync(
            restrictToInventoryScope: IsInventoryScopedOnly(),
            cancellationToken);
        return Ok(response);
    }

    private bool IsInventoryScopedOnly()
        => !User.IsInRole(nameof(RoleName.ADMIN));
}
