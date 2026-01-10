using System.Text.Json;
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
public class DealsController : ControllerBase
{
    private readonly EstateFlowDbContext _context;
    private readonly IAuthService _authService;
    private readonly IEmailService _emailService;
    private readonly IOrganizationContextService _orgContext;

    public DealsController(EstateFlowDbContext context, IAuthService authService, IEmailService emailService, IOrganizationContextService orgContext)
    {
        _context = context;
        _authService = authService;
        _emailService = emailService;
        _orgContext = orgContext;
    }

    public record DealDto(
        Guid Id,
        string ClientName,
        string ClientEmail,
        string PropertyAddress,
        string? PropertyPhotoUrl,
        string? WelcomeMessage,
        string Status,
        string AccessToken,
        DateTime CreatedAt,
        List<TimelineStepDto> TimelineSteps,
        List<DocumentDto> Documents
    );

    public record TimelineStepDto(
        Guid Id,
        string Title,
        string? Description,
        string Status,
        DateOnly? DueDate,
        DateTime? CompletedAt,
        int Order
    );

    public record DocumentDto(
        Guid Id,
        string Filename,
        string Category,
        DateTime UploadedAt
    );

    public record CreateDealRequest(
        string ClientName,
        string ClientEmail,
        string PropertyAddress,
        string? PropertyPhotoUrl,
        string? WelcomeMessage,
        Guid? TemplateId
    );

    public record UpdateDealRequest(
        string? ClientName,
        string? ClientEmail,
        string? PropertyAddress,
        string? PropertyPhotoUrl,
        string? WelcomeMessage,
        string? Status
    );

    [HttpGet]
    public async Task<ActionResult<List<DealDto>>> GetDeals([FromQuery] string? status)
    {
        var agentId = _orgContext.GetCurrentAgentId();
        var orgId = _orgContext.GetCurrentOrganizationId();
        var role = _orgContext.GetCurrentRole();

        IQueryable<Deal> query = _context.Deals
            .Include(d => d.TimelineSteps.OrderBy(t => t.Order))
            .Include(d => d.Documents);

        // Role-based filtering: Employees see only their assigned deals, Admin/TeamLead see all org deals
        if (role == Role.Employee)
        {
            query = query.Where(d => d.AssignedToAgentId == agentId);
        }
        else
        {
            query = query.Where(d => d.OrganizationId == orgId);
        }

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<DealStatus>(status, true, out var dealStatus))
        {
            query = query.Where(d => d.Status == dealStatus);
        }

        var deals = await query.OrderByDescending(d => d.CreatedAt).ToListAsync();
        return Ok(deals.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DealDto>> GetDeal(Guid id)
    {
        var agentId = _orgContext.GetCurrentAgentId();
        var orgId = _orgContext.GetCurrentOrganizationId();
        var role = _orgContext.GetCurrentRole();

        var deal = await _context.Deals
            .Include(d => d.TimelineSteps.OrderBy(t => t.Order))
            .Include(d => d.Documents)
            .FirstOrDefaultAsync(d => d.Id == id && d.OrganizationId == orgId);

        if (deal == null)
            return NotFound(new { error = "Deal not found" });

        // Employees can only access deals assigned to them
        if (role == Role.Employee && deal.AssignedToAgentId != agentId)
            return Forbid();

        return Ok(ToDto(deal));
    }

    public record CanCreateDealResponse(bool CanCreate, int CurrentDeals, string? Reason);

    [HttpGet("can-create")]
    public async Task<ActionResult<CanCreateDealResponse>> CanCreateDeal()
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var organization = await _context.Organizations
            .Include(o => o.Deals)
            .FirstOrDefaultAsync(o => o.Id == orgId);

        if (organization == null)
            return NotFound(new { error = "Organization not found" });

        var dealCount = organization.Deals.Count;

        // If subscription is active, no limit
        if (organization.SubscriptionStatus == SubscriptionStatus.Active)
        {
            return Ok(new CanCreateDealResponse(true, dealCount, null));
        }

        // Trial users can only create 1 deal
        if (dealCount >= 1)
        {
            return Ok(new CanCreateDealResponse(false, dealCount, "Passez à Pro pour créer plus de transactions"));
        }

        return Ok(new CanCreateDealResponse(true, dealCount, null));
    }

