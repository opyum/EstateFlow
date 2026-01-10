# Dashboard Indicateurs - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Créer un dashboard enrichi avec KPIs, alertes et vue équipe pour les agences immobilières.

**Architecture:** Enrichissement de l'entité TimelineStep avec champs de suivi, nouveau service DashboardService pour calculer les métriques, 3 nouveaux endpoints API, et 8 composants frontend React.

**Tech Stack:** .NET 9 / EF Core / PostgreSQL, Next.js 14 / React 18 / TypeScript / Tailwind / Framer Motion

---

## Task 1: Enrichir l'entité TimelineStep

**Files:**
- Modify: `backend/Data/Entities/TimelineStep.cs`

**Step 1: Ajouter les nouveaux champs à TimelineStep**

Ouvrir le fichier et ajouter après les propriétés existantes :

```csharp
// Seuils configurables (hérités du template, modifiables par deal)
[Column("expected_duration_days")]
public int ExpectedDurationDays { get; set; } = 14;

[Column("inactivity_warning_days")]
public int InactivityWarningDays { get; set; } = 5;

[Column("inactivity_critical_days")]
public int InactivityCriticalDays { get; set; } = 10;

// Tracking d'activité
[Column("started_at")]
public DateTime? StartedAt { get; set; }

[Column("last_activity_at")]
public DateTime? LastActivityAt { get; set; }
```

**Step 2: Vérifier le build**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add backend/Data/Entities/TimelineStep.cs
git commit -m "feat(backend): add threshold and activity tracking fields to TimelineStep"
```

---

## Task 2: Mettre à jour le template JSON structure

**Files:**
- Modify: `backend/Data/EstateFlowDbContext.cs`

**Step 1: Mettre à jour les templates seed avec les nouveaux champs**

Trouver la section `SeedTimelineTemplates()` et mettre à jour la structure JSON pour inclure les seuils. Exemple pour le premier template :

```csharp
private void SeedTimelineTemplates(ModelBuilder modelBuilder)
{
    var templates = new[]
    {
        new TimelineTemplate
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Name = "Achat Appartement",
            Steps = JsonSerializer.Serialize(new[]
            {
                new { Title = "Offre d'achat", Description = "Rédaction et envoi de l'offre d'achat", Order = 1, ExpectedDurationDays = 7, InactivityWarningDays = 3, InactivityCriticalDays = 5 },
                new { Title = "Signature du compromis", Description = "Signature du compromis de vente chez le notaire", Order = 2, ExpectedDurationDays = 14, InactivityWarningDays = 5, InactivityCriticalDays = 10 },
                new { Title = "Obtention du prêt", Description = "Validation définitive du financement", Order = 3, ExpectedDurationDays = 60, InactivityWarningDays = 14, InactivityCriticalDays = 30 },
                new { Title = "Levée des conditions suspensives", Description = "Vérification de toutes les conditions", Order = 4, ExpectedDurationDays = 14, InactivityWarningDays = 5, InactivityCriticalDays = 10 },
                new { Title = "Signature de l'acte authentique", Description = "Signature finale chez le notaire et remise des clés", Order = 5, ExpectedDurationDays = 30, InactivityWarningDays = 7, InactivityCriticalDays = 14 }
            })
        },
        // ... autres templates similaires
    };
    // ...
}
```

**Step 2: Vérifier le build**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add backend/Data/EstateFlowDbContext.cs
git commit -m "feat(backend): add threshold fields to timeline template seed data"
```

---

## Task 3: Mettre à jour DealsController pour copier les seuils du template

**Files:**
- Modify: `backend/Controllers/DealsController.cs`

**Step 1: Trouver la méthode ApplyTemplate et ajouter la copie des seuils**

Dans la méthode qui applique un template à un deal, modifier la création des TimelineStep pour inclure les nouveaux champs :

```csharp
// Dans la boucle de création des steps depuis le template
var step = new TimelineStep
{
    Id = Guid.NewGuid(),
    DealId = deal.Id,
    Title = templateStep.Title,
    Description = templateStep.Description,
    Status = StepStatus.Pending,
    Order = templateStep.Order,
    // Nouveaux champs
    ExpectedDurationDays = templateStep.ExpectedDurationDays ?? 14,
    InactivityWarningDays = templateStep.InactivityWarningDays ?? 5,
    InactivityCriticalDays = templateStep.InactivityCriticalDays ?? 10,
    LastActivityAt = DateTime.UtcNow
};
```

**Step 2: Mettre à jour le record TemplateStep pour inclure les nouveaux champs**

```csharp
private record TemplateStep(
    string Title,
    string Description,
    int Order,
    int? ExpectedDurationDays = null,
    int? InactivityWarningDays = null,
    int? InactivityCriticalDays = null
);
```

**Step 3: Vérifier le build**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 4: Commit**

```bash
git add backend/Controllers/DealsController.cs
git commit -m "feat(backend): copy threshold fields from template when creating deal steps"
```

---

## Task 4: Mettre à jour TimelineStepsController pour tracker l'activité

**Files:**
- Modify: `backend/Controllers/TimelineStepsController.cs`

**Step 1: Mettre à jour la méthode UpdateStep pour tracker StartedAt et LastActivityAt**

Trouver la méthode de mise à jour du statut et ajouter :

```csharp
// Lors du changement de statut
if (request.Status != null && request.Status != step.Status.ToString())
{
    var newStatus = Enum.Parse<StepStatus>(request.Status);

    // Track StartedAt quand on passe en InProgress
    if (newStatus == StepStatus.InProgress && step.StartedAt == null)
    {
        step.StartedAt = DateTime.UtcNow;
    }

    step.Status = newStatus;
}

// Toujours mettre à jour LastActivityAt lors d'une modification
step.LastActivityAt = DateTime.UtcNow;
```

**Step 2: Vérifier le build**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add backend/Controllers/TimelineStepsController.cs
git commit -m "feat(backend): track StartedAt and LastActivityAt on step updates"
```

---

## Task 5: Créer le service DashboardService

**Files:**
- Create: `backend/Services/DashboardService.cs`

**Step 1: Créer l'interface et le service**

```csharp
using EstateFlow.Api.Data;
using EstateFlow.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace EstateFlow.Api.Services;

