using Microsoft.AspNetCore.Mvc;
using backend.src.Exceptions;
using backend.src.Services;

namespace backend.src.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController(IEmailHealthCheck emailHealthCheck) : ControllerBase
{
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

    [HttpGet("/health/email")]
    [ProducesResponseType<EmailHealthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<EmailHealthResponse>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetEmailHealth(CancellationToken cancellationToken)
    {
        var isHealthy = await emailHealthCheck.IsHealthyAsync(cancellationToken);
        var response = new EmailHealthResponse(isHealthy ? "Healthy" : "Unhealthy");

        return isHealthy
            ? Ok(response)
            : StatusCode(StatusCodes.Status503ServiceUnavailable, response);
    }
}
