using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using backend.src.Configurations;
using backend.src.Dto.AuthDto;
using backend.src.Dto.UploadDto;
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
        var session = await authService.Login(request, Request.Headers.UserAgent.ToString());
        authCookieService.AppendAuthenticationCookies(Response, session.AccessToken, session.RefreshToken);
        return Ok(new AuthenticationResponse(
            session.AccessToken,
            session.RefreshToken,
            session.CsrfToken,
            session.User));
    }
    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request 
    )
    {
        var response = await authService.Register(request, HttpContext.Connection.RemoteIpAddress?.ToString());
        return Created(string.Empty , response);
    }

    // [AllowAnonymous]
    [HttpPost("verify")]
    public async Task<IActionResult> Verify([FromBody] VerifyRequest request)
    {
        await authService.Verify(request.Token);
        return NoContent();
    }

    [HttpPost("verification-resends")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationRequest request)
    {
        await authService.ResendVerificationAsync(request.Email, HttpContext.Connection.RemoteIpAddress?.ToString());
        return NoContent();
    }

    // [AllowAnonymous]
    [HttpPost("password-reset-requests")]
    public async Task<IActionResult> RequestPasswordReset([FromBody] ForgotPasswordRequest request)
    {
        await authService.RequestPasswordReset(request, HttpContext.Connection.RemoteIpAddress?.ToString());
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
            var (employeeId, accessJti) = GetIdentity();
            var cookieAuthenticated = HttpContext.Items[AuthTokenSelector.CookieAuthenticationItem] is true;

            if (cookieAuthenticated && !string.IsNullOrWhiteSpace(refreshToken))
            {
                try
                {
                    await authService.LogoutByRefreshTokenAsync(employeeId, refreshToken, accessJti);
                }
                catch (UnauthorizedException)
                {
                    await authService.LogoutByAccessTokenAsync(employeeId, accessJti);
                }
            }
            else
            {
                await authService.LogoutByAccessTokenAsync(employeeId, accessJti);
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
            var session = await authService.Refresh(refreshToken, csrfToken, Request.Headers.UserAgent.ToString());
            authCookieService.AppendAuthenticationCookies(Response, session.AccessToken, session.RefreshToken);
            return Ok(new AuthenticationResponse(
                session.AccessToken,
                session.RefreshToken,
                session.CsrfToken,
                session.User));
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
        var (employeeId, accessJti) = GetIdentity();
        return Ok(await authService.GetBrowserSessionAsync(accessJti, employeeId));
    }

    [Authorize]
    [HttpGet("profile")]
    [ProducesResponseType<EmployeeProfileResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<EmployeeProfileResponse>> GetProfile()
        => Ok(await authService.GetProfileAsync(GetIdentity().EmployeeId));

    [Authorize]
    [HttpPut("profile")]
    [ProducesResponseType<EmployeeProfileResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<EmployeeProfileResponse>> UpdateProfile([FromBody] UpdateProfileRequest request)
        => Ok(await authService.UpdateProfileAsync(GetIdentity().EmployeeId, request));

    [Authorize]
    [HttpPut("profile/avatar")]
    [ProducesResponseType<EmployeeProfileResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<EmployeeProfileResponse>> UpdateProfileAvatar([FromBody] CloudinaryUploadResultRequest request)
        => Ok(await authService.UpdateProfileAvatarAsync(GetIdentity().EmployeeId, request));

    [Authorize]
    [HttpPost("change-password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var (employeeId, accessJti) = GetIdentity();
        await authService.ChangePasswordAsync(employeeId, accessJti, request);
        return NoContent();
    }

    [Authorize]
    [HttpGet("sessions")]
    [ProducesResponseType<List<EmployeeSessionResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<List<EmployeeSessionResponse>>> GetSessions()
    {
        var (employeeId, accessJti) = GetIdentity();
        return Ok(await authService.GetSessionsAsync(employeeId, accessJti));
    }

    [Authorize]
    [HttpDelete("sessions/{sessionId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RevokeSession(Guid sessionId)
    {
        var (employeeId, accessJti) = GetIdentity();
        await authService.RevokeSessionAsync(employeeId, accessJti, sessionId);
        return NoContent();
    }

    [Authorize]
    [HttpPost("sessions/revoke-others")]
    [ProducesResponseType<RevokeOtherSessionsResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<RevokeOtherSessionsResponse>> RevokeOtherSessions()
    {
        var (employeeId, accessJti) = GetIdentity();
        return Ok(await authService.RevokeOtherSessionsAsync(employeeId, accessJti));
    }

    private (Guid EmployeeId, string AccessJti) GetIdentity()
    {
        var accessJti = User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
        if (string.IsNullOrWhiteSpace(accessJti) || !Guid.TryParse(User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value, out var employeeId))
            throw new UnauthorizedException("Invalid or expired access token");
        return (employeeId, accessJti);
    }
}
