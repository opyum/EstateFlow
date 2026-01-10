# Multi-Tenant Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-tenant capabilities allowing agencies to invite team members with role-based permissions and seat-based billing.

**Architecture:** Organization entity owns Deals and Stripe subscription. Agents belong to Organizations via OrganizationMember with Role. JWT includes org_id and role for authorization.

**Tech Stack:** .NET 8, EF Core, PostgreSQL, Stripe API, Next.js 14, TypeScript

---

## Phase 1: Database Entities

### Task 1.1: Create Role Enum

**Files:**
- Create: `backend/Data/Entities/Role.cs`

**Step 1: Create the Role enum file**

```csharp
namespace EstateFlow.Api.Data.Entities;

public enum Role
{
    Admin,
    TeamLead,
    Employee
}
```

**Step 2: Verify file compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add backend/Data/Entities/Role.cs
git commit -m "feat: add Role enum for multi-tenant permissions"
```

---

### Task 1.2: Create Organization Entity

**Files:**
- Create: `backend/Data/Entities/Organization.cs`

**Step 1: Create Organization entity**

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstateFlow.Api.Data.Entities;

[Table("organizations")]
public class Organization
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("name")]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [Column("brand_color")]
    [MaxLength(7)]
    public string BrandColor { get; set; } = "#1a1a2e";

    [Column("logo_url")]
    [MaxLength(500)]
    public string? LogoUrl { get; set; }

    [Column("subscription_status")]
    public SubscriptionStatus SubscriptionStatus { get; set; } = SubscriptionStatus.Trial;

    [Column("stripe_customer_id")]
    [MaxLength(255)]
    public string? StripeCustomerId { get; set; }

    [Column("stripe_subscription_id")]
    [MaxLength(255)]
    public string? StripeSubscriptionId { get; set; }

    [Column("stripe_seat_item_id")]
    [MaxLength(255)]
    public string? StripeSeatItemId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<OrganizationMember> Members { get; set; } = new List<OrganizationMember>();
    public ICollection<Deal> Deals { get; set; } = new List<Deal>();
    public ICollection<Invitation> Invitations { get; set; } = new List<Invitation>();
}
```

**Step 2: Verify file compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeded (with warnings about missing types - expected)

**Step 3: Commit**

```bash
git add backend/Data/Entities/Organization.cs
git commit -m "feat: add Organization entity"
```

---

### Task 1.3: Create OrganizationMember Entity

**Files:**
- Create: `backend/Data/Entities/OrganizationMember.cs`

**Step 1: Create OrganizationMember entity**

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstateFlow.Api.Data.Entities;

[Table("organization_members")]
public class OrganizationMember
{
    [Column("organization_id")]
    public Guid OrganizationId { get; set; }

    [ForeignKey("OrganizationId")]
    public Organization Organization { get; set; } = null!;

    [Column("agent_id")]
    public Guid AgentId { get; set; }

    [ForeignKey("AgentId")]
    public Agent Agent { get; set; } = null!;

    [Column("role")]
    public Role Role { get; set; } = Role.Employee;

    [Column("joined_at")]
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
```

**Step 2: Verify file compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add backend/Data/Entities/OrganizationMember.cs
git commit -m "feat: add OrganizationMember join entity"
```

---

### Task 1.4: Create Invitation Entity

**Files:**
- Create: `backend/Data/Entities/Invitation.cs`

**Step 1: Create Invitation entity**

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstateFlow.Api.Data.Entities;

[Table("invitations")]
public class Invitation
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("organization_id")]
    public Guid OrganizationId { get; set; }

    [ForeignKey("OrganizationId")]
    public Organization Organization { get; set; } = null!;

    [Required]
    [Column("email")]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Column("role")]
    public Role Role { get; set; } = Role.Employee;

    [Required]
    [Column("token")]
    [MaxLength(64)]
    public string Token { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("expires_at")]
    public DateTime ExpiresAt { get; set; }

    [Column("accepted_at")]
    public DateTime? AcceptedAt { get; set; }
}
```

**Step 2: Verify file compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add backend/Data/Entities/Invitation.cs
git commit -m "feat: add Invitation entity for team invites"
```

---

### Task 1.5: Update Agent Entity

**Files:**
- Modify: `backend/Data/Entities/Agent.cs`

**Step 1: Add OrganizationMemberships navigation and remove migrated fields**

Replace the Agent class with:

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstateFlow.Api.Data.Entities;

public enum SubscriptionStatus
{
    Trial,
    Active,
    Cancelled,
    Expired
}

[Table("agents")]
public class Agent
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("email")]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Column("full_name")]
    [MaxLength(255)]
    public string? FullName { get; set; }

    [Column("phone")]
    [MaxLength(50)]
    public string? Phone { get; set; }

    [Column("photo_url")]
    [MaxLength(500)]
    public string? PhotoUrl { get; set; }

    // DEPRECATED: Kept for migration, will be removed after migration
    [Column("brand_color")]
    [MaxLength(7)]
    public string BrandColor { get; set; } = "#1a1a2e";

    [Column("logo_url")]
    [MaxLength(500)]
    public string? LogoUrl { get; set; }

    [Column("social_links", TypeName = "jsonb")]
    public string? SocialLinks { get; set; }

    [Column("subscription_status")]
    public SubscriptionStatus SubscriptionStatus { get; set; } = SubscriptionStatus.Trial;

    [Column("stripe_customer_id")]
    [MaxLength(255)]
    public string? StripeCustomerId { get; set; }

    [Column("stripe_subscription_id")]
    [MaxLength(255)]
    public string? StripeSubscriptionId { get; set; }
    // END DEPRECATED

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<OrganizationMember> OrganizationMemberships { get; set; } = new List<OrganizationMember>();
    public ICollection<Deal> Deals { get; set; } = new List<Deal>();
    public ICollection<MagicLink> MagicLinks { get; set; } = new List<MagicLink>();
}
```

**Step 2: Verify file compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add backend/Data/Entities/Agent.cs
git commit -m "feat: add OrganizationMemberships to Agent entity"
```

---

### Task 1.6: Update Deal Entity

**Files:**
- Modify: `backend/Data/Entities/Deal.cs`

**Step 1: Add OrganizationId, rename AgentId to AssignedToAgentId, add CreatedByAgentId**

Replace the Deal class with:

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstateFlow.Api.Data.Entities;

public enum DealStatus
{
    Active,
    Completed,
    Archived
}

[Table("deals")]
public class Deal
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("organization_id")]
    public Guid OrganizationId { get; set; }

    [ForeignKey("OrganizationId")]
    public Organization Organization { get; set; } = null!;

    // Keep AgentId for backward compatibility during migration
    [Column("agent_id")]
    public Guid AgentId { get; set; }

    [Column("assigned_to_agent_id")]
    public Guid? AssignedToAgentId { get; set; }

    [ForeignKey("AssignedToAgentId")]
    public Agent? AssignedToAgent { get; set; }

    [Column("created_by_agent_id")]
    public Guid? CreatedByAgentId { get; set; }

    [ForeignKey("CreatedByAgentId")]
    public Agent? CreatedByAgent { get; set; }

    [Required]
    [Column("client_name")]
    [MaxLength(255)]
    public string ClientName { get; set; } = string.Empty;

    [Required]
    [Column("client_email")]
    [MaxLength(255)]
    public string ClientEmail { get; set; } = string.Empty;

    [Required]
    [Column("property_address")]
    [MaxLength(500)]
    public string PropertyAddress { get; set; } = string.Empty;

    [Column("property_photo_url")]
    [MaxLength(500)]
    public string? PropertyPhotoUrl { get; set; }

    [Column("welcome_message")]
    public string? WelcomeMessage { get; set; }

    [Column("status")]
    public DealStatus Status { get; set; } = DealStatus.Active;

    [Required]
    [Column("access_token")]
    [MaxLength(64)]
    public string AccessToken { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation - keep Agent for backward compatibility
    [ForeignKey("AgentId")]
    public Agent Agent { get; set; } = null!;

    public ICollection<TimelineStep> TimelineSteps { get; set; } = new List<TimelineStep>();
    public ICollection<Document> Documents { get; set; } = new List<Document>();
}
```

**Step 2: Verify file compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add backend/Data/Entities/Deal.cs
git commit -m "feat: add Organization and assignment fields to Deal entity"
```