public interface IDashboardService
{
    Task<AgentDashboardDto> GetAgentDashboardAsync(Guid agentId, Guid organizationId);
    Task<OrgDashboardDto> GetOrganizationDashboardAsync(Guid organizationId);
    Task<AgentDashboardDto> GetAgentDashboardForOrgAsync(Guid agentId, Guid organizationId);
}

public class DashboardService : IDashboardService
{
    private readonly EstateFlowDbContext _db;

    public DashboardService(EstateFlowDbContext db)
    {
        _db = db;
    }

    public async Task<AgentDashboardDto> GetAgentDashboardAsync(Guid agentId, Guid organizationId)
    {
        var today = DateTime.UtcNow.Date;
        var startOfMonth = new DateTime(today.Year, today.Month, 1);
        var startOfLastMonth = startOfMonth.AddMonths(-1);
        var endOfLastMonth = startOfMonth.AddDays(-1);
        var weekFromNow = today.AddDays(7);

        // Get deals assigned to this agent in this organization
        var deals = await _db.Deals
            .Include(d => d.TimelineSteps)
            .Where(d => d.OrganizationId == organizationId && d.AssignedToAgentId == agentId)
            .ToListAsync();

        var activeDeals = deals.Where(d => d.Status == DealStatus.Active).ToList();
        var completedThisMonth = deals.Count(d => d.Status == DealStatus.Completed && d.UpdatedAt >= startOfMonth);
        var completedLastMonth = deals.Count(d => d.Status == DealStatus.Completed && d.UpdatedAt >= startOfLastMonth && d.UpdatedAt < startOfMonth);

        // Calculate alerts
        var alerts = CalculateAlerts(activeDeals, today);
        var alertDeals = alerts.Select(a => a.DealId).Distinct().Count();
        var alertCritical = alerts.Count(a => a.AlertLevel == "critical");
        var alertWarning = alerts.Count(a => a.AlertLevel == "warning");

        // Active deals trend (vs last month)
        var activeLastMonth = deals.Count(d => d.CreatedAt < startOfMonth && (d.Status == DealStatus.Active || (d.Status == DealStatus.Completed && d.UpdatedAt >= startOfMonth)));
        var activeDealsTrend = activeDeals.Count - activeLastMonth;

        // Average completion days
        var completedDeals = deals.Where(d => d.Status == DealStatus.Completed).ToList();
        var avgCompletionDays = completedDeals.Any()
            ? (int)completedDeals.Average(d => (d.UpdatedAt - d.CreatedAt).TotalDays)
            : 0;

        // This week's deadlines
        var thisWeek = GetThisWeekItems(activeDeals, today, weekFromNow);

        return new AgentDashboardDto
        {
            Kpis = new KpisDto
            {
                ActiveDeals = activeDeals.Count,
                ActiveDealsTrend = activeDealsTrend,
                AlertDeals = alertDeals,
                AlertCritical = alertCritical,
                AlertWarning = alertWarning,
                CompletedThisMonth = completedThisMonth,
                CompletedTrend = completedThisMonth - completedLastMonth,
                AvgCompletionDays = avgCompletionDays,
                AvgCompletionTrend = 0 // TODO: calculate from last month
            },
            Today = alerts.Where(a => a.AlertLevel == "critical" || a.DueDate?.Date == today || a.DueDate?.Date == today.AddDays(1)).ToList(),
            ThisWeek = thisWeek
        };
    }

    public async Task<OrgDashboardDto> GetOrganizationDashboardAsync(Guid organizationId)
    {
        var today = DateTime.UtcNow.Date;
        var startOfMonth = new DateTime(today.Year, today.Month, 1);
        var startOfLastMonth = startOfMonth.AddMonths(-1);
        var weekFromNow = today.AddDays(7);

        var deals = await _db.Deals
            .Include(d => d.TimelineSteps)
            .Include(d => d.AssignedToAgent)
            .Where(d => d.OrganizationId == organizationId)
            .ToListAsync();

        var members = await _db.OrganizationMembers
            .Include(m => m.Agent)
            .Where(m => m.OrganizationId == organizationId)
            .ToListAsync();

        var activeDeals = deals.Where(d => d.Status == DealStatus.Active).ToList();
        var completedThisMonth = deals.Count(d => d.Status == DealStatus.Completed && d.UpdatedAt >= startOfMonth);
        var completedLastMonth = deals.Count(d => d.Status == DealStatus.Completed && d.UpdatedAt >= startOfLastMonth && d.UpdatedAt < startOfMonth);

        var alerts = CalculateAlertsWithAgent(activeDeals, today);
        var alertDeals = alerts.Select(a => a.DealId).Distinct().Count();

        var thisWeek = GetThisWeekItemsWithAgent(activeDeals, today, weekFromNow);

        // Team stats per agent
        var team = members.Select(m => new TeamMemberStatsDto
        {
            AgentId = m.AgentId,
            AgentName = m.Agent.FullName ?? m.Agent.Email,
            PhotoUrl = m.Agent.PhotoUrl,
            ActiveDeals = activeDeals.Count(d => d.AssignedToAgentId == m.AgentId),
            AlertCritical = alerts.Count(a => a.AgentId == m.AgentId && a.AlertLevel == "critical"),
            AlertWarning = alerts.Count(a => a.AgentId == m.AgentId && a.AlertLevel == "warning"),
            CompletedThisMonth = deals.Count(d => d.AssignedToAgentId == m.AgentId && d.Status == DealStatus.Completed && d.UpdatedAt >= startOfMonth)
        }).ToList();

        return new OrgDashboardDto
        {
            Kpis = new KpisDto
            {
                ActiveDeals = activeDeals.Count,
                ActiveDealsTrend = 0,
                AlertDeals = alertDeals,
                AlertCritical = alerts.Count(a => a.AlertLevel == "critical"),
                AlertWarning = alerts.Count(a => a.AlertLevel == "warning"),
                CompletedThisMonth = completedThisMonth,
                CompletedTrend = completedThisMonth - completedLastMonth,
                AvgCompletionDays = 0,
                AvgCompletionTrend = 0
            },
            Today = alerts.Where(a => a.AlertLevel == "critical" || a.DueDate?.Date == today || a.DueDate?.Date == today.AddDays(1)).ToList(),
            ThisWeek = thisWeek,
            Team = team
        };
    }

    public async Task<AgentDashboardDto> GetAgentDashboardForOrgAsync(Guid agentId, Guid organizationId)
    {
        return await GetAgentDashboardAsync(agentId, organizationId);
    }

