using Microsoft.AspNetCore.Mvc;
using EstateFlow.Api.Services;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    public record LoginRequest(string Email);
    public record LoginResponse(string Message);
    public record CallbackRequest(string Token);
    public record CallbackResponse(string Token, bool IsNewUser);

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { error = "Email is required" });

        await _authService.GenerateMagicLinkAsync(request.Email.ToLower().Trim());

        return Ok(new LoginResponse("Magic link sent to your email"));
    }

    [HttpPost("callback")]
    public async Task<ActionResult<CallbackResponse>> Callback([FromBody] CallbackRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
            return BadRequest(new { error = "Token is required" });

        var jwt = await _authService.ValidateMagicLinkAsync(request.Token);

        if (jwt == null)
            return Unauthorized(new { error = "Invalid or expired token" });

        return Ok(new CallbackResponse(jwt, false));
    }
}