---

### Task 1.7: Update DbContext

**Files:**
- Modify: `backend/Data/EstateFlowDbContext.cs`

**Step 1: Add new DbSets and configure relationships**

Add these DbSet properties after line 17:

```csharp
public DbSet<Organization> Organizations => Set<Organization>();
public DbSet<OrganizationMember> OrganizationMembers => Set<OrganizationMember>();
public DbSet<Invitation> Invitations => Set<Invitation>();
```

**Step 2: Add entity configurations in OnModelCreating**

Add before the `SeedTimelineTemplates` call (around line 100):

```csharp
// Organization
modelBuilder.Entity<Organization>(entity =>
{
    entity.Property(e => e.SubscriptionStatus)
          .HasConversion<string>();
});

// OrganizationMember (composite key)
modelBuilder.Entity<OrganizationMember>(entity =>
{
    entity.HasKey(e => new { e.OrganizationId, e.AgentId });

    entity.Property(e => e.Role)
          .HasConversion<string>();

    entity.HasOne(e => e.Organization)
          .WithMany(o => o.Members)
          .HasForeignKey(e => e.OrganizationId)
          .OnDelete(DeleteBehavior.Cascade);

    entity.HasOne(e => e.Agent)
          .WithMany(a => a.OrganizationMemberships)
          .HasForeignKey(e => e.AgentId)
          .OnDelete(DeleteBehavior.Cascade);
});

// Invitation
modelBuilder.Entity<Invitation>(entity =>
{
    entity.HasIndex(e => e.Token).IsUnique();
    entity.HasIndex(e => new { e.OrganizationId, e.Email });

    entity.Property(e => e.Role)
          .HasConversion<string>();

    entity.HasOne(e => e.Organization)
          .WithMany(o => o.Invitations)
          .HasForeignKey(e => e.OrganizationId)
          .OnDelete(DeleteBehavior.Cascade);
});

// Deal - add Organization relationship
modelBuilder.Entity<Deal>(entity =>
{
    entity.HasOne(d => d.Organization)
          .WithMany(o => o.Deals)
          .HasForeignKey(d => d.OrganizationId)
          .OnDelete(DeleteBehavior.Cascade);

    entity.HasOne(d => d.AssignedToAgent)
          .WithMany()
          .HasForeignKey(d => d.AssignedToAgentId)
          .OnDelete(DeleteBehavior.SetNull);

    entity.HasOne(d => d.CreatedByAgent)
          .WithMany()
          .HasForeignKey(d => d.CreatedByAgentId)
          .OnDelete(DeleteBehavior.SetNull);
});
```

**Step 3: Verify file compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 4: Commit**

```bash
git add backend/Data/EstateFlowDbContext.cs
git commit -m "feat: configure multi-tenant entity relationships in DbContext"
```

---

### Task 1.8: Create Migration Script Service

**Files:**
- Create: `backend/Services/MigrationService.cs`

**Step 1: Create migration service**

```csharp
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
```