    private List<AlertItemDto> CalculateAlerts(List<Deal> deals, DateTime today)
    {
        var alerts = new List<AlertItemDto>();

        foreach (var deal in deals)
        {
            foreach (var step in deal.TimelineSteps.Where(s => s.Status != StepStatus.Completed))
            {
                // Check overdue
                if (step.DueDate.HasValue && step.DueDate.Value.ToDateTime(TimeOnly.MinValue) < today)
                {
                    var daysOverdue = (int)(today - step.DueDate.Value.ToDateTime(TimeOnly.MinValue)).TotalDays;
                    alerts.Add(new AlertItemDto
                    {
                        DealId = deal.Id,
                        DealName = deal.PropertyAddress ?? deal.ClientName,
                        ClientName = deal.ClientName,
                        StepTitle = step.Title,
                        AlertType = "overdue",
                        AlertLevel = "critical",
                        DaysOverdue = daysOverdue,
                        DueDate = step.DueDate?.ToDateTime(TimeOnly.MinValue)
                    });
                }
                // Check due soon (within 2 days)
                else if (step.DueDate.HasValue)
                {
                    var dueDate = step.DueDate.Value.ToDateTime(TimeOnly.MinValue);
                    if (dueDate >= today && dueDate <= today.AddDays(2))
                    {
                        alerts.Add(new AlertItemDto
                        {
                            DealId = deal.Id,
                            DealName = deal.PropertyAddress ?? deal.ClientName,
                            ClientName = deal.ClientName,
                            StepTitle = step.Title,
                            AlertType = "due_soon",
                            AlertLevel = "warning",
                            DaysOverdue = 0,
                            DueDate = dueDate
                        });
                    }
                }

                // Check inactivity
                if (step.LastActivityAt.HasValue)
                {
                    var daysSinceActivity = (int)(today - step.LastActivityAt.Value.Date).TotalDays;
                    if (daysSinceActivity >= step.InactivityCriticalDays)
                    {
                        alerts.Add(new AlertItemDto
                        {
                            DealId = deal.Id,
                            DealName = deal.PropertyAddress ?? deal.ClientName,
                            ClientName = deal.ClientName,
                            StepTitle = step.Title,
                            AlertType = "inactive",
                            AlertLevel = "critical",
                            DaysOverdue = daysSinceActivity,
                            DueDate = step.DueDate?.ToDateTime(TimeOnly.MinValue)
                        });
                    }
                    else if (daysSinceActivity >= step.InactivityWarningDays)
                    {
                        alerts.Add(new AlertItemDto
                        {
                            DealId = deal.Id,
                            DealName = deal.PropertyAddress ?? deal.ClientName,
                            ClientName = deal.ClientName,
                            StepTitle = step.Title,
                            AlertType = "inactive",
                            AlertLevel = "warning",
                            DaysOverdue = daysSinceActivity,
                            DueDate = step.DueDate?.ToDateTime(TimeOnly.MinValue)
                        });
                    }
                }
            }
        }

        return alerts.OrderByDescending(a => a.AlertLevel == "critical").ThenBy(a => a.DueDate).ToList();
    }

    private List<AlertItemWithAgentDto> CalculateAlertsWithAgent(List<Deal> deals, DateTime today)
    {
        var baseAlerts = CalculateAlerts(deals, today);
        return baseAlerts.Select(a =>
        {
            var deal = deals.First(d => d.Id == a.DealId);
            return new AlertItemWithAgentDto
            {
                DealId = a.DealId,
                DealName = a.DealName,
                ClientName = a.ClientName,
                StepTitle = a.StepTitle,
                AlertType = a.AlertType,
                AlertLevel = a.AlertLevel,
                DaysOverdue = a.DaysOverdue,
                DueDate = a.DueDate,
                AgentId = deal.AssignedToAgentId,
                AgentName = deal.AssignedToAgent?.FullName ?? deal.AssignedToAgent?.Email ?? "Non assigné"
            };
        }).ToList();
    }

    private List<WeekDayDto> GetThisWeekItems(List<Deal> deals, DateTime today, DateTime weekFromNow)
    {
        var items = new List<WeekItemDto>();

        foreach (var deal in deals)
        {
            foreach (var step in deal.TimelineSteps.Where(s => s.Status != StepStatus.Completed && s.DueDate.HasValue))
            {
                var dueDate = step.DueDate!.Value.ToDateTime(TimeOnly.MinValue);
                if (dueDate >= today && dueDate <= weekFromNow)
                {
                    items.Add(new WeekItemDto
                    {
                        DealId = deal.Id,
                        DealName = deal.PropertyAddress ?? deal.ClientName,
                        ClientName = deal.ClientName,
                        StepTitle = step.Title,
                        StepStatus = step.Status.ToString(),
                        DueDate = dueDate
                    });
                }
            }
        }

        return items
            .GroupBy(i => i.DueDate.Date)
            .OrderBy(g => g.Key)
            .Select(g => new WeekDayDto
            {
                Date = g.Key,
                Items = g.OrderBy(i => i.DueDate).ToList()
            })
            .ToList();
    }

    private List<WeekDayWithAgentDto> GetThisWeekItemsWithAgent(List<Deal> deals, DateTime today, DateTime weekFromNow)
    {
        var items = new List<WeekItemWithAgentDto>();

        foreach (var deal in deals)
        {
            foreach (var step in deal.TimelineSteps.Where(s => s.Status != StepStatus.Completed && s.DueDate.HasValue))
            {
                var dueDate = step.DueDate!.Value.ToDateTime(TimeOnly.MinValue);
                if (dueDate >= today && dueDate <= weekFromNow)
                {
                    items.Add(new WeekItemWithAgentDto
                    {
                        DealId = deal.Id,
                        DealName = deal.PropertyAddress ?? deal.ClientName,
                        ClientName = deal.ClientName,
                        StepTitle = step.Title,
                        StepStatus = step.Status.ToString(),
                        DueDate = dueDate,
                        AgentId = deal.AssignedToAgentId,
                        AgentName = deal.AssignedToAgent?.FullName ?? deal.AssignedToAgent?.Email ?? "Non assigné"
                    });
                }
            }
        }

        return items
            .GroupBy(i => i.DueDate.Date)
            .OrderBy(g => g.Key)
            .Select(g => new WeekDayWithAgentDto
            {
                Date = g.Key,
                Items = g.OrderBy(i => i.DueDate).ToList()
            })
            .ToList();
    }
}

