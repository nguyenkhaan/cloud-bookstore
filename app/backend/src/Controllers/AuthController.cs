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
    public IActionResult Login(
        [FromBody] LoginRequest request
    )
    {
        var response = authService.Login(request);
        return Ok(response);
    }
}
