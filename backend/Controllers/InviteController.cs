using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;
using EstateFlow.Api.Data.Entities;
using EstateFlow.Api.Services;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InviteController : ControllerBase
{
    private readonly EstateFlowDbContext _context;
    private readonly IAuthService _authService;

    public InviteController(EstateFlowDbContext context, IAuthService authService)
    {
        _context = context;
        _authService = authService;
    }

    public record InviteInfoDto(string OrganizationName, string Email, string Role, DateTime ExpiresAt);
    public record AcceptInviteRequest(string? FullName);
    public record AcceptInviteResponse(string Token, bool IsNewUser);

    // GET /api/invite/{token}
    [HttpGet("{token}")]
    public async Task<ActionResult<InviteInfoDto>> GetInviteInfo(string token)
    {
        var invitation = await _context.Invitations
            .Include(i => i.Organization)
            .FirstOrDefaultAsync(i => i.Token == token && i.AcceptedAt == null && i.ExpiresAt > DateTime.UtcNow);

        if (invitation == null)
            return NotFound(new { error = "Invalid or expired invitation" });

        return Ok(new InviteInfoDto(
            invitation.Organization.Name,
            invitation.Email,
            invitation.Role.ToString(),
            invitation.ExpiresAt
        ));
    }

    // POST /api/invite/{token}/accept
    [HttpPost("{token}/accept")]
    public async Task<ActionResult<AcceptInviteResponse>> AcceptInvite(string token, [FromBody] AcceptInviteRequest request)
    {
        var invitation = await _context.Invitations
            .Include(i => i.Organization)
            .FirstOrDefaultAsync(i => i.Token == token && i.AcceptedAt == null && i.ExpiresAt > DateTime.UtcNow);

        if (invitation == null)
            return NotFound(new { error = "Invalid or expired invitation" });

        // Find or create agent
        var agent = await _context.Agents.FirstOrDefaultAsync(a => a.Email == invitation.Email);
        var isNewUser = agent == null;

        if (agent == null)
        {
            if (string.IsNullOrWhiteSpace(request.FullName))
                return BadRequest(new { error = "Full name is required for new users" });

            agent = new Agent
            {
                Email = invitation.Email,
                FullName = request.FullName
            };
            _context.Agents.Add(agent);
            await _context.SaveChangesAsync();
        }

        // Check if already a member
        var existingMembership = await _context.OrganizationMembers
            .FirstOrDefaultAsync(m => m.OrganizationId == invitation.OrganizationId && m.AgentId == agent.Id);

        if (existingMembership != null)
            return BadRequest(new { error = "Already a member of this organization" });

        // Create membership
        var membership = new OrganizationMember
        {
            OrganizationId = invitation.OrganizationId,
            AgentId = agent.Id,
            Role = invitation.Role,
            JoinedAt = DateTime.UtcNow
        };

        _context.OrganizationMembers.Add(membership);

        // Mark invitation as accepted
        invitation.AcceptedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Generate JWT with org context
        var jwtToken = _authService.GenerateJwtToken(
            agent.Id,
            agent.Email,
            invitation.OrganizationId,
            invitation.Role
        );

        return Ok(new AcceptInviteResponse(jwtToken, isNewUser));
    }
}