// DTOs
public class KpisDto
{
    public int ActiveDeals { get; set; }
    public int ActiveDealsTrend { get; set; }
    public int AlertDeals { get; set; }
    public int AlertCritical { get; set; }
    public int AlertWarning { get; set; }
    public int CompletedThisMonth { get; set; }
    public int CompletedTrend { get; set; }
    public int AvgCompletionDays { get; set; }
    public int AvgCompletionTrend { get; set; }
}

public class AlertItemDto
{
    public Guid DealId { get; set; }
    public string DealName { get; set; } = "";
    public string ClientName { get; set; } = "";
    public string StepTitle { get; set; } = "";
    public string AlertType { get; set; } = ""; // overdue, due_soon, inactive
    public string AlertLevel { get; set; } = ""; // critical, warning
    public int DaysOverdue { get; set; }
    public DateTime? DueDate { get; set; }
}

public class AlertItemWithAgentDto : AlertItemDto
{
    public Guid? AgentId { get; set; }
    public string AgentName { get; set; } = "";
}

public class WeekItemDto
{
    public Guid DealId { get; set; }
    public string DealName { get; set; } = "";
    public string ClientName { get; set; } = "";
    public string StepTitle { get; set; } = "";
    public string StepStatus { get; set; } = "";
    public DateTime DueDate { get; set; }
}

public class WeekItemWithAgentDto : WeekItemDto
{
    public Guid? AgentId { get; set; }
    public string AgentName { get; set; } = "";
}

public class WeekDayDto
{
    public DateTime Date { get; set; }
    public List<WeekItemDto> Items { get; set; } = new();
}

public class WeekDayWithAgentDto
{
    public DateTime Date { get; set; }
    public List<WeekItemWithAgentDto> Items { get; set; } = new();
}

public class TeamMemberStatsDto
{
    public Guid AgentId { get; set; }
    public string AgentName { get; set; } = "";
    public string? PhotoUrl { get; set; }
    public int ActiveDeals { get; set; }
    public int AlertCritical { get; set; }
    public int AlertWarning { get; set; }
    public int CompletedThisMonth { get; set; }
}

public class AgentDashboardDto
{
    public KpisDto Kpis { get; set; } = new();
    public List<AlertItemDto> Today { get; set; } = new();
    public List<WeekDayDto> ThisWeek { get; set; } = new();
}

public class OrgDashboardDto
{
    public KpisDto Kpis { get; set; } = new();
    public List<AlertItemWithAgentDto> Today { get; set; } = new();
    public List<WeekDayWithAgentDto> ThisWeek { get; set; } = new();
    public List<TeamMemberStatsDto> Team { get; set; } = new();
}
```

**Step 2: Enregistrer le service dans Program.cs**

Ajouter dans la section des services :

```csharp
builder.Services.AddScoped<IDashboardService, DashboardService>();
```

**Step 3: Vérifier le build**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 4: Commit**

```bash
git add backend/Services/DashboardService.cs backend/Program.cs
git commit -m "feat(backend): add DashboardService with KPIs and alerts calculation"
```

---

## Task 6: Créer l'endpoint GET /api/agents/me/dashboard

**Files:**
- Modify: `backend/Controllers/AgentsController.cs`

**Step 1: Injecter le DashboardService et ajouter l'endpoint**

Ajouter l'injection dans le constructeur et le nouvel endpoint :

```csharp
private readonly IDashboardService _dashboardService;

// Dans le constructeur, ajouter :
_dashboardService = dashboardService;

// Nouvel endpoint
[HttpGet("me/dashboard")]
public async Task<ActionResult<AgentDashboardDto>> GetDashboard()
{
    var agentId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var orgIdClaim = User.FindFirstValue("org_id");

    if (string.IsNullOrEmpty(orgIdClaim))
    {
        return BadRequest("Agent is not part of an organization");
    }

    var orgId = Guid.Parse(orgIdClaim);
    var dashboard = await _dashboardService.GetAgentDashboardAsync(agentId, orgId);

    return Ok(dashboard);
}
```

**Step 2: Vérifier le build**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add backend/Controllers/AgentsController.cs
git commit -m "feat(backend): add GET /api/agents/me/dashboard endpoint"
```

---

## Task 7: Créer les endpoints dashboard organisation

**Files:**
- Modify: `backend/Controllers/OrganizationController.cs`

**Step 1: Injecter le DashboardService**

Ajouter dans le constructeur :

```csharp
private readonly IDashboardService _dashboardService;

// Dans le constructeur :
_dashboardService = dashboardService;
```

**Step 2: Ajouter l'endpoint dashboard organisation**

```csharp
[HttpGet("dashboard")]
[RequireTeamLeadOrAbove]
public async Task<ActionResult<OrgDashboardDto>> GetDashboard()
{
    var orgId = _orgContext.GetCurrentOrganizationId();
    if (orgId == null)
    {
        return BadRequest("Organization context required");
    }

    var dashboard = await _dashboardService.GetOrganizationDashboardAsync(orgId.Value);
    return Ok(dashboard);
}
```

**Step 3: Ajouter l'endpoint drill-down agent**

```csharp
[HttpGet("dashboard/agent/{agentId}")]
[RequireTeamLeadOrAbove]
public async Task<ActionResult<AgentDashboardDto>> GetAgentDashboard(Guid agentId)
{
    var orgId = _orgContext.GetCurrentOrganizationId();
    if (orgId == null)
    {
        return BadRequest("Organization context required");
    }

    // Verify the agent is in this organization
    var member = await _db.OrganizationMembers
        .FirstOrDefaultAsync(m => m.OrganizationId == orgId.Value && m.AgentId == agentId);

    if (member == null)
    {
        return NotFound("Agent not found in organization");
    }

    var dashboard = await _dashboardService.GetAgentDashboardForOrgAsync(agentId, orgId.Value);
    return Ok(dashboard);
}
```

**Step 4: Vérifier le build**

Run: `cd backend && dotnet build`
Expected: Build succeeded

**Step 5: Commit**

```bash
git add backend/Controllers/OrganizationController.cs
git commit -m "feat(backend): add organization dashboard endpoints with agent drill-down"
```

---

## Task 8: Ajouter les types TypeScript frontend

**Files:**
- Modify: `frontend/lib/api.ts`

**Step 1: Ajouter les interfaces pour le dashboard**