**Step 2: Verify file compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add backend/Services/MigrationService.cs
git commit -m "feat: add MigrationService for agent-to-organization migration"
```

---

### Task 1.9: Register Migration Service and Run on Startup

**Files:**
- Modify: `backend/Program.cs`

**Step 1: Register MigrationService**

Add after other service registrations (around line 40):

```csharp
builder.Services.AddScoped<IMigrationService, MigrationService>();
```

**Step 2: Run migration on startup**

Add after `app.MapControllers();` (before `app.Run();`):

```csharp
// Run data migration
using (var scope = app.Services.CreateScope())
{
    var migrationService = scope.ServiceProvider.GetRequiredService<IMigrationService>();
    await migrationService.MigrateAgentsToOrganizationsAsync();
}
```

**Step 3: Make Main async if not already**

Ensure the Main method signature is:
```csharp
public static async Task Main(string[] args)
```

And change `app.Run()` to `await app.RunAsync()`.

**Step 4: Verify application starts**

Run: `cd backend && dotnet run`
Expected: Application starts, migration runs (check logs)

**Step 5: Commit**

```bash
git add backend/Program.cs
git commit -m "feat: register MigrationService and run on startup"
```

---

## Phase 2: Backend Authorization

### Task 2.1: Create Organization Context Service

**Files:**
- Create: `backend/Services/OrganizationContextService.cs`

**Step 1: Create service to manage current org context**

```csharp
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
```

**Step 2: Register service in Program.cs**

Add after other service registrations:

```csharp
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IOrganizationContextService, OrganizationContextService>();
```

**Step 3: Verify file compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 4: Commit**

```bash
git add backend/Services/OrganizationContextService.cs backend/Program.cs
git commit -m "feat: add OrganizationContextService for multi-tenant context"
```

---

### Task 2.2: Update AuthService for Multi-Tenant JWT

**Files:**
- Modify: `backend/Services/AuthService.cs`

**Step 1: Update GenerateJwtToken to include org_id and role**

Replace the `GenerateJwtToken` method:

```csharp
public string GenerateJwtToken(Guid agentId, string email, Guid? organizationId = null, Role? role = null)
{
    var claims = new List<Claim>
    {
        new Claim(ClaimTypes.NameIdentifier, agentId.ToString()),
        new Claim(ClaimTypes.Email, email),
        new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
    };

    if (organizationId.HasValue)
    {
        claims.Add(new Claim("org_id", organizationId.Value.ToString()));
    }

    if (role.HasValue)
    {
        claims.Add(new Claim("role", role.Value.ToString()));
        claims.Add(new Claim(ClaimTypes.Role, role.Value.ToString()));
    }

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
```

**Step 2: Update ValidateMagicLinkAsync to include org context**

Replace the method:

```csharp
public async Task<string?> ValidateMagicLinkAsync(string token)
{
    var magicLink = await _context.MagicLinks
        .Include(m => m.Agent)
            .ThenInclude(a => a.OrganizationMemberships)
        .FirstOrDefaultAsync(m => m.Token == token && m.UsedAt == null && m.ExpiresAt > DateTime.UtcNow);

    if (magicLink == null)
        return null;

    // Mark as used
    magicLink.UsedAt = DateTime.UtcNow;
    await _context.SaveChangesAsync();

    // Get first organization membership (or null if none)
    var membership = magicLink.Agent.OrganizationMemberships.FirstOrDefault();

    return GenerateJwtToken(
        magicLink.Agent.Id,
        magicLink.Agent.Email,
        membership?.OrganizationId,
        membership?.Role
    );
}
```

**Step 3: Update IAuthService interface**

Update the interface definition (create if not exists, or update):

```csharp
public interface IAuthService
{
    Task<string> GenerateMagicLinkAsync(string email);
    Task<string?> ValidateMagicLinkAsync(string token);
    string GenerateJwtToken(Guid agentId, string email, Guid? organizationId = null, Role? role = null);
    string GenerateAccessToken();
}
```

**Step 4: Add using for Role enum at top of file**

Ensure this using exists:
```csharp
using EstateFlow.Api.Data.Entities;
```

**Step 5: Verify file compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 6: Commit**

```bash
git add backend/Services/AuthService.cs
git commit -m "feat: update AuthService to include org context in JWT"
```

---

### Task 2.3: Create Role-Based Authorization Attributes

**Files:**
- Create: `backend/Authorization/RoleRequirement.cs`

**Step 1: Create custom authorization attributes**

```csharp
using Microsoft.AspNetCore.Authorization;
using EstateFlow.Api.Data.Entities;

namespace EstateFlow.Api.Authorization;

public class RequireAdminAttribute : AuthorizeAttribute
{
    public RequireAdminAttribute()
    {
        Roles = "Admin";
    }
}

public class RequireTeamLeadOrAboveAttribute : AuthorizeAttribute
{
    public RequireTeamLeadOrAboveAttribute()
    {
        Roles = "Admin,TeamLead";
    }
}
```

**Step 2: Verify file compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add backend/Authorization/RoleRequirement.cs
git commit -m "feat: add role-based authorization attributes"
```

---

## Phase 3: Organization API Endpoints

### Task 3.1: Create OrganizationController

**Files:**
- Create: `backend/Controllers/OrganizationController.cs`

**Step 1: Create the controller with basic endpoints**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;
using EstateFlow.Api.Data.Entities;
using EstateFlow.Api.Services;
using EstateFlow.Api.Authorization;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrganizationController : ControllerBase
{
    private readonly EstateFlowDbContext _context;
    private readonly IOrganizationContextService _orgContext;

    public OrganizationController(EstateFlowDbContext context, IOrganizationContextService orgContext)
    {
        _context = context;
        _orgContext = orgContext;
    }

    public record OrganizationDto(
        Guid Id,
        string Name,
        string BrandColor,
        string? LogoUrl,
        string SubscriptionStatus,
        int MemberCount
    );

    public record UpdateOrganizationRequest(
        string? Name,
        string? BrandColor,
        string? LogoUrl
    );

    [HttpGet]
    public async Task<ActionResult<OrganizationDto>> GetOrganization()
    {
        var org = await _orgContext.GetCurrentOrganizationAsync();
        if (org == null)
            return NotFound(new { error = "Organization not found" });

        var memberCount = await _context.OrganizationMembers
            .CountAsync(m => m.OrganizationId == org.Id);

        return Ok(new OrganizationDto(
            org.Id,
            org.Name,
            org.BrandColor,
            org.LogoUrl,
            org.SubscriptionStatus.ToString(),
            memberCount
        ));
    }

    [HttpPut]
    [RequireAdmin]
    public async Task<ActionResult<OrganizationDto>> UpdateOrganization([FromBody] UpdateOrganizationRequest request)
    {
        var org = await _orgContext.GetCurrentOrganizationAsync();
        if (org == null)
            return NotFound(new { error = "Organization not found" });

        if (request.Name != null) org.Name = request.Name;
        if (request.BrandColor != null) org.BrandColor = request.BrandColor;
        if (request.LogoUrl != null) org.LogoUrl = request.LogoUrl;

        org.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var memberCount = await _context.OrganizationMembers
            .CountAsync(m => m.OrganizationId == org.Id);

        return Ok(new OrganizationDto(
            org.Id,
            org.Name,
            org.BrandColor,
            org.LogoUrl,
            org.SubscriptionStatus.ToString(),
            memberCount
        ));
    }
}
```

**Step 2: Verify file compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add backend/Controllers/OrganizationController.cs
git commit -m "feat: add OrganizationController with get/update endpoints"
```

---

### Task 3.2: Add Members Endpoints to OrganizationController

**Files:**
- Modify: `backend/Controllers/OrganizationController.cs`

**Step 1: Add member-related DTOs and endpoints**

Add these after the UpdateOrganization endpoint:

```csharp
public record MemberDto(
    Guid AgentId,
    string Email,
    string? FullName,
    string? PhotoUrl,
    string Role,
    int ActiveDeals,
    DateTime JoinedAt
);

public record ChangeMemberRoleRequest(string Role);

[HttpGet("members")]
public async Task<ActionResult<List<MemberDto>>> GetMembers()
{
    var orgId = _orgContext.GetCurrentOrganizationId();

    var members = await _context.OrganizationMembers
        .Include(m => m.Agent)
        .Where(m => m.OrganizationId == orgId)
        .ToListAsync();

    var memberDtos = new List<MemberDto>();
    foreach (var member in members)
    {
        var activeDeals = await _context.Deals
            .CountAsync(d => d.OrganizationId == orgId && d.AssignedToAgentId == member.AgentId && d.Status == DealStatus.Active);

        memberDtos.Add(new MemberDto(
            member.AgentId,
            member.Agent.Email,
            member.Agent.FullName,
            member.Agent.PhotoUrl,
            member.Role.ToString(),
            activeDeals,
            member.JoinedAt
        ));
    }

    return Ok(memberDtos);
}

[HttpPut("members/{agentId:guid}/role")]
[RequireAdmin]
public async Task<ActionResult> ChangeMemberRole(Guid agentId, [FromBody] ChangeMemberRoleRequest request)
{
    var orgId = _orgContext.GetCurrentOrganizationId();
    var currentAgentId = _orgContext.GetCurrentAgentId();

    // Cannot change own role
    if (agentId == currentAgentId)
        return BadRequest(new { error = "Cannot change your own role" });

    var member = await _context.OrganizationMembers
        .FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.AgentId == agentId);

    if (member == null)
        return NotFound(new { error = "Member not found" });

    // Cannot demote or promote admin
    if (member.Role == Role.Admin)
        return BadRequest(new { error = "Cannot change admin role. Use transfer-admin instead." });

    if (!Enum.TryParse<Role>(request.Role, true, out var newRole))
        return BadRequest(new { error = "Invalid role" });

    // Cannot set to Admin via this endpoint
    if (newRole == Role.Admin)
        return BadRequest(new { error = "Cannot promote to admin. Use transfer-admin instead." });

    member.Role = newRole;
    await _context.SaveChangesAsync();

    return Ok(new { message = "Role updated" });
}

[HttpDelete("members/{agentId:guid}")]
[RequireAdmin]
public async Task<ActionResult> RemoveMember(Guid agentId)
{
    var orgId = _orgContext.GetCurrentOrganizationId();
    var currentAgentId = _orgContext.GetCurrentAgentId();

    // Cannot remove self
    if (agentId == currentAgentId)
        return BadRequest(new { error = "Cannot remove yourself from the organization" });

    var member = await _context.OrganizationMembers
        .FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.AgentId == agentId);

    if (member == null)
        return NotFound(new { error = "Member not found" });

    // Cannot remove admin
    if (member.Role == Role.Admin)
        return BadRequest(new { error = "Cannot remove the admin" });

    // Reassign deals to admin
    var adminMember = await _context.OrganizationMembers
        .FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.Role == Role.Admin);

    if (adminMember != null)
    {
        var memberDeals = await _context.Deals
            .Where(d => d.OrganizationId == orgId && d.AssignedToAgentId == agentId)
            .ToListAsync();

        foreach (var deal in memberDeals)
        {
            deal.AssignedToAgentId = adminMember.AgentId;
            deal.UpdatedAt = DateTime.UtcNow;
        }
    }

    _context.OrganizationMembers.Remove(member);
    await _context.SaveChangesAsync();

    return Ok(new { message = "Member removed and deals reassigned to admin" });
}

[HttpPost("transfer-admin")]
[RequireAdmin]
public async Task<ActionResult> TransferAdmin([FromBody] TransferAdminRequest request)
{
    var orgId = _orgContext.GetCurrentOrganizationId();
    var currentAgentId = _orgContext.GetCurrentAgentId();

    if (request.NewAdminAgentId == currentAgentId)
        return BadRequest(new { error = "Already admin" });

    var currentAdmin = await _context.OrganizationMembers
        .FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.AgentId == currentAgentId);

    var newAdmin = await _context.OrganizationMembers
        .FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.AgentId == request.NewAdminAgentId);

    if (newAdmin == null)
        return NotFound(new { error = "Member not found" });

    // Transfer admin role
    currentAdmin!.Role = Role.TeamLead; // Demote to team lead
    newAdmin.Role = Role.Admin;

    await _context.SaveChangesAsync();

    return Ok(new { message = "Admin role transferred" });
}

public record TransferAdminRequest(Guid NewAdminAgentId);
```

**Step 2: Verify file compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add backend/Controllers/OrganizationController.cs
git commit -m "feat: add member management endpoints to OrganizationController"
```

---

### Task 3.3: Add Invitation Endpoints

**Files:**
- Modify: `backend/Controllers/OrganizationController.cs`

**Step 1: Add invitation DTOs and endpoints**

Add these after the TransferAdmin endpoint:

```csharp
public record InvitationDto(
    Guid Id,
    string Email,
    string Role,
    DateTime CreatedAt,
    DateTime ExpiresAt
);

public record CreateInvitationRequest(string Email, string Role);

[HttpGet("invitations")]
[RequireAdmin]
public async Task<ActionResult<List<InvitationDto>>> GetInvitations()
{
    var orgId = _orgContext.GetCurrentOrganizationId();

    var invitations = await _context.Invitations
        .Where(i => i.OrganizationId == orgId && i.AcceptedAt == null && i.ExpiresAt > DateTime.UtcNow)
        .OrderByDescending(i => i.CreatedAt)
        .ToListAsync();

    return Ok(invitations.Select(i => new InvitationDto(
        i.Id,
        i.Email,
        i.Role.ToString(),
        i.CreatedAt,
        i.ExpiresAt
    )));
}

[HttpPost("invite")]
[RequireAdmin]
public async Task<ActionResult<InvitationDto>> InviteMember([FromBody] CreateInvitationRequest request)
{
    var orgId = _orgContext.GetCurrentOrganizationId();
    var org = await _orgContext.GetCurrentOrganizationAsync();

    if (org == null)
        return NotFound(new { error = "Organization not found" });

    // Check if already a member
    var existingMember = await _context.OrganizationMembers
        .Include(m => m.Agent)
        .FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.Agent.Email == request.Email);

    if (existingMember != null)
        return BadRequest(new { error = "This email is already a member of your organization" });

    // Check for pending invitation
    var existingInvite = await _context.Invitations
        .FirstOrDefaultAsync(i => i.OrganizationId == orgId && i.Email == request.Email && i.AcceptedAt == null && i.ExpiresAt > DateTime.UtcNow);

    if (existingInvite != null)
        return BadRequest(new { error = "An invitation is already pending for this email" });

    // Parse role
    if (!Enum.TryParse<Role>(request.Role, true, out var role))
        return BadRequest(new { error = "Invalid role" });

    if (role == Role.Admin)
        return BadRequest(new { error = "Cannot invite as admin" });

    // Check subscription status
    if (org.SubscriptionStatus != SubscriptionStatus.Active)
        return BadRequest(new { error = "Subscription required to invite team members" });

    // TODO: Add Stripe seat charge here (Task 4.x)

    // Create invitation
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

    // TODO: Send invitation email (Task 3.5)

    return CreatedAtAction(nameof(GetInvitations), new InvitationDto(
        invitation.Id,
        invitation.Email,
        invitation.Role.ToString(),
        invitation.CreatedAt,
        invitation.ExpiresAt
    ));
}

