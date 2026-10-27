using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using backend.src.Configurations;
using backend.src.Dto.AuthDto;
using backend.src.Services;

namespace backend.src.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    AuthService authService,
    AuthCookieService authCookieService,
    AuthCookieSettings authCookieSettings) : ControllerBase
{
    [HttpPost("login")]
    [ProducesResponseType<BrowserSessionResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<BrowserSessionResponse>> Login(
        [FromBody] LoginRequest request
    )
    {
        var session = await authService.Login(request);
        authCookieService.AppendAuthenticationCookies(Response, session.AccessToken, session.RefreshToken);
        return Ok(new BrowserSessionResponse(session.CsrfToken));
    }
    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request 
    )
    {
        var response = await authService.Register(request);
        return Created(string.Empty , response);
    }

    [HttpPost("verify")]
    public async Task<IActionResult> Verify([FromBody] VerifyRequest request)
    {
        await authService.Verify(request.Token);
        return NoContent();
    }

    [HttpPost("password-reset-requests")]
    public async Task<IActionResult> RequestPasswordReset([FromBody] ForgotPasswordRequest request)
    {
        await authService.RequestPasswordReset(request);
        return NoContent();
    }

    [HttpPost("password-resets")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        await authService.ResetPassword(request);
        return NoContent();
    }

    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout()
    {
        try
        {
            var refreshToken = Request.Cookies[authCookieSettings.RefreshCookieName] ?? string.Empty;
            var csrfToken = Request.Headers[authCookieSettings.CsrfHeaderName].ToString();
            await authService.Logout(refreshToken, csrfToken);
            return NoContent();
        }
        finally
        {
            authCookieService.ExpireAuthenticationCookies(Response);
        }
    }

    [HttpPost("refresh")]
    [ProducesResponseType<BrowserSessionResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<BrowserSessionResponse>> Refresh()
    {
        try
        {
            var refreshToken = Request.Cookies[authCookieSettings.RefreshCookieName] ?? string.Empty;
            var csrfToken = Request.Headers[authCookieSettings.CsrfHeaderName].ToString();
            var session = await authService.Refresh(refreshToken, csrfToken);
            authCookieService.AppendAuthenticationCookies(Response, session.AccessToken, session.RefreshToken);
            return Ok(new BrowserSessionResponse(session.CsrfToken));
        }
        catch (backend.src.Exceptions.UnauthorizedException)
        {
            authCookieService.ExpireAuthenticationCookies(Response);
            throw;
        }
    }

    [Authorize]
    [HttpGet("session")]
    [ProducesResponseType<BrowserSessionResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<BrowserSessionResponse>> GetSession()
    {
        var accessJti = User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
        if (string.IsNullOrWhiteSpace(accessJti))
        {
            return Unauthorized();
        }

        return Ok(await authService.GetBrowserSessionAsync(accessJti));
    }
}
