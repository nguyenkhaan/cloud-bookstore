using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using backend.src.Exceptions;
using backend.src.Infrastructure;
using Microsoft.AspNetCore.Authorization;

namespace backend.src.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController(EmailService emailService) : ControllerBase
{
    public sealed class SendTestEmailRequest
    {
        [Required, EmailAddress]
        public required string RecipientEmail { get; init; }
    }

    public sealed record EmailTestResponse(string Status);

    [HttpGet("liveness")]
    public IActionResult GetHealthLiveness()
    {
        return Ok("Build with Cloudian 💙 Cloud");
    }
    [HttpGet("json")]
    public IActionResult GetHealthText()
    {
        return Ok(new
        {
            message = "Build with Cloudian 💙 Cloud"
        });
    }
    [HttpGet("exception")]
    public string GetHealthError()
    {
        throw new BadRequestException("This is an exception for testing");
    }

    [HttpPost("health/email")]
    [ProducesResponseType<EmailTestResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<EmailTestResponse>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> SendTestEmail(
        [FromBody] SendTestEmailRequest request,
        CancellationToken cancellationToken)
    {
        var sent = await emailService.SendTestEmailAsync(request.RecipientEmail, cancellationToken);
        var response = new EmailTestResponse(sent ? "Sent" : "Unavailable");

        return sent
            ? Ok(response)
            : StatusCode(StatusCodes.Status503ServiceUnavailable, response);
    }
    [Authorize(Roles ="ADMIN")]
    [HttpGet("health/authorization")]
    public async Task<IActionResult> TestAuthorization()
    {
        return Ok("Testing authorization successfully");
    }
}
