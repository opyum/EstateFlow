using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;
using EstateFlow.Api.Data.Entities;
using EstateFlow.Api.Services;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AgentsController : ControllerBase
{
    private readonly EstateFlowDbContext _context;
    private readonly IDashboardService _dashboardService;

    public AgentsController(EstateFlowDbContext context, IDashboardService dashboardService)
    {
        _context = context;
        _dashboardService = dashboardService;
    }

    private Guid GetCurrentAgentId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null ? Guid.Parse(claim.Value) : Guid.Empty;
    }

    public record AgentDto(
        Guid Id,
        string Email,
        string? FullName,
        string? Phone,
        string? PhotoUrl,
        string BrandColor,
        string? LogoUrl,
        string? SocialLinks,
        string SubscriptionStatus,
        DateTime CreatedAt
    );

    public record UpdateAgentRequest(
        string? FullName,
        string? Phone,
        string? PhotoUrl,
        string? BrandColor,
        string? LogoUrl,
        string? SocialLinks
    );

    [HttpGet("me")]
    public async Task<ActionResult<AgentDto>> GetCurrentAgent()
    {
        var agentId = GetCurrentAgentId();
        var agent = await _context.Agents.FindAsync(agentId);

        if (agent == null)
            return NotFound(new { error = "Agent not found" });

        return Ok(ToDto(agent));
    }

    [HttpPut("me")]
    public async Task<ActionResult<AgentDto>> UpdateCurrentAgent([FromBody] UpdateAgentRequest request)
    {
        var agentId = GetCurrentAgentId();
        var agent = await _context.Agents.FindAsync(agentId);

        if (agent == null)
            return NotFound(new { error = "Agent not found" });

        if (request.FullName != null) agent.FullName = request.FullName;
        if (request.Phone != null) agent.Phone = request.Phone;
        if (request.PhotoUrl != null) agent.PhotoUrl = request.PhotoUrl;
        if (request.BrandColor != null) agent.BrandColor = request.BrandColor;
        if (request.LogoUrl != null) agent.LogoUrl = request.LogoUrl;
        if (request.SocialLinks != null) agent.SocialLinks = request.SocialLinks;

        agent.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(ToDto(agent));
    }

    [HttpGet("me/stats")]
    public async Task<ActionResult> GetAgentStats()
    {
        var agentId = GetCurrentAgentId();

        var totalDeals = await _context.Deals.CountAsync(d => d.AgentId == agentId);
        var activeDeals = await _context.Deals.CountAsync(d => d.AgentId == agentId && d.Status == DealStatus.Active);
        var completedDeals = await _context.Deals.CountAsync(d => d.AgentId == agentId && d.Status == DealStatus.Completed);

        return Ok(new
        {
            totalDeals,
            activeDeals,
            completedDeals
        });
    }

    [HttpGet("me/dashboard")]
    public async Task<ActionResult<AgentDashboardDto>> GetDashboard()
    {
        var agentId = GetCurrentAgentId();
        var orgIdClaim = User.FindFirstValue("org_id");

        if (string.IsNullOrEmpty(orgIdClaim))
        {
            return BadRequest("Agent is not part of an organization");
        }

        var orgId = Guid.Parse(orgIdClaim);
        var dashboard = await _dashboardService.GetAgentDashboardAsync(agentId, orgId);

        return Ok(dashboard);
    }

    private static AgentDto ToDto(Agent agent) => new(
        agent.Id,
        agent.Email,
        agent.FullName,
        agent.Phone,
        agent.PhotoUrl,
        agent.BrandColor,
        agent.LogoUrl,
        agent.SocialLinks,
        agent.SubscriptionStatus.ToString(),
        agent.CreatedAt
    );
}
