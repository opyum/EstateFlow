using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;
using EstateFlow.Api.Data.Entities;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/deals/{dealId:guid}/analytics")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly EstateFlowDbContext _context;

    public AnalyticsController(EstateFlowDbContext context)
    {
        _context = context;
    }

    private Guid GetCurrentAgentId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null ? Guid.Parse(claim.Value) : Guid.Empty;
    }

    public record DealAnalyticsDto(
        int TotalViews,
        int TotalDownloads,
        DateTime? LastViewedAt,
        List<ViewEventDto> RecentViews
    );

    public record ViewEventDto(
        string Type,
        string? DocumentName,
        DateTime ViewedAt
    );

    [HttpGet]
    public async Task<ActionResult<DealAnalyticsDto>> GetDealAnalytics(Guid dealId)
    {
        var agentId = GetCurrentAgentId();
        var deal = await _context.Deals.FirstOrDefaultAsync(d => d.Id == dealId && d.AgentId == agentId);

        if (deal == null)
            return NotFound(new { error = "Deal not found" });

        var views = await _context.DealViews
            .Include(v => v.Document)
            .Where(v => v.DealId == dealId)
            .OrderByDescending(v => v.ViewedAt)
            .ToListAsync();

        var totalViews = views.Count(v => v.Type == ViewType.PageView);
        var totalDownloads = views.Count(v => v.Type == ViewType.DocumentDownload);
        var lastViewedAt = views.FirstOrDefault()?.ViewedAt;

        var recentViews = views
            .Take(10)
            .Select(v => new ViewEventDto(
                v.Type.ToString(),
                v.Document?.Filename,
                v.ViewedAt
            ))
            .ToList();

        return Ok(new DealAnalyticsDto(
            totalViews,
            totalDownloads,
            lastViewedAt,
            recentViews
        ));
    }
}
