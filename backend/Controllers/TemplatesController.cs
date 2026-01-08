using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TemplatesController : ControllerBase
{
    private readonly EstateFlowDbContext _context;

    public TemplatesController(EstateFlowDbContext context)
    {
        _context = context;
    }

    public record TemplateDto(Guid Id, string Name, string Steps);

    [HttpGet]
    public async Task<ActionResult<List<TemplateDto>>> GetTemplates()
    {
        var templates = await _context.TimelineTemplates.ToListAsync();
        return Ok(templates.Select(t => new TemplateDto(t.Id, t.Name, t.Steps)));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TemplateDto>> GetTemplate(Guid id)
    {
        var template = await _context.TimelineTemplates.FindAsync(id);

        if (template == null)
            return NotFound(new { error = "Template not found" });

        return Ok(new TemplateDto(template.Id, template.Name, template.Steps));
    }
}
