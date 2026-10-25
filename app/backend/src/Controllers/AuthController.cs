using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.src.Dto.AuthDto;
using backend.src.Exceptions;
using backend.src.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.src.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    AuthService authService,
    IConfiguration configuration,
    IWebHostEnvironment environment) : ControllerBase
{
    private const string RefreshCookieName = "refresh_token";

    // Refresh token chỉ nằm trong cookie httpOnly, JS ở FE không đọc được => chống XSS đánh cắp.
    // SameSite=Strict + Path hẹp => cookie chỉ được gửi tới /api/auth/*, từ cùng site.
    private CookieOptions RefreshCookieOptions() => new()
    {
        HttpOnly = true,
        Secure = !environment.IsDevelopment(),
        SameSite = SameSiteMode.Strict,
        Path = "/api/auth",
        Expires = DateTimeOffset.UtcNow.AddDays(configuration.GetValue("Auth:RefreshDays", 7))
    };

    private IActionResult SessionResponse(LoginResponse tokens)
    {
        Response.Cookies.Append(RefreshCookieName, tokens.RefreshToken, RefreshCookieOptions());
        return Ok(new { accessToken = tokens.AccessToken });
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
        => SessionResponse(await authService.Login(request));

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        => Created(string.Empty, await authService.Register(request));

    [AllowAnonymous]
    [HttpPost("verify")]
    public async Task<IActionResult> Verify([FromBody] VerifyRequest request)
    {
        await authService.Verify(request.Token);
        return NoContent();
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        var refreshToken = Request.Cookies[RefreshCookieName];
        if (string.IsNullOrEmpty(refreshToken))
            throw new UnauthorizedException("Missing refresh token", "INVALID_REFRESH");
        return SessionResponse(await authService.Refresh(refreshToken));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var jti = User.FindFirstValue(JwtRegisteredClaimNames.Jti)
            ?? throw new UnauthorizedException("Invalid session", "INVALID_SESSION");
        await authService.Logout(jti);
        Response.Cookies.Delete(RefreshCookieName, new CookieOptions
        {
            Path = "/api/auth",
            Secure = !environment.IsDevelopment(),
            SameSite = SameSiteMode.Strict,
            HttpOnly = true
        });
        return NoContent();
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        if (!Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var userId))
            throw new UnauthorizedException("Invalid session", "INVALID_SESSION");
        return Ok(await authService.GetProfile(userId));
    }
}