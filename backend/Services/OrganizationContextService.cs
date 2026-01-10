using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;
using EstateFlow.Api.Data.Entities;

namespace EstateFlow.Api.Services;

public interface IOrganizationContextService
{
    Guid GetCurrentAgentId();
    Guid GetCurrentOrganizationId();
    Role GetCurrentRole();
    Task<OrganizationMember?> GetCurrentMembershipAsync();
    Task<Organization?> GetCurrentOrganizationAsync();
    bool IsAdmin();
    bool IsTeamLeadOrAbove();
}

public class OrganizationContextService : IOrganizationContextService
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly EstateFlowDbContext _context;

    public OrganizationContextService(IHttpContextAccessor httpContextAccessor, EstateFlowDbContext context)
    {
        _httpContextAccessor = httpContextAccessor;
        _context = context;
    }

    public Guid GetCurrentAgentId()
    {
        var claim = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null ? Guid.Parse(claim.Value) : Guid.Empty;
    }

    public Guid GetCurrentOrganizationId()
    {
        var claim = _httpContextAccessor.HttpContext?.User.FindFirst("org_id");
        return claim != null ? Guid.Parse(claim.Value) : Guid.Empty;
    }

    public Role GetCurrentRole()
    {
        var claim = _httpContextAccessor.HttpContext?.User.FindFirst("role");
        if (claim != null && Enum.TryParse<Role>(claim.Value, out var role))
        {
            return role;
        }
        return Role.Employee;
    }

    public async Task<OrganizationMember?> GetCurrentMembershipAsync()
    {
        var agentId = GetCurrentAgentId();
        var orgId = GetCurrentOrganizationId();

        if (agentId == Guid.Empty || orgId == Guid.Empty)
            return null;

        return await _context.OrganizationMembers
            .Include(m => m.Organization)
            .Include(m => m.Agent)
            .FirstOrDefaultAsync(m => m.AgentId == agentId && m.OrganizationId == orgId);
    }

    public async Task<Organization?> GetCurrentOrganizationAsync()
    {
        var orgId = GetCurrentOrganizationId();
        if (orgId == Guid.Empty)
            return null;

        return await _context.Organizations.FindAsync(orgId);
    }

    public bool IsAdmin()
    {
        return GetCurrentRole() == Role.Admin;
    }

    public bool IsTeamLeadOrAbove()
    {
        var role = GetCurrentRole();
        return role == Role.Admin || role == Role.TeamLead;
    }
}