[HttpDelete("invitations/{id:guid}")]
[RequireAdmin]
public async Task<ActionResult> CancelInvitation(Guid id)
{
    var orgId = _orgContext.GetCurrentOrganizationId();

    var invitation = await _context.Invitations
        .FirstOrDefaultAsync(i => i.Id == id && i.OrganizationId == orgId);

    if (invitation == null)
        return NotFound(new { error = "Invitation not found" });

    if (invitation.AcceptedAt != null)
        return BadRequest(new { error = "Invitation already accepted" });

    // TODO: Refund Stripe seat (Task 4.x)

    _context.Invitations.Remove(invitation);
    await _context.SaveChangesAsync();

    return Ok(new { message = "Invitation cancelled" });
}

private static string GenerateInviteToken()
{
    var bytes = new byte[32];
    using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
    rng.GetBytes(bytes);
    return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
}
```

**Step 2: Verify file compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add backend/Controllers/OrganizationController.cs
git commit -m "feat: add invitation endpoints to OrganizationController"
```

---

### Task 3.4: Create Invite Accept Controller

**Files:**
- Create: `backend/Controllers/InviteController.cs`

**Step 1: Create public invite controller**

```csharp
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
    private readonly IEmailService _emailService;

    public InviteController(EstateFlowDbContext context, IAuthService authService, IEmailService emailService)
    {
        _context = context;
        _authService = authService;
        _emailService = emailService;
    }

    public record InviteInfoDto(
        string OrganizationName,
        string Email,
        string Role,
        DateTime ExpiresAt
    );

    public record AcceptInviteRequest(string? FullName);

    public record AcceptInviteResponse(string Token, bool IsNewUser);

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
```

**Step 2: Verify file compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add backend/Controllers/InviteController.cs
git commit -m "feat: add InviteController for accepting team invitations"
```

---

### Task 3.5: Add Invitation Email to EmailService

**Files:**
- Modify: `backend/Services/EmailService.cs`

**Step 1: Add SendInvitationEmailAsync method**

Add this method to the EmailService class:

```csharp
public async Task SendInvitationEmailAsync(string toEmail, string organizationName, string role, string inviteUrl)
{
    if (string.IsNullOrEmpty(_resendApiKey) || !_resendApiKey.StartsWith("re_"))
    {
        Console.WriteLine($"[DEV] Invitation email to {toEmail}:");
        Console.WriteLine($"      Organization: {organizationName}");
        Console.WriteLine($"      Role: {role}");
        Console.WriteLine($"      Link: {inviteUrl}");
        return;
    }

    var subject = $"Invitation to join {organizationName} on EstateFlow";
    var html = $@"
        <div style='font-family: sans-serif; max-width: 600px; margin: 0 auto;'>
            <h2>You're invited!</h2>
            <p>You've been invited to join <strong>{organizationName}</strong> on EstateFlow as a <strong>{role}</strong>.</p>
            <p style='margin: 30px 0;'>
                <a href='{inviteUrl}' style='background: #1a1a2e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;'>
                    Accept Invitation
                </a>
            </p>
            <p style='color: #666; font-size: 14px;'>This invitation expires in 7 days.</p>
            <p style='color: #666; font-size: 14px;'>If you didn't expect this invitation, you can ignore this email.</p>
        </div>
    ";

    await SendEmailAsync(toEmail, subject, html);
}
```

**Step 2: Add to IEmailService interface**

Add this to the interface:

```csharp
Task SendInvitationEmailAsync(string toEmail, string organizationName, string role, string inviteUrl);
```

**Step 3: Update OrganizationController to send email**

In the `InviteMember` method, after creating the invitation and before the return, add:

```csharp
// Send invitation email
var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:3000";
var inviteUrl = $"{frontendUrl}/invite/{invitation.Token}";
await _emailService.SendInvitationEmailAsync(request.Email, org.Name, role.ToString(), inviteUrl);
```

Also inject IEmailService in the controller constructor.

**Step 4: Verify file compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 5: Commit**

```bash
git add backend/Services/EmailService.cs backend/Controllers/OrganizationController.cs
git commit -m "feat: add invitation email functionality"
```

---

### Task 3.6: Add Team Dashboard Endpoint

**Files:**
- Modify: `backend/Controllers/OrganizationController.cs`

**Step 1: Add team dashboard endpoints**

Add after the invitation endpoints:

```csharp
public record TeamDealDto(
    Guid Id,
    string ClientName,
    string PropertyAddress,
    string Status,
    Guid? AssignedToAgentId,
    string? AssignedToName,
    string? AssignedToPhotoUrl,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record TeamStatsDto(
    int TotalDeals,
    int ActiveDeals,
    int CompletedThisMonth,
    int MemberCount
);

[HttpGet("deals")]
[RequireTeamLeadOrAbove]
public async Task<ActionResult<List<TeamDealDto>>> GetTeamDeals(
    [FromQuery] Guid? assignedTo,
    [FromQuery] string? status)
{
    var orgId = _orgContext.GetCurrentOrganizationId();

    var query = _context.Deals
        .Include(d => d.AssignedToAgent)
        .Where(d => d.OrganizationId == orgId);

    if (assignedTo.HasValue)
        query = query.Where(d => d.AssignedToAgentId == assignedTo.Value);

    if (!string.IsNullOrEmpty(status) && Enum.TryParse<DealStatus>(status, true, out var dealStatus))
        query = query.Where(d => d.Status == dealStatus);

    var deals = await query
        .OrderByDescending(d => d.UpdatedAt)
        .ToListAsync();

    return Ok(deals.Select(d => new TeamDealDto(
        d.Id,
        d.ClientName,
        d.PropertyAddress,
        d.Status.ToString(),
        d.AssignedToAgentId,
        d.AssignedToAgent?.FullName,
        d.AssignedToAgent?.PhotoUrl,
        d.CreatedAt,
        d.UpdatedAt
    )));
}

[HttpGet("stats")]
[RequireTeamLeadOrAbove]
public async Task<ActionResult<TeamStatsDto>> GetTeamStats()
{
    var orgId = _orgContext.GetCurrentOrganizationId();

    var totalDeals = await _context.Deals.CountAsync(d => d.OrganizationId == orgId);
    var activeDeals = await _context.Deals.CountAsync(d => d.OrganizationId == orgId && d.Status == DealStatus.Active);

    var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
    var completedThisMonth = await _context.Deals
        .CountAsync(d => d.OrganizationId == orgId && d.Status == DealStatus.Completed && d.UpdatedAt >= startOfMonth);

    var memberCount = await _context.OrganizationMembers.CountAsync(m => m.OrganizationId == orgId);

    return Ok(new TeamStatsDto(totalDeals, activeDeals, completedThisMonth, memberCount));
}

[HttpPut("deals/{dealId:guid}/assign")]
[RequireTeamLeadOrAbove]
public async Task<ActionResult> AssignDeal(Guid dealId, [FromBody] AssignDealRequest request)
{
    var orgId = _orgContext.GetCurrentOrganizationId();

    var deal = await _context.Deals
        .FirstOrDefaultAsync(d => d.Id == dealId && d.OrganizationId == orgId);

    if (deal == null)
        return NotFound(new { error = "Deal not found" });

    // Verify new assignee is a member
    var member = await _context.OrganizationMembers
        .FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.AgentId == request.AssignToAgentId);

    if (member == null)
        return BadRequest(new { error = "Agent is not a member of this organization" });

    deal.AssignedToAgentId = request.AssignToAgentId;
    deal.UpdatedAt = DateTime.UtcNow;
    await _context.SaveChangesAsync();

    return Ok(new { message = "Deal assigned" });
}