Ajouter après les interfaces existantes :

```typescript
// Dashboard types
export interface KpisDto {
  activeDeals: number;
  activeDealsTrend: number;
  alertDeals: number;
  alertCritical: number;
  alertWarning: number;
  completedThisMonth: number;
  completedTrend: number;
  avgCompletionDays: number;
  avgCompletionTrend: number;
}

export interface AlertItemDto {
  dealId: string;
  dealName: string;
  clientName: string;
  stepTitle: string;
  alertType: 'overdue' | 'due_soon' | 'inactive';
  alertLevel: 'critical' | 'warning';
  daysOverdue: number;
  dueDate: string | null;
}

export interface AlertItemWithAgentDto extends AlertItemDto {
  agentId: string | null;
  agentName: string;
}

export interface WeekItemDto {
  dealId: string;
  dealName: string;
  clientName: string;
  stepTitle: string;
  stepStatus: string;
  dueDate: string;
}

export interface WeekItemWithAgentDto extends WeekItemDto {
  agentId: string | null;
  agentName: string;
}

export interface WeekDayDto {
  date: string;
  items: WeekItemDto[];
}

export interface WeekDayWithAgentDto {
  date: string;
  items: WeekItemWithAgentDto[];
}

export interface TeamMemberStatsDto {
  agentId: string;
  agentName: string;
  photoUrl: string | null;
  activeDeals: number;
  alertCritical: number;
  alertWarning: number;
  completedThisMonth: number;
}

export interface AgentDashboardDto {
  kpis: KpisDto;
  today: AlertItemDto[];
  thisWeek: WeekDayDto[];
}

export interface OrgDashboardDto {
  kpis: KpisDto;
  today: AlertItemWithAgentDto[];
  thisWeek: WeekDayWithAgentDto[];
  team: TeamMemberStatsDto[];
}
```

**Step 2: Ajouter les méthodes API**

Dans `agentApi` :

```typescript
getDashboard: (token: string) =>
  apiFetch<AgentDashboardDto>('/api/agents/me/dashboard', { token }),
```

Dans `organizationApi` :

```typescript
getDashboard: (token: string) =>
  apiFetch<OrgDashboardDto>('/api/organization/dashboard', { token }),

getAgentDashboard: (token: string, agentId: string) =>
  apiFetch<AgentDashboardDto>(`/api/organization/dashboard/agent/${agentId}`, { token }),
```

**Step 3: Vérifier le build**

Run: `cd frontend && npm run build`
Expected: Build succeeded

**Step 4: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat(frontend): add dashboard API types and methods"
```

---

## Task 9: Créer le composant TrendBadge

**Files:**
- Create: `frontend/components/dashboard/TrendBadge.tsx`

**Step 1: Créer le composant**

```typescript
'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendBadgeProps {
  value: number;
  inverted?: boolean; // Pour les métriques où moins = mieux (ex: délai moyen)
  className?: string;
}

export function TrendBadge({ value, inverted = false, className }: TrendBadgeProps) {
  if (value === 0) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-sm text-muted-foreground', className)}>
        <Minus className="h-3 w-3" />
        <span>0</span>
      </span>
    );
  }

  const isPositive = inverted ? value < 0 : value > 0;
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  const displayValue = Math.abs(value);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium',
        isPositive ? 'text-emerald-600' : 'text-red-500',
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{value > 0 ? '+' : '-'}{displayValue}</span>
    </span>
  );
}
```

**Step 2: Vérifier le build**

Run: `cd frontend && npm run build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add frontend/components/dashboard/TrendBadge.tsx
git commit -m "feat(frontend): add TrendBadge component"
```

---

## Task 10: Créer le composant KpiCards

**Files:**
- Create: `frontend/components/dashboard/KpiCards.tsx`

**Step 1: Créer le composant**

```typescript
'use client';

import { motion } from 'framer-motion';
import { Briefcase, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendBadge } from './TrendBadge';
import { KpisDto } from '@/lib/api';
import { cn } from '@/lib/utils';

interface KpiCardsProps {
  kpis: KpisDto;
}

