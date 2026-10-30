using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Dto.AttachmentDto;
using backend.src.Dto.AuditLogDto;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/attachments")]
[Authorize(Roles = StaffRoles)]
public class AttachmentController(AttachmentService attachmentService) : ControllerBase
{
    private const string StaffRoles =
        $"{nameof(RoleName.ADMIN)},{nameof(RoleName.INVENTORY_MANAGER)},{nameof(RoleName.CASHIER)}";

    // Chặn sớm ở mức request (file tối đa 10 MB + overhead multipart).
    // Nếu nâng Minio:MaxFileSizeMb thì phải nâng cả hằng số này.
    public const int MaxRequestBytes = 12 * 1024 * 1024;

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxRequestBytes)]
    public async Task<IActionResult> Upload(
        [FromForm] UploadAttachmentRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actorId, out var context))
            return Unauthorized();

        var response = await attachmentService.UploadAsync(actorId, request, context, cancellationToken);
        return CreatedAtAction(nameof(GetDownloadUrl), new { attachmentId = response.Id }, response);
    }

    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] AttachmentQuery query,
        CancellationToken cancellationToken)
        => Ok(await attachmentService.SearchAsync(query, cancellationToken));

    [HttpGet("{attachmentId:guid}/download-url")]
    public async Task<IActionResult> GetDownloadUrl(Guid attachmentId, CancellationToken cancellationToken)
        => Ok(await attachmentService.GetDownloadUrlAsync(attachmentId, cancellationToken));

    [HttpDelete("{attachmentId:guid}")]
    public async Task<IActionResult> Delete(
        Guid attachmentId,
        [FromBody] DeleteAttachmentRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetActor(out var actorId, out var context))
            return Unauthorized();

        await attachmentService.DeleteAsync(actorId, attachmentId, request, context, cancellationToken);
        return NoContent();
    }

    private bool TryGetActor(out Guid actorId, out AuditLogContext context)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress;
        context = new AuditLogContext(null, ipAddress);
        if (!Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out actorId))
            return false;

        context = new AuditLogContext(actorId, ipAddress);
        return true;
    }
}