public record AssignDealRequest(Guid AssignToAgentId);
```

**Step 2: Verify file compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add backend/Controllers/OrganizationController.cs
git commit -m "feat: add team dashboard endpoints"
```

---

### Task 3.7: Update DealsController for Multi-Tenant

**Files:**
- Modify: `backend/Controllers/DealsController.cs`

**Step 1: Inject IOrganizationContextService**

Update constructor:

```csharp
private readonly IOrganizationContextService _orgContext;

public DealsController(EstateFlowDbContext context, IAuthService authService, IEmailService emailService, IOrganizationContextService orgContext)
{
    _context = context;
    _authService = authService;
    _emailService = emailService;
    _orgContext = orgContext;
}
```

**Step 2: Update GetDeals to filter by role**

Replace the GetDeals method:

```csharp
[HttpGet]
public async Task<ActionResult<List<DealDto>>> GetDeals([FromQuery] string? status)
{
    var agentId = _orgContext.GetCurrentAgentId();
    var orgId = _orgContext.GetCurrentOrganizationId();
    var role = _orgContext.GetCurrentRole();

    IQueryable<Deal> query = _context.Deals
        .Include(d => d.TimelineSteps.OrderBy(t => t.Order))
        .Include(d => d.Documents);

    // Filter based on role
    if (role == Role.Employee)
    {
        // Employees only see their assigned deals
        query = query.Where(d => d.AssignedToAgentId == agentId);
    }
    else
    {
        // Admin and TeamLead see all org deals
        query = query.Where(d => d.OrganizationId == orgId);
    }

    if (!string.IsNullOrEmpty(status) && Enum.TryParse<DealStatus>(status, true, out var dealStatus))
    {
        query = query.Where(d => d.Status == dealStatus);
    }

    var deals = await query.OrderByDescending(d => d.CreatedAt).ToListAsync();
    return Ok(deals.Select(ToDto));
}
```

**Step 3: Update GetDeal to check access**

Replace the GetDeal method:

```csharp
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

    // Employees can only access their assigned deals
    if (role == Role.Employee && deal.AssignedToAgentId != agentId)
        return Forbid();

    return Ok(ToDto(deal));
}
```

**Step 4: Update CreateDeal to set organization**

In CreateDeal, after checking subscription, update the deal creation:

```csharp
var deal = new Deal
{
    OrganizationId = orgId,
    AgentId = agentId, // Keep for backward compatibility
    AssignedToAgentId = agentId,
    CreatedByAgentId = agentId,
    ClientName = request.ClientName,
    // ... rest of properties
};
```

**Step 5: Update CanCreateDeal to check org subscription**

Replace the CanCreateDeal method:

```csharp
[HttpGet("can-create")]
public async Task<ActionResult<CanCreateDealResponse>> CanCreateDeal()
{
    var orgId = _orgContext.GetCurrentOrganizationId();

    var org = await _context.Organizations
        .Include(o => o.Deals)
        .FirstOrDefaultAsync(o => o.Id == orgId);

    if (org == null)
        return NotFound(new { error = "Organization not found" });

    var dealCount = org.Deals.Count;

    // If subscription is active, no limit
    if (org.SubscriptionStatus == SubscriptionStatus.Active)
    {
        return Ok(new CanCreateDealResponse(true, dealCount, null));
    }

    // Trial users can only create 1 deal
    if (dealCount >= 1)
    {
        return Ok(new CanCreateDealResponse(false, dealCount, "Passez a Pro pour creer plus de transactions"));
    }

    return Ok(new CanCreateDealResponse(true, dealCount, null));
}
```

**Step 6: Add using for Role**

Add at top of file:
```csharp
using EstateFlow.Api.Data.Entities;
```

**Step 7: Verify file compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 8: Commit**

```bash
git add backend/Controllers/DealsController.cs
git commit -m "feat: update DealsController for multi-tenant role-based access"
```

---

## Phase 4: Stripe Integration

### Task 4.1: Update StripeController for Seat-Based Billing

**Files:**
- Modify: `backend/Controllers/StripeController.cs`

**Step 1: Add seat price environment variable**

Add after other env variables in constructor:

```csharp
private readonly string _stripeSeatPriceId;

// In constructor:
_stripeSeatPriceId = Environment.GetEnvironmentVariable("STRIPE_SEAT_PRICE_ID") ?? "";
```

**Step 2: Add AddSeat method**

Add this method for adding seats:

```csharp
public async Task<bool> AddSeatToSubscription(Organization org)
{
    if (string.IsNullOrEmpty(org.StripeSubscriptionId))
        return false;

    try
    {
        var subscriptionService = new SubscriptionService();
        var subscription = await subscriptionService.GetAsync(org.StripeSubscriptionId);

        // Find or create seat item
        var seatItem = subscription.Items.Data.FirstOrDefault(i => i.Price.Id == _stripeSeatPriceId);

        if (seatItem != null)
        {
            // Update existing seat item
            var itemService = new SubscriptionItemService();
            await itemService.UpdateAsync(seatItem.Id, new SubscriptionItemUpdateOptions
            {
                Quantity = seatItem.Quantity + 1
            });

            org.StripeSeatItemId = seatItem.Id;
        }
        else
        {
            // Add new seat item
            var itemService = new SubscriptionItemService();
            var newItem = await itemService.CreateAsync(new SubscriptionItemCreateOptions
            {
                Subscription = org.StripeSubscriptionId,
                Price = _stripeSeatPriceId,
                Quantity = 1
            });

            org.StripeSeatItemId = newItem.Id;
        }

        return true;
    }
    catch (StripeException e)
    {
        _logger.LogError(e, "Failed to add seat for org {OrgId}", org.Id);
        return false;
    }
}
```

**Step 3: Add RemoveSeat method**

