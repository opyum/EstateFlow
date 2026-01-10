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
                AgentName = deal.AssignedToAgent?.FullName ?? deal.AssignedToAgent?.Email ?? "Non assigne"
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
                        AgentName = deal.AssignedToAgent?.FullName ?? deal.AssignedToAgent?.Email ?? "Non assigne"
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
