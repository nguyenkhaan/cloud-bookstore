using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using backend.src.Configurations;
using backend.src.Dto.AuthDto;
using backend.src.Exceptions;
using backend.src.Services;

namespace backend.src.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    AuthService authService,
    AuthCookieService authCookieService,
    AuthCookieSettings authCookieSettings) : ControllerBase
{
    // [AllowAnonymous]
    [HttpPost("login")]
    [ProducesResponseType<AuthenticationResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthenticationResponse>> Login(
        [FromBody] LoginRequest request
    )
    {
        var session = await authService.Login(request);
        authCookieService.AppendAuthenticationCookies(Response, session.AccessToken, session.RefreshToken);
        return Ok(new AuthenticationResponse(
            session.AccessToken,
            session.RefreshToken,
            session.CsrfToken));
    }
    // [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request 
    )
    {
        var response = await authService.Register(request);
        return Created(string.Empty , response);
    }

    // [AllowAnonymous]
    [HttpPost("verify")]
    public async Task<IActionResult> Verify([FromBody] VerifyRequest request)
    {
        await authService.Verify(request.Token);
        return NoContent();
    }

    // [AllowAnonymous]
    [HttpPost("password-reset-requests")]
    public async Task<IActionResult> RequestPasswordReset([FromBody] ForgotPasswordRequest request)
    {
        await authService.RequestPasswordReset(request);
        return NoContent();
    }

    // [AllowAnonymous]
    [HttpPost("password-resets")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        await authService.ResetPassword(request);
        return NoContent();
    }

    [Authorize]
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout()
    {
        try
        {
            var refreshToken = Request.Cookies[authCookieSettings.RefreshCookieName] ?? string.Empty;
            var accessJti = User.FindFirst(JwtRegisteredClaimNames.Jti)!.Value;
            var cookieAuthenticated = HttpContext.Items[AuthTokenSelector.CookieAuthenticationItem] is true;

            if (cookieAuthenticated && !string.IsNullOrWhiteSpace(refreshToken))
            {
                try
                {
                    await authService.LogoutByRefreshTokenAsync(refreshToken, accessJti);
                }
                catch (UnauthorizedException)
                {
                    await authService.LogoutByAccessTokenAsync(accessJti);
                }
            }
            else
            {
                await authService.LogoutByAccessTokenAsync(accessJti);
            }

            return NoContent();
        }
        finally
        {
            authCookieService.ExpireAuthenticationCookies(Response);
        }
    }

    [HttpPost("refresh")]
    [ProducesResponseType<AuthenticationResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthenticationResponse>> Refresh()
    {
        try
        {
            var refreshToken = Request.Cookies[authCookieSettings.RefreshCookieName] ?? string.Empty;
            var csrfToken = Request.Headers[authCookieSettings.CsrfHeaderName].ToString();
            var session = await authService.Refresh(refreshToken, csrfToken);
            authCookieService.AppendAuthenticationCookies(Response, session.AccessToken, session.RefreshToken);
            return Ok(new AuthenticationResponse(
                session.AccessToken,
                session.RefreshToken,
                session.CsrfToken));
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