export function KpiCards({ kpis }: KpiCardsProps) {
  const cards = [
    {
      title: 'Deals actifs',
      value: kpis.activeDeals,
      trend: kpis.activeDealsTrend,
      icon: Briefcase,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'En alerte',
      value: kpis.alertDeals,
      trend: null,
      subtitle: kpis.alertCritical > 0 || kpis.alertWarning > 0
        ? `${kpis.alertCritical} critique${kpis.alertCritical > 1 ? 's' : ''}, ${kpis.alertWarning} à surveiller`
        : 'Aucune alerte',
      icon: AlertTriangle,
      color: kpis.alertCritical > 0 ? 'text-red-600' : kpis.alertWarning > 0 ? 'text-orange-500' : 'text-emerald-600',
      bgColor: kpis.alertCritical > 0 ? 'bg-red-50' : kpis.alertWarning > 0 ? 'bg-orange-50' : 'bg-emerald-50',
    },
    {
      title: 'Complétés ce mois',
      value: kpis.completedThisMonth,
      trend: kpis.completedTrend,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Délai moyen',
      value: kpis.avgCompletionDays,
      trend: kpis.avgCompletionTrend,
      suffix: ' jours',
      inverted: true,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card variant="glass">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-bold text-charcoal">
                      {card.value}{card.suffix || ''}
                    </span>
                    {card.trend !== null && (
                      <TrendBadge value={card.trend} inverted={card.inverted} />
                    )}
                  </div>
                  {card.subtitle && (
                    <p className={cn('text-xs mt-1', card.color)}>{card.subtitle}</p>
                  )}
                </div>
                <div className={cn('p-3 rounded-xl', card.bgColor)}>
                  <card.icon className={cn('h-6 w-6', card.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
```

**Step 2: Vérifier le build**

Run: `cd frontend && npm run build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add frontend/components/dashboard/KpiCards.tsx
git commit -m "feat(frontend): add KpiCards component with trends"
```

---

## Task 11: Créer le composant AlertItem

**Files:**
- Create: `frontend/components/dashboard/AlertItem.tsx`

**Step 1: Créer le composant**

```typescript
'use client';

import Link from 'next/link';
import { AlertCircle, Clock, User } from 'lucide-react';
import { AlertItemDto, AlertItemWithAgentDto } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AlertItemProps {
  alert: AlertItemDto | AlertItemWithAgentDto;
  showAgent?: boolean;
}

export function AlertItem({ alert, showAgent = false }: AlertItemProps) {
  const isCritical = alert.alertLevel === 'critical';
  const alertWithAgent = alert as AlertItemWithAgentDto;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getAlertMessage = () => {
    if (alert.alertType === 'overdue') {
      return `${alert.daysOverdue} jour${alert.daysOverdue > 1 ? 's' : ''} de retard`;
    }
    if (alert.alertType === 'inactive') {
      return `Inactif depuis ${alert.daysOverdue} jour${alert.daysOverdue > 1 ? 's' : ''}`;
    }
    if (alert.dueDate) {
      const dueDate = new Date(alert.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (dueDate.toDateString() === today.toDateString()) {
        return "Échéance aujourd'hui";
      }
      if (dueDate.toDateString() === tomorrow.toDateString()) {
        return 'Échéance demain';
      }
      return `Échéance le ${formatDate(alert.dueDate)}`;
    }
    return '';
  };

  return (
    <Link
      href={`/dashboard/deals/${alert.dealId}`}
      className={cn(
        'block p-4 rounded-lg border transition-all hover:shadow-md',
        isCritical
          ? 'bg-red-50 border-red-200 hover:border-red-300'
          : 'bg-orange-50 border-orange-200 hover:border-orange-300'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-full',
          isCritical ? 'bg-red-100' : 'bg-orange-100'
        )}>
          {alert.alertType === 'inactive' ? (
            <Clock className={cn('h-4 w-4', isCritical ? 'text-red-600' : 'text-orange-600')} />
          ) : (
            <AlertCircle className={cn('h-4 w-4', isCritical ? 'text-red-600' : 'text-orange-600')} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-charcoal truncate">{alert.dealName}</span>
            {showAgent && alertWithAgent.agentName && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {alertWithAgent.agentName}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{alert.stepTitle}</p>
          <p className={cn(
            'text-sm font-medium mt-1',
            isCritical ? 'text-red-600' : 'text-orange-600'
          )}>
            {getAlertMessage()}
          </p>
        </div>
      </div>
    </Link>
  );
}
```

**Step 2: Vérifier le build**

Run: `cd frontend && npm run build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add frontend/components/dashboard/AlertItem.tsx
git commit -m "feat(frontend): add AlertItem component"
```

---

## Task 12: Créer le composant AlertSection

**Files:**
- Create: `frontend/components/dashboard/AlertSection.tsx`

**Step 1: Créer le composant**

```typescript
'use client';

import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertItem } from './AlertItem';
import { AlertItemDto, AlertItemWithAgentDto } from '@/lib/api';

interface AlertSectionProps {
  alerts: (AlertItemDto | AlertItemWithAgentDto)[];
  showAgent?: boolean;
}

export function AlertSection({ alerts, showAgent = false }: AlertSectionProps) {
  const criticalAlerts = alerts.filter(a => a.alertLevel === 'critical');
  const warningAlerts = alerts.filter(a => a.alertLevel === 'warning');

  if (alerts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card variant="glass" className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-emerald-100">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-emerald-800">Aucune urgence aujourd&apos;hui</p>
                <p className="text-sm text-emerald-600">Tous les deals sont dans les temps</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-lg font-serif">Aujourd&apos;hui</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {criticalAlerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-red-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Critiques ({criticalAlerts.length})
              </h4>
              <div className="space-y-2">
                {criticalAlerts.map((alert, index) => (
                  <AlertItem key={`${alert.dealId}-${index}`} alert={alert} showAgent={showAgent} />
                ))}
              </div>
            </div>
          )}

          {warningAlerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-orange-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                À surveiller ({warningAlerts.length})
              </h4>
              <div className="space-y-2">
                {warningAlerts.map((alert, index) => (
                  <AlertItem key={`${alert.dealId}-${index}`} alert={alert} showAgent={showAgent} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

**Step 2: Vérifier le build**

Run: `cd frontend && npm run build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add frontend/components/dashboard/AlertSection.tsx
git commit -m "feat(frontend): add AlertSection component with grouped alerts"
```

---

## Task 13: Créer les composants WeekItem et WeekSection

**Files:**
- Create: `frontend/components/dashboard/WeekItem.tsx`
- Create: `frontend/components/dashboard/WeekSection.tsx`

**Step 1: Créer WeekItem**

```typescript
'use client';

import Link from 'next/link';
import { User, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WeekItemDto, WeekItemWithAgentDto } from '@/lib/api';
import { cn } from '@/lib/utils';

interface WeekItemProps {
  item: WeekItemDto | WeekItemWithAgentDto;
  showAgent?: boolean;
}

export function WeekItem({ item, showAgent = false }: WeekItemProps) {
  const itemWithAgent = item as WeekItemWithAgentDto;
  const isPending = item.stepStatus === 'Pending';

  return (
    <Link
      href={`/dashboard/deals/${item.dealId}`}
      className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-white/50 hover:bg-white/80 transition-all hover:shadow-sm"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-charcoal truncate">{item.dealName}</span>
          {isPending && (
            <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
              <AlertCircle className="h-3 w-3 mr-1" />
              Non démarré
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{item.stepTitle}</p>
      </div>
      {showAgent && itemWithAgent.agentName && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
          <User className="h-3 w-3" />
          {itemWithAgent.agentName}
        </span>
      )}
    </Link>
  );
}
```

**Step 2: Créer WeekSection**

```typescript
'use client';

import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WeekItem } from './WeekItem';
import { WeekDayDto, WeekDayWithAgentDto } from '@/lib/api';

interface WeekSectionProps {
  days: (WeekDayDto | WeekDayWithAgentDto)[];
  showAgent?: boolean;
}

export function WeekSection({ days, showAgent = false }: WeekSectionProps) {
  const formatDayHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Demain';
    }
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  if (days.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-lg font-serif flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              Cette semaine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Aucune échéance prévue cette semaine
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-lg font-serif flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Cette semaine
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {days.map((day) => (
            <div key={day.date}>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 capitalize">
                {formatDayHeader(day.date)}
              </h4>
              <div className="space-y-2">
                {day.items.map((item, index) => (
                  <WeekItem
                    key={`${item.dealId}-${index}`}
                    item={item}
                    showAgent={showAgent}
                  />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

**Step 3: Vérifier le build**

Run: `cd frontend && npm run build`
Expected: Build succeeded

**Step 4: Commit**

```bash
git add frontend/components/dashboard/WeekItem.tsx frontend/components/dashboard/WeekSection.tsx
git commit -m "feat(frontend): add WeekItem and WeekSection components"
```

---

## Task 14: Créer le composant TeamOverview

**Files:**
- Create: `frontend/components/dashboard/TeamOverview.tsx`

**Step 1: Créer le composant**

```typescript
'use client';

import { motion } from 'framer-motion';
import { Users, AlertTriangle, CheckCircle, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TeamMemberStatsDto } from '@/lib/api';
import { cn } from '@/lib/utils';

interface TeamOverviewProps {
  members: TeamMemberStatsDto[];
  onMemberClick?: (agentId: string) => void;
}

export function TeamOverview({ members, onMemberClick }: TeamOverviewProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAlertBadgeColor = (critical: number, warning: number) => {
    if (critical > 0) return 'bg-red-100 text-red-600';
    if (warning > 0) return 'bg-orange-100 text-orange-600';
    return 'bg-emerald-100 text-emerald-600';
  };

  const getAlertIcon = (critical: number, warning: number) => {
    if (critical > 0 || warning > 0) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <CheckCircle className="h-4 w-4" />;
  };

  const getAlertText = (critical: number, warning: number) => {
    if (critical > 0) return critical;
    if (warning > 0) return warning;
    return '0';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-lg font-serif flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            Mon équipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member, index) => (
              <motion.button
                key={member.agentId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                onClick={() => onMemberClick?.(member.agentId)}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-white/50 hover:bg-white/80 transition-all hover:shadow-sm text-left"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.photoUrl || undefined} alt={member.agentName} />
                  <AvatarFallback className="bg-taupe/20 text-charcoal">
                    {getInitials(member.agentName)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-charcoal truncate">{member.agentName}</p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Active deals */}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{member.activeDeals}</span>
                  </div>

                  {/* Alerts badge */}
                  <div className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-medium',
                    getAlertBadgeColor(member.alertCritical, member.alertWarning)
                  )}>
                    {getAlertIcon(member.alertCritical, member.alertWarning)}
                    <span>{getAlertText(member.alertCritical, member.alertWarning)}</span>
                  </div>

                  {/* Completed this month */}
                  <div className="flex items-center gap-1.5 text-sm text-emerald-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>{member.completedThisMonth}</span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

**Step 2: Vérifier le build**

Run: `cd frontend && npm run build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add frontend/components/dashboard/TeamOverview.tsx
git commit -m "feat(frontend): add TeamOverview component with member stats"
```

---

## Task 15: Créer le composant AgentDrilldown

**Files:**
- Create: `frontend/components/dashboard/AgentDrilldown.tsx`

**Step 1: Créer le composant**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KpiCards } from './KpiCards';
import { AlertSection } from './AlertSection';
import { WeekSection } from './WeekSection';
import { AgentDashboardDto, organizationApi, TeamMemberStatsDto } from '@/lib/api';

interface AgentDrilldownProps {
  agent: TeamMemberStatsDto | null;
  token: string;
  onClose: () => void;
}

export function AgentDrilldown({ agent, token, onClose }: AgentDrilldownProps) {
  const [dashboard, setDashboard] = useState<AgentDashboardDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (agent) {
      loadDashboard();
    }
  }, [agent]);

  const loadDashboard = async () => {
    if (!agent) return;

    setIsLoading(true);
    try {
      const data = await organizationApi.getAgentDashboard(token, agent.agentId);
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load agent dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {agent && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-cream z-50 shadow-2xl overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-cream/95 backdrop-blur-sm border-b border-border/50 p-6 flex items-center justify-between z-10">
              <h2 className="text-xl font-serif text-charcoal">{agent.agentName}</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : dashboard ? (
                <>
                  <KpiCards kpis={dashboard.kpis} />
                  <AlertSection alerts={dashboard.today} />
                  <WeekSection days={dashboard.thisWeek} />
                </>
              ) : (
                <p className="text-center text-muted-foreground py-12">
                  Impossible de charger les données
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

**Step 2: Vérifier le build**

Run: `cd frontend && npm run build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add frontend/components/dashboard/AgentDrilldown.tsx
git commit -m "feat(frontend): add AgentDrilldown drawer component"
```

---

## Task 16: Créer le fichier index pour les exports

**Files:**
- Create: `frontend/components/dashboard/index.ts`

**Step 1: Créer le fichier d'export**

```typescript
export { TrendBadge } from './TrendBadge';
export { KpiCards } from './KpiCards';
export { AlertItem } from './AlertItem';
export { AlertSection } from './AlertSection';
export { WeekItem } from './WeekItem';
export { WeekSection } from './WeekSection';
export { TeamOverview } from './TeamOverview';
export { AgentDrilldown } from './AgentDrilldown';
```

**Step 2: Vérifier le build**

Run: `cd frontend && npm run build`
Expected: Build succeeded

**Step 3: Commit**

```bash
git add frontend/components/dashboard/index.ts
git commit -m "feat(frontend): add dashboard components barrel export"
```

---

## Task 17: Refondre la page dashboard agent

**Files:**
- Modify: `frontend/app/dashboard/page.tsx`

**Step 1: Mettre à jour les imports et le state**

Remplacer les imports existants par :

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { useAuth } from '@/lib/auth';
import { agentApi, stripeApi, AgentDashboardDto } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { KpiCards, AlertSection, WeekSection } from '@/components/dashboard';
```

**Step 2: Mettre à jour le composant pour utiliser le nouvel endpoint**

Remplacer le state et le loadData :

```typescript
export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, agent, refreshAgent } = useAuth();
  const [dashboard, setDashboard] = useState<AgentDashboardDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  // Handle Stripe checkout return
  useEffect(() => {
    const checkoutSuccess = searchParams.get('checkout');
    if (checkoutSuccess === 'success' && token) {
      stripeApi.syncSubscription(token)
        .then(() => refreshAgent())
        .catch(console.error);
    }
  }, [searchParams, token, refreshAgent]);

  const loadData = async () => {
    try {
      const dashboardData = await agentApi.getDashboard(token!);
      setDashboard(dashboardData);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-charcoal">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">
            Bienvenue, {agent?.fullName || agent?.email}
          </p>
        </div>
        <Link href="/dashboard/deals/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau deal
          </Button>
        </Link>
      </div>

      {/* Upgrade banner for trial users */}
      {agent?.subscriptionStatus === 'Trial' && dashboard && dashboard.kpis.activeDeals >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-r from-gold/10 to-gold/5 border-gold/20">
            <CardContent className="p-4 flex items-center justify-between">
              <p className="text-sm text-charcoal">
                Vous utilisez la version d&apos;essai. Passez à la version Pro pour gérer plus de deals.
              </p>
              <Link href="/dashboard/subscription">
                <Button size="sm" variant="outline" className="border-gold text-gold hover:bg-gold/10">
                  Voir les offres
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* KPIs */}
      {dashboard && <KpiCards kpis={dashboard.kpis} />}

      {/* Today's alerts */}
      {dashboard && <AlertSection alerts={dashboard.today} />}

      {/* This week */}
      {dashboard && <WeekSection days={dashboard.thisWeek} />}
    </div>
  );
}
```

**Step 3: Vérifier le build**

Run: `cd frontend && npm run build`
Expected: Build succeeded

**Step 4: Commit**

```bash
git add frontend/app/dashboard/page.tsx
git commit -m "feat(frontend): refactor agent dashboard to use new KPIs and alerts"
```

---

## Task 18: Refondre la page team dashboard

**Files:**
- Modify: `frontend/app/dashboard/team/page.tsx`

**Step 1: Mettre à jour les imports**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { organizationApi, OrgDashboardDto, TeamMemberStatsDto } from '@/lib/api';
import { KpiCards, AlertSection, WeekSection, TeamOverview, AgentDrilldown } from '@/components/dashboard';
```

**Step 2: Mettre à jour le composant**

```typescript
export default function TeamDashboardPage() {
  const router = useRouter();
  const { token, isTeamLeadOrAbove } = useAuth();
  const [dashboard, setDashboard] = useState<OrgDashboardDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<TeamMemberStatsDto | null>(null);

  useEffect(() => {
    if (!isTeamLeadOrAbove()) {
      router.push('/dashboard');
      return;
    }

    if (token) {
      loadData();
    }
  }, [token, isTeamLeadOrAbove, router]);

  const loadData = async () => {
    try {
      const data = await organizationApi.getDashboard(token!);
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load team dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMemberClick = (agentId: string) => {
    const member = dashboard?.team.find(m => m.agentId === agentId);
    if (member) {
      setSelectedAgent(member);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif text-charcoal">Tableau de bord équipe</h1>
        <p className="text-muted-foreground mt-1">
          Vue d&apos;ensemble de l&apos;activité de votre équipe
        </p>
      </div>

      {/* KPIs */}
      {dashboard && <KpiCards kpis={dashboard.kpis} />}

      {/* Today's alerts */}
      {dashboard && <AlertSection alerts={dashboard.today} showAgent />}

      {/* This week */}
      {dashboard && <WeekSection days={dashboard.thisWeek} showAgent />}

      {/* Team overview */}
      {dashboard && (
        <TeamOverview
          members={dashboard.team}
          onMemberClick={handleMemberClick}
        />
      )}

      {/* Agent drilldown drawer */}
      <AgentDrilldown
        agent={selectedAgent}
        token={token!}
        onClose={() => setSelectedAgent(null)}
      />
    </div>
  );
}
```

**Step 3: Vérifier le build**

Run: `cd frontend && npm run build`
Expected: Build succeeded

**Step 4: Commit**

```bash
git add frontend/app/dashboard/team/page.tsx
git commit -m "feat(frontend): refactor team dashboard with KPIs, alerts, and agent drilldown"
```

---

## Task 19: Test d'intégration complet

**Step 1: Démarrer les services**

Run: `docker-compose up --build -d`
Expected: Services start successfully

**Step 2: Vérifier les endpoints backend**

Run: `curl -s http://localhost:5000/swagger/v1/swagger.json | grep -o '"\/api\/agents\/me\/dashboard"'`
Expected: "/api/agents/me/dashboard"

Run: `curl -s http://localhost:5000/swagger/v1/swagger.json | grep -o '"\/api\/organization\/dashboard"'`
Expected: "/api/organization/dashboard"

**Step 3: Vérifier le frontend**

Run: `cd frontend && npm run dev`
Navigate to: http://localhost:3000/dashboard
Expected: New dashboard with KPIs, alerts, and week section visible

**Step 4: Commit final**

```bash
git add -A
git commit -m "feat: complete dashboard indicators implementation

- Add threshold and activity tracking fields to TimelineStep
- Create DashboardService with KPIs and alerts calculation
- Add agent and organization dashboard endpoints
- Create 8 new dashboard components (KpiCards, AlertSection, WeekSection, etc.)
- Refactor agent and team dashboard pages

Closes #dashboard-indicators"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Enrichir TimelineStep | `backend/Data/Entities/TimelineStep.cs` |
| 2 | Mettre à jour template seeds | `backend/Data/EstateFlowDbContext.cs` |
| 3 | Copier seuils du template | `backend/Controllers/DealsController.cs` |
| 4 | Tracker activité | `backend/Controllers/TimelineStepsController.cs` |
| 5 | Créer DashboardService | `backend/Services/DashboardService.cs` |
| 6 | Endpoint agent dashboard | `backend/Controllers/AgentsController.cs` |
| 7 | Endpoints org dashboard | `backend/Controllers/OrganizationController.cs` |
| 8 | Types TypeScript | `frontend/lib/api.ts` |
| 9 | TrendBadge | `frontend/components/dashboard/TrendBadge.tsx` |
| 10 | KpiCards | `frontend/components/dashboard/KpiCards.tsx` |
| 11 | AlertItem | `frontend/components/dashboard/AlertItem.tsx` |
| 12 | AlertSection | `frontend/components/dashboard/AlertSection.tsx` |
| 13 | WeekItem + WeekSection | `frontend/components/dashboard/` |
| 14 | TeamOverview | `frontend/components/dashboard/TeamOverview.tsx` |
| 15 | AgentDrilldown | `frontend/components/dashboard/AgentDrilldown.tsx` |
| 16 | Index exports | `frontend/components/dashboard/index.ts` |
| 17 | Refonte dashboard agent | `frontend/app/dashboard/page.tsx` |
| 18 | Refonte dashboard équipe | `frontend/app/dashboard/team/page.tsx` |
| 19 | Test d'intégration | - |