```csharp
public async Task<bool> RemoveSeatFromSubscription(Organization org)
{
    if (string.IsNullOrEmpty(org.StripeSeatItemId))
        return true; // No seats to remove

    try
    {
        var itemService = new SubscriptionItemService();
        var item = await itemService.GetAsync(org.StripeSeatItemId);

        if (item.Quantity <= 1)
        {
            // Remove the item entirely
            await itemService.DeleteAsync(org.StripeSeatItemId);
            org.StripeSeatItemId = null;
        }
        else
        {
            // Decrease quantity
            await itemService.UpdateAsync(org.StripeSeatItemId, new SubscriptionItemUpdateOptions
            {
                Quantity = item.Quantity - 1
            });
        }

        return true;
    }
    catch (StripeException e)
    {
        _logger.LogError(e, "Failed to remove seat for org {OrgId}", org.Id);
        return false;
    }
}
```

**Step 4: Update webhook handlers for organization**

Update HandleCheckoutCompleted to use Organization instead of Agent:

```csharp
private async Task HandleCheckoutCompleted(Event stripeEvent)
{
    var session = stripeEvent.Data.Object as Session;
    if (session?.Metadata?.TryGetValue("agent_id", out var agentIdStr) == true)
    {
        if (Guid.TryParse(agentIdStr, out var agentId))
        {
            // Find agent's organization
            var membership = await _context.OrganizationMembers
                .Include(m => m.Organization)
                .FirstOrDefaultAsync(m => m.AgentId == agentId && m.Role == Role.Admin);

            if (membership != null)
            {
                var org = membership.Organization;
                org.SubscriptionStatus = SubscriptionStatus.Active;
                org.StripeSubscriptionId = session.SubscriptionId;
                org.StripeCustomerId = session.CustomerId;
                org.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                _logger.LogInformation("Organization {OrgId} subscription activated", org.Id);
            }
        }
    }
}
```

**Step 5: Add using for Organization**

Ensure using exists:
```csharp
using EstateFlow.Api.Data.Entities;
```

**Step 6: Verify file compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 7: Commit**

```bash
git add backend/Controllers/StripeController.cs
git commit -m "feat: add seat-based billing to StripeController"
```

---

### Task 4.2: Integrate Stripe Seats with Invitations

**Files:**
- Modify: `backend/Controllers/OrganizationController.cs`

**Step 1: Inject StripeController or create a StripeService**

For simplicity, we'll call Stripe directly. Add at top of file:

```csharp
using Stripe;
```

**Step 2: Update InviteMember to add Stripe seat**

In the InviteMember method, after the subscription check, add:

```csharp
// Add seat to Stripe subscription
if (!string.IsNullOrEmpty(org.StripeSubscriptionId))
{
    var stripeSeatPriceId = Environment.GetEnvironmentVariable("STRIPE_SEAT_PRICE_ID") ?? "";
    if (!string.IsNullOrEmpty(stripeSeatPriceId))
    {
        try
        {
            StripeConfiguration.ApiKey = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY");

            var subscriptionService = new SubscriptionService();
            var subscription = await subscriptionService.GetAsync(org.StripeSubscriptionId);

            var seatItem = subscription.Items.Data.FirstOrDefault(i => i.Price.Id == stripeSeatPriceId);

            if (seatItem != null)
            {
                var itemService = new SubscriptionItemService();
                await itemService.UpdateAsync(seatItem.Id, new SubscriptionItemUpdateOptions
                {
                    Quantity = seatItem.Quantity + 1
                });
            }
            else
            {
                var itemService = new SubscriptionItemService();
                await itemService.CreateAsync(new SubscriptionItemCreateOptions
                {
                    Subscription = org.StripeSubscriptionId,
                    Price = stripeSeatPriceId,
                    Quantity = 1
                });
            }
        }
        catch (StripeException e)
        {
            return BadRequest(new { error = $"Payment failed: {e.Message}" });
        }
    }
}
```

**Step 3: Update CancelInvitation to remove Stripe seat**

In the CancelInvitation method, before removing the invitation:

```csharp
// Remove seat from Stripe
var org = await _context.Organizations.FindAsync(orgId);
if (org != null && !string.IsNullOrEmpty(org.StripeSubscriptionId))
{
    var stripeSeatPriceId = Environment.GetEnvironmentVariable("STRIPE_SEAT_PRICE_ID") ?? "";
    if (!string.IsNullOrEmpty(stripeSeatPriceId))
    {
        try
        {
            StripeConfiguration.ApiKey = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY");

            var subscriptionService = new SubscriptionService();
            var subscription = await subscriptionService.GetAsync(org.StripeSubscriptionId);

            var seatItem = subscription.Items.Data.FirstOrDefault(i => i.Price.Id == stripeSeatPriceId);

            if (seatItem != null && seatItem.Quantity > 0)
            {
                var itemService = new SubscriptionItemService();
                if (seatItem.Quantity <= 1)
                {
                    await itemService.DeleteAsync(seatItem.Id);
                }
                else
                {
                    await itemService.UpdateAsync(seatItem.Id, new SubscriptionItemUpdateOptions
                    {
                        Quantity = seatItem.Quantity - 1
                    });
                }
            }
        }
        catch (StripeException e)
        {
            // Log but don't fail the cancellation
            Console.WriteLine($"Warning: Failed to remove Stripe seat: {e.Message}");
        }
    }
}
```

**Step 4: Update RemoveMember to remove Stripe seat**

Add similar Stripe seat removal logic to the RemoveMember method.

**Step 5: Verify file compiles**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 6: Commit**

```bash
git add backend/Controllers/OrganizationController.cs
git commit -m "feat: integrate Stripe seat billing with invitations"
```

---

## Phase 5: Frontend Updates

### Task 5.1: Update API Types

**Files:**
- Modify: `frontend/lib/api.ts`

**Step 1: Add Organization types**

Add after the existing types:

```typescript
// Organization
export interface Organization {
  id: string;
  name: string;
  brandColor: string;
  logoUrl?: string;
  subscriptionStatus: string;
  memberCount: number;
}

export interface OrganizationMember {
  agentId: string;
  email: string;
  fullName?: string;
  photoUrl?: string;
  role: 'Admin' | 'TeamLead' | 'Employee';
  activeDeals: number;
  joinedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
}

export interface TeamDeal {
  id: string;
  clientName: string;
  propertyAddress: string;
  status: string;
  assignedToAgentId?: string;
  assignedToName?: string;
  assignedToPhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamStats {
  totalDeals: number;
  activeDeals: number;
  completedThisMonth: number;
  memberCount: number;
}

export interface InviteInfo {
  organizationName: string;
  email: string;
  role: string;
  expiresAt: string;
}
```

**Step 2: Add Organization API**

Add after stripeApi:

```typescript
// Organization
export const organizationApi = {
  get: (token: string) =>
    apiFetch<Organization>('/api/organization', { token }),

  update: (token: string, data: Partial<Organization>) =>
    apiFetch<Organization>('/api/organization', {
      token,
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getMembers: (token: string) =>
    apiFetch<OrganizationMember[]>('/api/organization/members', { token }),

  changeMemberRole: (token: string, agentId: string, role: string) =>
    apiFetch<void>(`/api/organization/members/${agentId}/role`, {
      token,
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  removeMember: (token: string, agentId: string) =>
    apiFetch<void>(`/api/organization/members/${agentId}`, {
      token,
      method: 'DELETE',
    }),

  transferAdmin: (token: string, newAdminAgentId: string) =>
    apiFetch<void>('/api/organization/transfer-admin', {
      token,
      method: 'POST',
      body: JSON.stringify({ newAdminAgentId }),
    }),

  getInvitations: (token: string) =>
    apiFetch<Invitation[]>('/api/organization/invitations', { token }),

  invite: (token: string, email: string, role: string) =>
    apiFetch<Invitation>('/api/organization/invite', {
      token,
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  cancelInvitation: (token: string, id: string) =>
    apiFetch<void>(`/api/organization/invitations/${id}`, {
      token,
      method: 'DELETE',
    }),

  getTeamDeals: (token: string, assignedTo?: string, status?: string) => {
    const params = new URLSearchParams();
    if (assignedTo) params.append('assignedTo', assignedTo);
    if (status) params.append('status', status);
    const query = params.toString();
    return apiFetch<TeamDeal[]>(`/api/organization/deals${query ? `?${query}` : ''}`, { token });
  },

  getTeamStats: (token: string) =>
    apiFetch<TeamStats>('/api/organization/stats', { token }),

  assignDeal: (token: string, dealId: string, assignToAgentId: string) =>
    apiFetch<void>(`/api/organization/deals/${dealId}/assign`, {
      token,
      method: 'PUT',
      body: JSON.stringify({ assignToAgentId }),
    }),
};

// Invite (public)
export const inviteApi = {
  getInfo: (inviteToken: string) =>
    apiFetch<InviteInfo>(`/api/invite/${inviteToken}`),

  accept: (inviteToken: string, fullName?: string) =>
    apiFetch<{ token: string; isNewUser: boolean }>(`/api/invite/${inviteToken}/accept`, {
      method: 'POST',
      body: JSON.stringify({ fullName }),
    }),
};
```

