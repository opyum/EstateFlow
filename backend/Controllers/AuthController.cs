using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using EstateFlow.Api.Services;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private static readonly Regex EmailRegex = new(
        @"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    public record LoginRequest([Required, EmailAddress, StringLength(254)] string Email);
    public record LoginResponse(string Message);
    public record CallbackRequest([Required, StringLength(100)] string Token);
    public record CallbackResponse(string Token, bool IsNewUser);

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        // ========== SECURITY: Validate email format ==========
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { error = "Email is required" });

        var email = request.Email.ToLower().Trim();

        if (email.Length > 254 || !EmailRegex.IsMatch(email))
            return BadRequest(new { error = "Invalid email format" });

        try
        {
            await _authService.GenerateMagicLinkAsync(email);
        }
        catch (Exception)
        {
            // ========== SECURITY: Don't reveal if email exists or not ==========
            // Log internally but don't expose to client
        }

        // Always return success to prevent email enumeration
        return Ok(new LoginResponse("If this email is registered, you will receive a magic link shortly"));
    }

    [HttpPost("callback")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<CallbackResponse>> Callback([FromBody] CallbackRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
            return BadRequest(new { error = "Token is required" });

        // ========== SECURITY: Validate token format ==========
        if (request.Token.Length > 100 || request.Token.Any(c => !char.IsLetterOrDigit(c) && c != '-' && c != '_'))
            return Unauthorized(new { error = "Invalid token" });

        var jwt = await _authService.ValidateMagicLinkAsync(request.Token);

        if (jwt == null)
            return Unauthorized(new { error = "Invalid or expired token" });

        return Ok(new CallbackResponse(jwt, false));
    }
}