    [HttpPost]
    public async Task<ActionResult<DealDto>> CreateDeal([FromBody] CreateDealRequest request)
    {
        var agentId = _orgContext.GetCurrentAgentId();
        var orgId = _orgContext.GetCurrentOrganizationId();

        var organization = await _context.Organizations
            .Include(o => o.Deals)
            .FirstOrDefaultAsync(o => o.Id == orgId);

        if (organization == null)
            return NotFound(new { error = "Organization not found" });

        var agent = await _context.Agents.FindAsync(agentId);
        if (agent == null)
            return NotFound(new { error = "Agent not found" });

        // Check deal limit for trial users at org level
        if (organization.SubscriptionStatus != SubscriptionStatus.Active && organization.Deals.Count >= 1)
        {
            return StatusCode(403, new { error = "Passez à Pro pour créer plus de transactions" });
        }

        var deal = new Deal
        {
            AgentId = agentId,
            OrganizationId = orgId,
            AssignedToAgentId = agentId,
            CreatedByAgentId = agentId,
            ClientName = request.ClientName,
            ClientEmail = request.ClientEmail,
            PropertyAddress = request.PropertyAddress,
            PropertyPhotoUrl = request.PropertyPhotoUrl,
            WelcomeMessage = request.WelcomeMessage ?? $"Bienvenue {request.ClientName}, suivez ici l'avancement de votre transaction.",
            AccessToken = _authService.GenerateAccessToken()
        };

        _context.Deals.Add(deal);

        // Apply template if provided
        if (request.TemplateId.HasValue)
        {
            var template = await _context.TimelineTemplates.FindAsync(request.TemplateId.Value);
            if (template != null)
            {
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var steps = JsonSerializer.Deserialize<List<TemplateStep>>(template.Steps, options);
                if (steps != null)
                {
                    foreach (var step in steps)
                    {
                        var timelineStep = new TimelineStep
                        {
                            DealId = deal.Id,
                            Title = step.Title,
                            Description = step.Description,
                            Order = step.Order
                        };
                        _context.TimelineSteps.Add(timelineStep);
                    }
                }
            }
        }

        await _context.SaveChangesAsync();

        // Send email to client
        var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:3000";
        var dealUrl = $"{frontendUrl}/deal/{deal.AccessToken}";
        await _emailService.SendNewDealEmailAsync(
            deal.ClientEmail,
            deal.ClientName,
            dealUrl,
            agent.FullName ?? agent.Email
        );

        return CreatedAtAction(nameof(GetDeal), new { id = deal.Id }, ToDto(deal));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DealDto>> UpdateDeal(Guid id, [FromBody] UpdateDealRequest request)
    {
        var agentId = _orgContext.GetCurrentAgentId();
        var orgId = _orgContext.GetCurrentOrganizationId();
        var role = _orgContext.GetCurrentRole();

        var deal = await _context.Deals
            .Include(d => d.TimelineSteps.OrderBy(t => t.Order))
            .Include(d => d.Documents)
            .FirstOrDefaultAsync(d => d.Id == id && d.OrganizationId == orgId);

        if (deal == null)
            return NotFound(new { error = "Deal not found" });

        // Employees can only update deals assigned to them
        if (role == Role.Employee && deal.AssignedToAgentId != agentId)
            return Forbid();

        if (request.ClientName != null) deal.ClientName = request.ClientName;
        if (request.ClientEmail != null) deal.ClientEmail = request.ClientEmail;
        if (request.PropertyAddress != null) deal.PropertyAddress = request.PropertyAddress;
        if (request.PropertyPhotoUrl != null) deal.PropertyPhotoUrl = request.PropertyPhotoUrl;
        if (request.WelcomeMessage != null) deal.WelcomeMessage = request.WelcomeMessage;
        if (request.Status != null && Enum.TryParse<DealStatus>(request.Status, true, out var status))
        {
            deal.Status = status;
        }

        deal.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(ToDto(deal));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> DeleteDeal(Guid id)
    {
        var agentId = _orgContext.GetCurrentAgentId();
        var orgId = _orgContext.GetCurrentOrganizationId();
        var role = _orgContext.GetCurrentRole();

        var deal = await _context.Deals.FirstOrDefaultAsync(d => d.Id == id && d.OrganizationId == orgId);

        if (deal == null)
            return NotFound(new { error = "Deal not found" });

        // Employees can only delete deals assigned to them
        if (role == Role.Employee && deal.AssignedToAgentId != agentId)
            return Forbid();

        _context.Deals.Remove(deal);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static DealDto ToDto(Deal deal) => new(
        deal.Id,
        deal.ClientName,
        deal.ClientEmail,
        deal.PropertyAddress,
        deal.PropertyPhotoUrl,
        deal.WelcomeMessage,
        deal.Status.ToString(),
        deal.AccessToken,
        deal.CreatedAt,
        deal.TimelineSteps.Select(t => new TimelineStepDto(
            t.Id, t.Title, t.Description, t.Status.ToString(), t.DueDate, t.CompletedAt, t.Order
        )).ToList(),
        deal.Documents.Select(d => new DocumentDto(
            d.Id, d.Filename, d.Category.ToString(), d.UploadedAt
        )).ToList()
    );

    private record TemplateStep(string Title, string? Description, int Order);
}