**Step 3: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat: add Organization and Invite API types and methods"
```

---

### Task 5.2: Update Auth Context for Multi-Tenant

**Files:**
- Modify: `frontend/lib/auth.tsx`

**Step 1: Add organization and role to context**

Update the AuthContextType interface:

```typescript
interface AuthContextType {
  token: string | null;
  agent: Agent | null;
  organization: Organization | null;
  role: 'Admin' | 'TeamLead' | 'Employee' | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  refreshAgent: () => Promise<void>;
  isAdmin: () => boolean;
  isTeamLeadOrAbove: () => boolean;
}
```

**Step 2: Update AuthProvider to fetch organization**

Update the state and fetch logic:

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Agent, Organization, agentApi, organizationApi } from './api';

// ... interface as above ...

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<'Admin' | 'TeamLead' | 'Employee' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      fetchAgentAndOrg(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchAgentAndOrg = async (authToken: string) => {
    try {
      const [agentData, orgData] = await Promise.all([
        agentApi.getMe(authToken),
        organizationApi.get(authToken).catch(() => null),
      ]);
      setAgent(agentData);
      setOrganization(orgData);

      // Decode role from token
      const payload = JSON.parse(atob(authToken.split('.')[1]));
      setRole(payload.role || null);
    } catch (error) {
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    fetchAgentAndOrg(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setAgent(null);
    setOrganization(null);
    setRole(null);
  };

  const refreshAgent = async () => {
    if (token) {
      await fetchAgentAndOrg(token);
    }
  };

  const isAdmin = () => role === 'Admin';
  const isTeamLeadOrAbove = () => role === 'Admin' || role === 'TeamLead';

  return (
    <AuthContext.Provider value={{
      token,
      agent,
      organization,
      role,
      isLoading,
      login,
      logout,
      refreshAgent,
      isAdmin,
      isTeamLeadOrAbove,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**Step 3: Commit**

```bash
git add frontend/lib/auth.tsx
git commit -m "feat: update AuthContext for multi-tenant with org and role"
```

---

### Task 5.3: Create Team Dashboard Page

**Files:**
- Create: `frontend/app/dashboard/team/page.tsx`

**Step 1: Create the team dashboard page**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { organizationApi, TeamDeal, TeamStats, OrganizationMember } from '@/lib/api';

export default function TeamDashboardPage() {
  const { token, isTeamLeadOrAbove, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<TeamStats | null>(null);
  const [deals, setDeals] = useState<TeamDeal[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [filter, setFilter] = useState({ assignedTo: '', status: '' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isTeamLeadOrAbove()) {
      router.push('/dashboard');
      return;
    }

    if (token) {
      loadData();
    }
  }, [token, authLoading]);

  const loadData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [statsData, dealsData, membersData] = await Promise.all([
        organizationApi.getTeamStats(token),
        organizationApi.getTeamDeals(token, filter.assignedTo || undefined, filter.status || undefined),
        organizationApi.getMembers(token),
      ]);
      setStats(statsData);
      setDeals(dealsData);
      setMembers(membersData);
    } catch (error) {
      console.error('Failed to load team data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = async () => {
    if (!token) return;
    const dealsData = await organizationApi.getTeamDeals(
      token,
      filter.assignedTo || undefined,
      filter.status || undefined
    );
    setDeals(dealsData);
  };

  const handleAssign = async (dealId: string, assignToAgentId: string) => {
    if (!token) return;
    await organizationApi.assignDeal(token, dealId, assignToAgentId);
    loadData();
  };

  if (authLoading || isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Team Dashboard</h1>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-lg shadow">
            <div className="text-2xl font-bold">{stats.totalDeals}</div>
            <div className="text-gray-500">Total Deals</div>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <div className="text-2xl font-bold">{stats.activeDeals}</div>
            <div className="text-gray-500">Active Deals</div>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <div className="text-2xl font-bold">{stats.completedThisMonth}</div>
            <div className="text-gray-500">Completed This Month</div>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <div className="text-2xl font-bold">{stats.memberCount}</div>
            <div className="text-gray-500">Team Members</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={filter.assignedTo}
          onChange={(e) => setFilter({ ...filter, assignedTo: e.target.value })}
          className="p-2 border rounded"
        >
          <option value="">All Members</option>
          {members.map((m) => (
            <option key={m.agentId} value={m.agentId}>
              {m.fullName || m.email}
            </option>
          ))}
        </select>
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="p-2 border rounded"
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Archived">Archived</option>
        </select>
        <button onClick={handleFilterChange} className="px-4 py-2 bg-blue-600 text-white rounded">
          Apply Filters
        </button>
      </div>

      {/* Deals Table */}
      <table className="w-full bg-white rounded-lg shadow">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-4 text-left">Client</th>
            <th className="p-4 text-left">Property</th>
            <th className="p-4 text-left">Assigned To</th>
            <th className="p-4 text-left">Status</th>
            <th className="p-4 text-left">Last Updated</th>
            <th className="p-4 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <tr key={deal.id} className="border-t">
              <td className="p-4">{deal.clientName}</td>
              <td className="p-4">{deal.propertyAddress}</td>
              <td className="p-4">
                <div className="flex items-center gap-2">
                  {deal.assignedToPhotoUrl && (
                    <img src={deal.assignedToPhotoUrl} alt="" className="w-8 h-8 rounded-full" />
                  )}
                  {deal.assignedToName || 'Unassigned'}
                </div>
              </td>
              <td className="p-4">
                <span className={`px-2 py-1 rounded text-sm ${
                  deal.status === 'Active' ? 'bg-green-100 text-green-800' :
                  deal.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {deal.status}
                </span>
              </td>
              <td className="p-4">{new Date(deal.updatedAt).toLocaleDateString()}</td>
              <td className="p-4">
                <select
                  value={deal.assignedToAgentId || ''}
                  onChange={(e) => handleAssign(deal.id, e.target.value)}
                  className="p-1 border rounded text-sm"
                >
                  <option value="">Reassign to...</option>
                  {members.map((m) => (
                    <option key={m.agentId} value={m.agentId}>
                      {m.fullName || m.email}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/app/dashboard/team/page.tsx
git commit -m "feat: create Team Dashboard page"
```

---

### Task 5.4: Create Members Management Page

**Files:**
- Create: `frontend/app/dashboard/team/members/page.tsx`

**Step 1: Create the members management page**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { organizationApi, OrganizationMember, Invitation } from '@/lib/api';

export default function MembersPage() {
  const { token, isAdmin, agent, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Employee');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAdmin()) {
      router.push('/dashboard');
      return;
    }

    if (token) {
      loadData();
    }
  }, [token, authLoading]);

  const loadData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [membersData, invitationsData] = await Promise.all([
        organizationApi.getMembers(token),
        organizationApi.getInvitations(token),
      ]);
      setMembers(membersData);
      setInvitations(invitationsData);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!token || !inviteEmail) return;
    setError('');
    try {
      await organizationApi.invite(token, inviteEmail, inviteRole);
      setInviteEmail('');
      loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleCancelInvite = async (id: string) => {
    if (!token) return;
    await organizationApi.cancelInvitation(token, id);
    loadData();
  };

  const handleChangeRole = async (agentId: string, role: string) => {
    if (!token) return;
    await organizationApi.changeMemberRole(token, agentId, role);
    loadData();
  };

  const handleRemoveMember = async (agentId: string) => {
    if (!token) return;
    if (!confirm('Are you sure? Their deals will be reassigned to you.')) return;
    await organizationApi.removeMember(token, agentId);
    loadData();
  };

  const handleTransferAdmin = async (agentId: string) => {
    if (!token) return;
    if (!confirm('Transfer admin role? You will become a Team Lead.')) return;
    await organizationApi.transferAdmin(token, agentId);
    router.push('/dashboard');
  };

  if (authLoading || isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Team Members</h1>

      {/* Invite Form */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Invite New Member</h2>
        {error && <div className="text-red-600 mb-4">{error}</div>}
        <div className="flex gap-4">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Email address"
            className="flex-1 p-2 border rounded"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="Employee">Employee</option>
            <option value="TeamLead">Team Lead</option>
          </select>
          <button
            onClick={handleInvite}
            className="px-6 py-2 bg-blue-600 text-white rounded"
          >
            Invite (+10 EUR/month)
          </button>
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Pending Invitations</h2>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-left">Expires</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} className="border-t">
                  <td className="p-3">{inv.email}</td>
                  <td className="p-3">{inv.role}</td>
                  <td className="p-3">{new Date(inv.expiresAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleCancelInvite(inv.id)}
                      className="text-red-600 hover:underline"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Current Members</h2>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Member</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Active Deals</th>
              <th className="p-3 text-left">Joined</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.agentId} className="border-t">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {m.photoUrl && (
                      <img src={m.photoUrl} alt="" className="w-10 h-10 rounded-full" />
                    )}
                    <div>
                      <div className="font-medium">{m.fullName || 'No name'}</div>
                      <div className="text-sm text-gray-500">{m.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  {m.role === 'Admin' ? (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">Admin</span>
                  ) : (
                    <select
                      value={m.role}
                      onChange={(e) => handleChangeRole(m.agentId, e.target.value)}
                      className="p-1 border rounded text-sm"
                    >
                      <option value="TeamLead">Team Lead</option>
                      <option value="Employee">Employee</option>
                    </select>
                  )}
                </td>
                <td className="p-3">{m.activeDeals}</td>
                <td className="p-3">{new Date(m.joinedAt).toLocaleDateString()}</td>
                <td className="p-3">
                  {m.agentId !== agent?.id && m.role !== 'Admin' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTransferAdmin(m.agentId)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Make Admin
                      </button>
                      <button
                        onClick={() => handleRemoveMember(m.agentId)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/app/dashboard/team/members/page.tsx
git commit -m "feat: create Members management page"
```

---

### Task 5.5: Create Invite Accept Page

**Files:**
- Create: `frontend/app/invite/[token]/page.tsx`

**Step 1: Create the invite accept page**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { inviteApi, InviteInfo } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams();
  const { login } = useAuth();
  const inviteToken = params.token as string;

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadInviteInfo();
  }, [inviteToken]);

  const loadInviteInfo = async () => {
    try {
      const info = await inviteApi.getInfo(inviteToken);
      setInviteInfo(info);
    } catch (e: any) {
      setError(e.message || 'Invalid or expired invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const result = await inviteApi.accept(inviteToken, fullName || undefined);
      login(result.token);
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading invitation...</div>
      </div>
    );
  }

  if (error && !inviteInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Invitation</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2">You're Invited!</h1>
        <p className="text-gray-600 mb-6">
          Join <strong>{inviteInfo?.organizationName}</strong> as a <strong>{inviteInfo?.role}</strong>
        </p>

        {error && <div className="text-red-600 mb-4">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Your Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full p-3 border rounded"
            />
          </div>

          <div className="text-sm text-gray-500">
            Invitation for: {inviteInfo?.email}
          </div>

          <button
            onClick={handleAccept}
            disabled={isSubmitting}
            className="w-full py-3 bg-blue-600 text-white rounded font-medium disabled:opacity-50"
          >
            {isSubmitting ? 'Joining...' : 'Accept Invitation'}
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Expires: {inviteInfo && new Date(inviteInfo.expiresAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/app/invite/[token]/page.tsx
git commit -m "feat: create Invite Accept page"
```

---

### Task 5.6: Update Dashboard Navigation

**Files:**
- Modify: `frontend/app/dashboard/layout.tsx`

**Step 1: Add team navigation links conditionally**

Update the navigation to include team links based on role:

```typescript
// Add to imports
import { useAuth } from '@/lib/auth';

// In the component
const { isAdmin, isTeamLeadOrAbove, organization } = useAuth();

// In the navigation section, add:
{isTeamLeadOrAbove() && (
  <>
    <Link href="/dashboard/team" className="...">
      Team Dashboard
    </Link>
    {isAdmin() && (
      <Link href="/dashboard/team/members" className="...">
        Manage Team
      </Link>
    )}
  </>
)}
```

**Step 2: Commit**

```bash
git add frontend/app/dashboard/layout.tsx
git commit -m "feat: add team navigation links based on role"
```

---

## Phase 6: Environment & Testing

### Task 6.1: Update Environment Variables

**Files:**
- Modify: `.env.example`

**Step 1: Add new environment variables**

Add to `.env.example`:

```
# Stripe Seat Pricing
STRIPE_SEAT_PRICE_ID=price_xxx
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add STRIPE_SEAT_PRICE_ID to env example"
```

---

### Task 6.2: Update CLAUDE.md Documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add multi-tenant section**

Add to CLAUDE.md:

```markdown
## Multi-Tenant Architecture

### Roles
- **Admin**: Full access including Stripe billing, member management
- **TeamLead**: View all deals, reassign deals, no billing access
- **Employee**: Only their assigned deals, core features

### Key Entities
- Organization: Owns deals and Stripe subscription
- OrganizationMember: Links Agents to Organizations with Role
- Invitation: Pending team invites

### API Authorization
- JWT includes `org_id` and `role` claims
- Use `[RequireAdmin]` or `[RequireTeamLeadOrAbove]` attributes
- IOrganizationContextService provides current context
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add multi-tenant architecture documentation"
```

---

### Task 6.3: Final Integration Test

**Step 1: Start the backend**

Run: `cd backend && dotnet run`
Expected: Application starts, migration runs

**Step 2: Start the frontend**

Run: `cd frontend && npm run dev`
Expected: Frontend starts on localhost:3000

**Step 3: Manual testing checklist**

- [ ] Existing agent is migrated to organization as Admin
- [ ] Admin can view organization info
- [ ] Admin can invite team member
- [ ] Invitation email is sent (check console in dev)
- [ ] Invited user can accept and join
- [ ] Team dashboard shows all org deals
- [ ] Employee only sees assigned deals
- [ ] Admin can change member roles
- [ ] Admin can remove member (deals reassigned)
- [ ] Admin can transfer admin role

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration test fixes"
```

---

## Summary

This plan implements multi-tenant capabilities in 6 phases:

1. **Database Entities** (Tasks 1.1-1.9): New Organization, OrganizationMember, Invitation entities + migration
2. **Authorization** (Tasks 2.1-2.3): OrganizationContextService, JWT updates, role attributes
3. **Organization API** (Tasks 3.1-3.7): CRUD, members, invitations, team dashboard endpoints
4. **Stripe Integration** (Tasks 4.1-4.2): Seat-based billing
5. **Frontend** (Tasks 5.1-5.6): API types, auth context, pages, navigation
6. **Environment & Testing** (Tasks 6.1-6.3): Configuration and testing

Total estimated tasks: ~25 discrete implementation steps with frequent commits.
