using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;
using EstateFlow.Api.Data.Entities;
using EstateFlow.Api.Services;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/deals/{dealId:guid}/steps")]
[Authorize]
public class TimelineStepsController : ControllerBase
{
    private readonly EstateFlowDbContext _context;
    private readonly IEmailService _emailService;

    public TimelineStepsController(EstateFlowDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
    }

    private Guid GetCurrentAgentId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null ? Guid.Parse(claim.Value) : Guid.Empty;
    }

    public record TimelineStepDto(
        Guid Id,
        string Title,
        string? Description,
        string Status,
        DateOnly? DueDate,
        DateTime? CompletedAt,
        int Order
    );

    public record CreateStepRequest(
        string Title,
        string? Description,
        DateOnly? DueDate,
        int? Order
    );

    public record UpdateStepRequest(
        string? Title,
        string? Description,
        string? Status,
        DateOnly? DueDate,
        int? Order
    );

    [HttpGet]
    public async Task<ActionResult<List<TimelineStepDto>>> GetSteps(Guid dealId)
    {
        var agentId = GetCurrentAgentId();
        var deal = await _context.Deals
            .Include(d => d.TimelineSteps.OrderBy(t => t.Order))
            .FirstOrDefaultAsync(d => d.Id == dealId && d.AgentId == agentId);

        if (deal == null)
            return NotFound(new { error = "Deal not found" });

        return Ok(deal.TimelineSteps.Select(ToDto));
    }

    [HttpPost]
    public async Task<ActionResult<TimelineStepDto>> CreateStep(Guid dealId, [FromBody] CreateStepRequest request)
    {
        var agentId = GetCurrentAgentId();
        var deal = await _context.Deals
            .Include(d => d.TimelineSteps)
            .FirstOrDefaultAsync(d => d.Id == dealId && d.AgentId == agentId);

        if (deal == null)
            return NotFound(new { error = "Deal not found" });

        var maxOrder = deal.TimelineSteps.Any() ? deal.TimelineSteps.Max(t => t.Order) : 0;

        var step = new TimelineStep
        {
            DealId = dealId,
            Title = request.Title,
            Description = request.Description,
            DueDate = request.DueDate,
            Order = request.Order ?? maxOrder + 1
        };

        _context.TimelineSteps.Add(step);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSteps), new { dealId }, ToDto(step));
    }

    [HttpPut("{stepId:guid}")]
    public async Task<ActionResult<TimelineStepDto>> UpdateStep(Guid dealId, Guid stepId, [FromBody] UpdateStepRequest request)
    {
        var agentId = GetCurrentAgentId();
        var deal = await _context.Deals.FirstOrDefaultAsync(d => d.Id == dealId && d.AgentId == agentId);

        if (deal == null)
            return NotFound(new { error = "Deal not found" });

        var step = await _context.TimelineSteps.FirstOrDefaultAsync(t => t.Id == stepId && t.DealId == dealId);

        if (step == null)
            return NotFound(new { error = "Step not found" });

        var previousStatus = step.Status;

        if (request.Title != null) step.Title = request.Title;
        if (request.Description != null) step.Description = request.Description;
        if (request.DueDate.HasValue) step.DueDate = request.DueDate;
        if (request.Order.HasValue) step.Order = request.Order.Value;
        if (request.Status != null && Enum.TryParse<StepStatus>(request.Status, true, out var status))
        {
            step.Status = status;
            if (status == StepStatus.Completed && step.CompletedAt == null)
            {
                step.CompletedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();

        // Send notification if status changed
        if (request.Status != null && previousStatus.ToString() != request.Status)
        {
            var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:3000";
            var dealUrl = $"{frontendUrl}/deal/{deal.AccessToken}";
            await _emailService.SendStepUpdateEmailAsync(
                deal.ClientEmail,
                deal.ClientName,
                step.Title,
                step.Status.ToString(),
                dealUrl
            );
        }

        return Ok(ToDto(step));
    }

    [HttpDelete("{stepId:guid}")]
    public async Task<ActionResult> DeleteStep(Guid dealId, Guid stepId)
    {
        var agentId = GetCurrentAgentId();
        var deal = await _context.Deals.FirstOrDefaultAsync(d => d.Id == dealId && d.AgentId == agentId);

        if (deal == null)
            return NotFound(new { error = "Deal not found" });

        var step = await _context.TimelineSteps.FirstOrDefaultAsync(t => t.Id == stepId && t.DealId == dealId);

        if (step == null)
            return NotFound(new { error = "Step not found" });

        _context.TimelineSteps.Remove(step);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static TimelineStepDto ToDto(TimelineStep step) => new(
        step.Id,
        step.Title,
        step.Description,
        step.Status.ToString(),
        step.DueDate,
        step.CompletedAt,
        step.Order
    );
}
