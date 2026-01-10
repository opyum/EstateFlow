using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;
using EstateFlow.Api.Data.Entities;

namespace EstateFlow.Api.Services;

public interface IMigrationService
{
    Task MigrateAgentsToOrganizationsAsync();
}

public class MigrationService : IMigrationService
{
    private readonly EstateFlowDbContext _context;
    private readonly ILogger<MigrationService> _logger;

    public MigrationService(EstateFlowDbContext context, ILogger<MigrationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task MigrateAgentsToOrganizationsAsync()
    {
        // Check if migration already done
        var hasOrganizations = await _context.Organizations.AnyAsync();
        if (hasOrganizations)
        {
            _logger.LogInformation("Migration already completed, skipping");
            return;
        }

        _logger.LogInformation("Starting agent to organization migration");

        var agents = await _context.Agents
            .Include(a => a.Deals)
            .ToListAsync();

        foreach (var agent in agents)
        {
            // Create organization for each agent
            var org = new Organization
            {
                Id = Guid.NewGuid(),
                Name = $"{agent.FullName ?? agent.Email}'s Agency",
                BrandColor = agent.BrandColor,
                LogoUrl = agent.LogoUrl,
                SubscriptionStatus = agent.SubscriptionStatus,
                StripeCustomerId = agent.StripeCustomerId,
                StripeSubscriptionId = agent.StripeSubscriptionId,
                CreatedAt = agent.CreatedAt
            };

            _context.Organizations.Add(org);

            // Create admin membership
            var membership = new OrganizationMember
            {
                OrganizationId = org.Id,
                AgentId = agent.Id,
                Role = Role.Admin,
                JoinedAt = agent.CreatedAt
            };

            _context.OrganizationMembers.Add(membership);

            // Migrate deals
            foreach (var deal in agent.Deals)
            {
                deal.OrganizationId = org.Id;
                deal.AssignedToAgentId = agent.Id;
                deal.CreatedByAgentId = agent.Id;
            }

            _logger.LogInformation("Migrated agent {Email} to organization {OrgName}",
                agent.Email, org.Name);
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Migration completed: {Count} agents migrated", agents.Count);
    }
}
