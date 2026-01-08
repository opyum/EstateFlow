using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/public/deals")]
public class PublicDealsController : ControllerBase
{
    private readonly EstateFlowDbContext _context;

    public PublicDealsController(EstateFlowDbContext context)
    {
        _context = context;
    }

    public record PublicDealDto(
        string ClientName,
        string PropertyAddress,
        string? PropertyPhotoUrl,
        string? WelcomeMessage,
        string Status,
        AgentInfoDto Agent,
        List<PublicTimelineStepDto> TimelineSteps,
        List<PublicDocumentDto> Documents
    );

    public record AgentInfoDto(
        string? FullName,
        string Email,
        string? Phone,
        string? PhotoUrl,
        string BrandColor,
        string? LogoUrl,
        string? SocialLinks
    );

    public record PublicTimelineStepDto(
        Guid Id,
        string Title,
        string? Description,
        string Status,
        DateOnly? DueDate,
        DateTime? CompletedAt,
        int Order
    );

    public record PublicDocumentDto(
        Guid Id,
        string Filename,
        string Category,
        DateTime UploadedAt
    );

    [HttpGet("{accessToken}")]
    public async Task<ActionResult<PublicDealDto>> GetDealByToken(string accessToken)
    {
        var deal = await _context.Deals
            .Include(d => d.Agent)
            .Include(d => d.TimelineSteps.OrderBy(t => t.Order))
            .Include(d => d.Documents)
            .FirstOrDefaultAsync(d => d.AccessToken == accessToken);

        if (deal == null)
            return NotFound(new { error = "Deal not found" });

        if (deal.Status == Data.Entities.DealStatus.Archived)
            return NotFound(new { error = "This deal is no longer available" });

        var agentInfo = new AgentInfoDto(
            deal.Agent.FullName,
            deal.Agent.Email,
            deal.Agent.Phone,
            deal.Agent.PhotoUrl,
            deal.Agent.BrandColor,
            deal.Agent.LogoUrl,
            deal.Agent.SocialLinks
        );

        var timelineSteps = deal.TimelineSteps.Select(t => new PublicTimelineStepDto(
            t.Id, t.Title, t.Description, t.Status.ToString(), t.DueDate, t.CompletedAt, t.Order
        )).ToList();

        var documents = deal.Documents.Select(d => new PublicDocumentDto(
            d.Id, d.Filename, d.Category.ToString(), d.UploadedAt
        )).ToList();

        return Ok(new PublicDealDto(
            deal.ClientName,
            deal.PropertyAddress,
            deal.PropertyPhotoUrl,
            deal.WelcomeMessage,
            deal.Status.ToString(),
            agentInfo,
            timelineSteps,
            documents
        ));
    }

    [HttpGet("{accessToken}/documents/{documentId:guid}/download")]
    public async Task<ActionResult> DownloadDocument(string accessToken, Guid documentId)
    {
        var deal = await _context.Deals
            .Include(d => d.Documents)
            .FirstOrDefaultAsync(d => d.AccessToken == accessToken);

        if (deal == null)
            return NotFound(new { error = "Deal not found" });

        var document = deal.Documents.FirstOrDefault(d => d.Id == documentId);

        if (document == null)
            return NotFound(new { error = "Document not found" });

        if (!System.IO.File.Exists(document.FilePath))
            return NotFound(new { error = "File not found on server" });

        var bytes = await System.IO.File.ReadAllBytesAsync(document.FilePath);
        var contentType = GetContentType(document.Filename);

        return File(bytes, contentType, document.Filename);
    }

    private static string GetContentType(string filename)
    {
        var ext = Path.GetExtension(filename).ToLowerInvariant();
        return ext switch
        {
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls" => "application/vnd.ms-excel",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => "application/octet-stream"
        };
    }
}
