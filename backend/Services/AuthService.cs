using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using EstateFlow.Api.Data;
using EstateFlow.Api.Data.Entities;

namespace EstateFlow.Api.Services;

public class AuthService : IAuthService
{
    private readonly EstateFlowDbContext _context;
    private readonly IEmailService _emailService;
    private readonly string _jwtSecret;
    private readonly string _jwtIssuer;
    private readonly string _jwtAudience;
    private readonly int _jwtExpiryHours;
    private readonly int _magicLinkExpiryMinutes;
    private readonly string _frontendUrl;

    public AuthService(EstateFlowDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
        _jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? "default_dev_secret_key_minimum_32_chars!!";
        _jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "estateflow";
        _jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "estateflow";
        _jwtExpiryHours = int.TryParse(Environment.GetEnvironmentVariable("JWT_EXPIRY_HOURS"), out var h) ? h : 24;
        _magicLinkExpiryMinutes = int.TryParse(Environment.GetEnvironmentVariable("MAGIC_LINK_EXPIRY_MINUTES"), out var m) ? m : 15;
        _frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:3000";
    }

    public async Task<string> GenerateMagicLinkAsync(string email)
    {
        // Find or create agent
        var agent = await _context.Agents.FirstOrDefaultAsync(a => a.Email == email);
        if (agent == null)
        {
            agent = new Agent { Email = email };
            _context.Agents.Add(agent);
            await _context.SaveChangesAsync();
        }

        // Generate token
        var token = GenerateSecureToken();
        var magicLink = new MagicLink
        {
            AgentId = agent.Id,
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddMinutes(_magicLinkExpiryMinutes)
        };

        _context.MagicLinks.Add(magicLink);
        await _context.SaveChangesAsync();

        // Build magic link URL
        var magicLinkUrl = $"{_frontendUrl}/auth/callback?token={token}";

        // Send email
        await _emailService.SendMagicLinkEmailAsync(email, magicLinkUrl);

        return magicLinkUrl;
    }

    public async Task<string?> ValidateMagicLinkAsync(string token)
    {
        var magicLink = await _context.MagicLinks
            .Include(m => m.Agent)
            .FirstOrDefaultAsync(m => m.Token == token && m.UsedAt == null && m.ExpiresAt > DateTime.UtcNow);

        if (magicLink == null)
            return null;

        // Mark as used
        magicLink.UsedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Generate JWT
        return GenerateJwtToken(magicLink.Agent.Id, magicLink.Agent.Email);
    }

    public string GenerateJwtToken(Guid agentId, string email)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, agentId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwtIssuer,
            audience: _jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(_jwtExpiryHours),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateAccessToken()
    {
        return GenerateSecureToken();
    }

    private static string GenerateSecureToken()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
    }
}
