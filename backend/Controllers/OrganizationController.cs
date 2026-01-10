using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;
using EstateFlow.Api.Data.Entities;
using EstateFlow.Api.Services;
using EstateFlow.Api.Authorization;
using Stripe;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrganizationController : ControllerBase
{
    private readonly EstateFlowDbContext _context;
    private readonly IOrganizationContextService _orgContext;
    private readonly IEmailService _emailService;

    public OrganizationController(
        EstateFlowDbContext context,
        IOrganizationContextService orgContext,
        IEmailService emailService)
    {
        _context = context;
        _orgContext = orgContext;
        _emailService = emailService;
    }

    // DTOs
    public record OrganizationDto(Guid Id, string Name, string BrandColor, string? LogoUrl, string SubscriptionStatus, int MemberCount);
    public record UpdateOrganizationRequest(string? Name, string? BrandColor, string? LogoUrl);
    public record MemberDto(Guid AgentId, string Email, string? FullName, string? PhotoUrl, string Role, int ActiveDeals, DateTime JoinedAt);
    public record ChangeMemberRoleRequest(string Role);
    public record TransferAdminRequest(Guid NewAdminAgentId);
    public record InvitationDto(Guid Id, string Email, string Role, DateTime CreatedAt, DateTime ExpiresAt);
    public record CreateInvitationRequest(string Email, string Role);
    public record TeamDealDto(Guid Id, string ClientName, string PropertyAddress, string Status, Guid? AssignedToAgentId, string? AssignedToName, string? AssignedToPhotoUrl, DateTime CreatedAt, DateTime UpdatedAt);
    public record TeamStatsDto(int TotalDeals, int ActiveDeals, int CompletedThisMonth, int MemberCount);
    public record AssignDealRequest(Guid AssignToAgentId);

    // GET /api/organization
    [HttpGet]
    public async Task<ActionResult<OrganizationDto>> GetOrganization()
    {
        var org = await _orgContext.GetCurrentOrganizationAsync();
        if (org == null) return NotFound(new { error = "Organization not found" });

        var memberCount = await _context.OrganizationMembers.CountAsync(m => m.OrganizationId == org.Id);
        return Ok(new OrganizationDto(org.Id, org.Name, org.BrandColor, org.LogoUrl, org.SubscriptionStatus.ToString(), memberCount));
    }

    // PUT /api/organization
    [HttpPut]
    [RequireAdmin]
    public async Task<ActionResult<OrganizationDto>> UpdateOrganization([FromBody] UpdateOrganizationRequest request)
    {
        var org = await _orgContext.GetCurrentOrganizationAsync();
        if (org == null) return NotFound(new { error = "Organization not found" });

        if (request.Name != null) org.Name = request.Name;
        if (request.BrandColor != null) org.BrandColor = request.BrandColor;
        if (request.LogoUrl != null) org.LogoUrl = request.LogoUrl;
        org.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var memberCount = await _context.OrganizationMembers.CountAsync(m => m.OrganizationId == org.Id);
        return Ok(new OrganizationDto(org.Id, org.Name, org.BrandColor, org.LogoUrl, org.SubscriptionStatus.ToString(), memberCount));
    }

    // GET /api/organization/members
    [HttpGet("members")]
    public async Task<ActionResult<List<MemberDto>>> GetMembers()
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var members = await _context.OrganizationMembers.Include(m => m.Agent).Where(m => m.OrganizationId == orgId).ToListAsync();

        var memberDtos = new List<MemberDto>();
        foreach (var member in members)
        {
            var activeDeals = await _context.Deals.CountAsync(d => d.OrganizationId == orgId && d.AssignedToAgentId == member.AgentId && d.Status == DealStatus.Active);
            memberDtos.Add(new MemberDto(member.AgentId, member.Agent.Email, member.Agent.FullName, member.Agent.PhotoUrl, member.Role.ToString(), activeDeals, member.JoinedAt));
        }
        return Ok(memberDtos);
    }

    // PUT /api/organization/members/{agentId}/role
    [HttpPut("members/{agentId:guid}/role")]
    [RequireAdmin]
    public async Task<ActionResult> ChangeMemberRole(Guid agentId, [FromBody] ChangeMemberRoleRequest request)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var currentAgentId = _orgContext.GetCurrentAgentId();

        if (agentId == currentAgentId) return BadRequest(new { error = "Cannot change your own role" });

        var member = await _context.OrganizationMembers.FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.AgentId == agentId);
        if (member == null) return NotFound(new { error = "Member not found" });
        if (member.Role == Role.Admin) return BadRequest(new { error = "Cannot change admin role. Use transfer-admin instead." });
        if (!Enum.TryParse<Role>(request.Role, true, out var newRole)) return BadRequest(new { error = "Invalid role" });
        if (newRole == Role.Admin) return BadRequest(new { error = "Cannot promote to admin. Use transfer-admin instead." });

        member.Role = newRole;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Role updated" });
    }

    // DELETE /api/organization/members/{agentId}
    [HttpDelete("members/{agentId:guid}")]
    [RequireAdmin]
    public async Task<ActionResult> RemoveMember(Guid agentId)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var currentAgentId = _orgContext.GetCurrentAgentId();

        if (agentId == currentAgentId) return BadRequest(new { error = "Cannot remove yourself from the organization" });

        var member = await _context.OrganizationMembers.FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.AgentId == agentId);
        if (member == null) return NotFound(new { error = "Member not found" });
        if (member.Role == Role.Admin) return BadRequest(new { error = "Cannot remove the admin" });

        // Reassign deals to admin
        var adminMember = await _context.OrganizationMembers.FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.Role == Role.Admin);
        if (adminMember != null)
        {
            var memberDeals = await _context.Deals.Where(d => d.OrganizationId == orgId && d.AssignedToAgentId == agentId).ToListAsync();
            foreach (var deal in memberDeals)
            {
                deal.AssignedToAgentId = adminMember.AgentId;
                deal.UpdatedAt = DateTime.UtcNow;
            }
        }

        // Remove Stripe seat
        var org = await _context.Organizations.FindAsync(orgId);
        if (org != null) await RemoveStripeSeat(org);

        _context.OrganizationMembers.Remove(member);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Member removed and deals reassigned to admin" });
    }

    // POST /api/organization/transfer-admin
    [HttpPost("transfer-admin")]
    [RequireAdmin]
    public async Task<ActionResult> TransferAdmin([FromBody] TransferAdminRequest request)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var currentAgentId = _orgContext.GetCurrentAgentId();

        if (request.NewAdminAgentId == currentAgentId) return BadRequest(new { error = "Already admin" });

        var currentAdmin = await _context.OrganizationMembers.FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.AgentId == currentAgentId);
        var newAdmin = await _context.OrganizationMembers.FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.AgentId == request.NewAdminAgentId);

        if (newAdmin == null) return NotFound(new { error = "Member not found" });

        currentAdmin!.Role = Role.TeamLead;
        newAdmin.Role = Role.Admin;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Admin role transferred" });
    }

    // GET /api/organization/invitations
    [HttpGet("invitations")]
    [RequireAdmin]
    public async Task<ActionResult<List<InvitationDto>>> GetInvitations()
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var invitations = await _context.Invitations
            .Where(i => i.OrganizationId == orgId && i.AcceptedAt == null && i.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(i => i.CreatedAt).ToListAsync();

        return Ok(invitations.Select(i => new InvitationDto(i.Id, i.Email, i.Role.ToString(), i.CreatedAt, i.ExpiresAt)));
    }

    // POST /api/organization/invite
    [HttpPost("invite")]
    [RequireAdmin]
    public async Task<ActionResult<InvitationDto>> InviteMember([FromBody] CreateInvitationRequest request)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var org = await _orgContext.GetCurrentOrganizationAsync();
        if (org == null) return NotFound(new { error = "Organization not found" });

        var existingMember = await _context.OrganizationMembers.Include(m => m.Agent).FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.Agent.Email == request.Email);
        if (existingMember != null) return BadRequest(new { error = "This email is already a member of your organization" });

        var existingInvite = await _context.Invitations.FirstOrDefaultAsync(i => i.OrganizationId == orgId && i.Email == request.Email && i.AcceptedAt == null && i.ExpiresAt > DateTime.UtcNow);
        if (existingInvite != null) return BadRequest(new { error = "An invitation is already pending for this email" });

        if (!Enum.TryParse<Role>(request.Role, true, out var role)) return BadRequest(new { error = "Invalid role" });
        if (role == Role.Admin) return BadRequest(new { error = "Cannot invite as admin" });

        if (org.SubscriptionStatus != SubscriptionStatus.Active) return BadRequest(new { error = "Subscription required to invite team members" });

        // Add Stripe seat
        if (!await AddStripeSeat(org)) return BadRequest(new { error = "Failed to add seat to subscription" });

        var invitation = new Invitation
        {
            OrganizationId = orgId,
            Email = request.Email,
            Role = role,
            Token = GenerateInviteToken(),
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _context.Invitations.Add(invitation);
        await _context.SaveChangesAsync();

        // Send email
        var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:3000";
        var inviteUrl = $"{frontendUrl}/invite/{invitation.Token}";
        await _emailService.SendInvitationEmailAsync(request.Email, org.Name, role.ToString(), inviteUrl);

        return CreatedAtAction(nameof(GetInvitations), new InvitationDto(invitation.Id, invitation.Email, invitation.Role.ToString(), invitation.CreatedAt, invitation.ExpiresAt));
    }

    // DELETE /api/organization/invitations/{id}
    [HttpDelete("invitations/{id:guid}")]
    [RequireAdmin]
    public async Task<ActionResult> CancelInvitation(Guid id)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var invitation = await _context.Invitations.FirstOrDefaultAsync(i => i.Id == id && i.OrganizationId == orgId);
        if (invitation == null) return NotFound(new { error = "Invitation not found" });
        if (invitation.AcceptedAt != null) return BadRequest(new { error = "Invitation already accepted" });

        var org = await _context.Organizations.FindAsync(orgId);
        if (org != null) await RemoveStripeSeat(org);

        _context.Invitations.Remove(invitation);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Invitation cancelled" });
    }

    // GET /api/organization/deals
    [HttpGet("deals")]
    [RequireTeamLeadOrAbove]
    public async Task<ActionResult<List<TeamDealDto>>> GetTeamDeals([FromQuery] Guid? assignedTo, [FromQuery] string? status)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var query = _context.Deals.Include(d => d.AssignedToAgent).Where(d => d.OrganizationId == orgId);

        if (assignedTo.HasValue) query = query.Where(d => d.AssignedToAgentId == assignedTo.Value);
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<DealStatus>(status, true, out var dealStatus)) query = query.Where(d => d.Status == dealStatus);

        var deals = await query.OrderByDescending(d => d.UpdatedAt).ToListAsync();
        return Ok(deals.Select(d => new TeamDealDto(d.Id, d.ClientName, d.PropertyAddress, d.Status.ToString(), d.AssignedToAgentId, d.AssignedToAgent?.FullName, d.AssignedToAgent?.PhotoUrl, d.CreatedAt, d.UpdatedAt)));
    }

    // GET /api/organization/stats
    [HttpGet("stats")]
    [RequireTeamLeadOrAbove]
    public async Task<ActionResult<TeamStatsDto>> GetTeamStats()
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var totalDeals = await _context.Deals.CountAsync(d => d.OrganizationId == orgId);
        var activeDeals = await _context.Deals.CountAsync(d => d.OrganizationId == orgId && d.Status == DealStatus.Active);
        var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var completedThisMonth = await _context.Deals.CountAsync(d => d.OrganizationId == orgId && d.Status == DealStatus.Completed && d.UpdatedAt >= startOfMonth);
        var memberCount = await _context.OrganizationMembers.CountAsync(m => m.OrganizationId == orgId);

        return Ok(new TeamStatsDto(totalDeals, activeDeals, completedThisMonth, memberCount));
    }

    // PUT /api/organization/deals/{dealId}/assign
    [HttpPut("deals/{dealId:guid}/assign")]
    [RequireTeamLeadOrAbove]
    public async Task<ActionResult> AssignDeal(Guid dealId, [FromBody] AssignDealRequest request)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var deal = await _context.Deals.FirstOrDefaultAsync(d => d.Id == dealId && d.OrganizationId == orgId);
        if (deal == null) return NotFound(new { error = "Deal not found" });

        var member = await _context.OrganizationMembers.FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.AgentId == request.AssignToAgentId);
        if (member == null) return BadRequest(new { error = "Agent is not a member of this organization" });

        deal.AssignedToAgentId = request.AssignToAgentId;
        deal.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Deal assigned" });
    }

    // Helper methods
    private static string GenerateInviteToken()
    {
        var bytes = new byte[32];
        using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
    }

    private async Task<bool> AddStripeSeat(Organization org)
    {
        var stripeSecretKey = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY");
        var stripeSeatPriceId = Environment.GetEnvironmentVariable("STRIPE_SEAT_PRICE_ID");

        if (string.IsNullOrEmpty(stripeSecretKey) || string.IsNullOrEmpty(stripeSeatPriceId))
            return true; // Skip if Stripe not configured

        StripeConfiguration.ApiKey = stripeSecretKey;

        // If organization doesn't have Stripe data, sync from admin agent's Stripe customer
        if (string.IsNullOrEmpty(org.StripeSubscriptionId))
        {
            var adminMember = await _context.OrganizationMembers
                .Include(m => m.Agent)
                .FirstOrDefaultAsync(m => m.OrganizationId == org.Id && m.Role == Role.Admin);

            var customerId = adminMember?.Agent?.StripeCustomerId;
            if (!string.IsNullOrEmpty(customerId))
            {
                // Fetch subscription from Stripe using customer ID
                var subscriptionService = new SubscriptionService();
                var subscriptions = await subscriptionService.ListAsync(new SubscriptionListOptions
                {
                    Customer = customerId,
                    Limit = 1
                });

                if (subscriptions.Data.Count > 0)
                {
                    org.StripeSubscriptionId = subscriptions.Data[0].Id;
                    org.StripeCustomerId = customerId;
                    await _context.SaveChangesAsync();
                }
                else
                {
                    return true; // Customer has no active subscription
                }
            }
            else
            {
                return true; // No Stripe customer to add seat to
            }
        }

        try
        {
            StripeConfiguration.ApiKey = stripeSecretKey;
            var subscriptionService = new SubscriptionService();
            var subscription = await subscriptionService.GetAsync(org.StripeSubscriptionId);
            var seatItem = subscription.Items.Data.FirstOrDefault(i => i.Price.Id == stripeSeatPriceId);

            if (seatItem != null)
            {
                var itemService = new SubscriptionItemService();
                await itemService.UpdateAsync(seatItem.Id, new SubscriptionItemUpdateOptions { Quantity = seatItem.Quantity + 1 });
                org.StripeSeatItemId = seatItem.Id;
            }
            else
            {
                var itemService = new SubscriptionItemService();
                var newItem = await itemService.CreateAsync(new SubscriptionItemCreateOptions { Subscription = org.StripeSubscriptionId, Price = stripeSeatPriceId, Quantity = 1 });
                org.StripeSeatItemId = newItem.Id;
            }
            await _context.SaveChangesAsync();
            return true;
        }
        catch (StripeException)
        {
            return false;
        }
    }

    private async Task RemoveStripeSeat(Organization org)
    {
        var stripeSecretKey = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY");
        var stripeSeatPriceId = Environment.GetEnvironmentVariable("STRIPE_SEAT_PRICE_ID");

        if (string.IsNullOrEmpty(stripeSecretKey) || string.IsNullOrEmpty(stripeSeatPriceId))
            return;

        StripeConfiguration.ApiKey = stripeSecretKey;

        // If organization doesn't have Stripe data, sync from admin agent's Stripe customer
        if (string.IsNullOrEmpty(org.StripeSubscriptionId))
        {
            var adminMember = await _context.OrganizationMembers
                .Include(m => m.Agent)
                .FirstOrDefaultAsync(m => m.OrganizationId == org.Id && m.Role == Role.Admin);

            var customerId = adminMember?.Agent?.StripeCustomerId;
            if (!string.IsNullOrEmpty(customerId))
            {
                // Fetch subscription from Stripe using customer ID
                var subscriptionService = new SubscriptionService();
                var subscriptions = await subscriptionService.ListAsync(new SubscriptionListOptions
                {
                    Customer = customerId,
                    Limit = 1
                });

                if (subscriptions.Data.Count > 0)
                {
                    org.StripeSubscriptionId = subscriptions.Data[0].Id;
                    org.StripeCustomerId = customerId;
                    await _context.SaveChangesAsync();
                }
                else
                {
                    return; // Customer has no active subscription
                }
            }
            else
            {
                return; // No Stripe customer to remove seat from
            }
        }

        try
        {
            var subscriptionService = new SubscriptionService();
            var subscription = await subscriptionService.GetAsync(org.StripeSubscriptionId);
            var seatItem = subscription.Items.Data.FirstOrDefault(i => i.Price.Id == stripeSeatPriceId);

            if (seatItem != null && seatItem.Quantity > 0)
            {
                var itemService = new SubscriptionItemService();
                if (seatItem.Quantity <= 1)
                    await itemService.DeleteAsync(seatItem.Id);
                else
                    await itemService.UpdateAsync(seatItem.Id, new SubscriptionItemUpdateOptions { Quantity = seatItem.Quantity - 1 });
            }
        }
        catch (StripeException) { /* Log but don't fail */ }
    }
}
