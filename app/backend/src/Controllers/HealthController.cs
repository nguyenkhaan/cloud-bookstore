using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http.HttpResults;
using backend.src.Exceptions;

namespace backend.src.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
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
}
