using Microsoft.AspNetCore.Mvc;
using backend.src.Services;
using backend.src.Dto.AuthDto;

namespace backend.src.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AuthService authService) : ControllerBase
{
    //Truong role dung de authorization, authentication dung JwtToken
    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request
    )
    {
        var response = await authService.Login(request);
        return Ok(response);
    }
    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request 
    )
    {
        var response = await authService.Register(request);
        return Created(string.Empty , response);
    }
}
