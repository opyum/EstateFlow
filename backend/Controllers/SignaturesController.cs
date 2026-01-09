using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;
using EstateFlow.Api.Services;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/deals/{dealId:guid}/documents/{documentId:guid}/signature")]
[Authorize]
public class SignaturesController : ControllerBase
{
    private readonly EstateFlowDbContext _context;
    private readonly IYousignService _yousignService;

    public SignaturesController(
        EstateFlowDbContext context,
        IYousignService yousignService)
    {
        _context = context;
        _yousignService = yousignService;
    }

    private Guid GetCurrentAgentId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null ? Guid.Parse(claim.Value) : Guid.Empty;
    }

    public record SignatureRequestDto(string SignatureRequestId, string SignerUrl, string Status);
    public record SignatureStatusDto(string Status, DateTime? SignedAt);

    [HttpPost("request")]
    public async Task<ActionResult<SignatureRequestDto>> RequestSignature(Guid dealId, Guid documentId)
    {
        var agentId = GetCurrentAgentId();
        var deal = await _context.Deals.FirstOrDefaultAsync(d => d.Id == dealId && d.AgentId == agentId);

        if (deal == null)
            return NotFound(new { error = "Deal not found" });

        var document = await _context.Documents.FirstOrDefaultAsync(d => d.Id == documentId && d.DealId == dealId);

        if (document == null)
            return NotFound(new { error = "Document not found" });

        if (document.Category != Data.Entities.DocumentCategory.ToSign)
            return BadRequest(new { error = "Document must be in 'ToSign' category" });

        if (!string.IsNullOrEmpty(document.SignatureRequestId))
            return BadRequest(new { error = "Signature already requested for this document" });

        // Check file exists and is PDF
        if (!System.IO.File.Exists(document.FilePath))
            return NotFound(new { error = "File not found on server" });

        var extension = Path.GetExtension(document.FilePath).ToLowerInvariant();
        if (extension != ".pdf")
            return BadRequest(new { error = "Only PDF documents can be signed" });

        try
        {
            var result = await _yousignService.CreateSignatureRequestAsync(
                document.FilePath,
                deal.ClientEmail,
                deal.ClientName,
                document.Filename
            );

            document.SignatureRequestId = result.SignatureRequestId;
            document.SignatureStatus = result.Status;
            await _context.SaveChangesAsync();

            return Ok(new SignatureRequestDto(
                result.SignatureRequestId,
                result.SignerUrl,
                result.Status
            ));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = $"Failed to create signature request: {ex.Message}" });
        }
    }

    [HttpGet("status")]
    public async Task<ActionResult<SignatureStatusDto>> GetSignatureStatus(Guid dealId, Guid documentId)
    {
        var agentId = GetCurrentAgentId();
        var deal = await _context.Deals.FirstOrDefaultAsync(d => d.Id == dealId && d.AgentId == agentId);

        if (deal == null)
            return NotFound(new { error = "Deal not found" });

        var document = await _context.Documents.FirstOrDefaultAsync(d => d.Id == documentId && d.DealId == dealId);

        if (document == null)
            return NotFound(new { error = "Document not found" });

        if (string.IsNullOrEmpty(document.SignatureRequestId))
            return BadRequest(new { error = "No signature request for this document" });

        try
        {
            var status = await _yousignService.GetSignatureStatusAsync(document.SignatureRequestId);

            // Update local status
            document.SignatureStatus = status.Status;
            if (status.Status == "done" && !document.SignedAt.HasValue)
            {
                document.SignedAt = status.SignedAt;

                // Download signed document
                var signedBytes = await _yousignService.DownloadSignedDocumentAsync(document.SignatureRequestId);
                var signedPath = document.FilePath.Replace(".pdf", "_signed.pdf");
                await System.IO.File.WriteAllBytesAsync(signedPath, signedBytes);
                document.SignedFilePath = signedPath;
            }
            await _context.SaveChangesAsync();

            return Ok(new SignatureStatusDto(status.Status, status.SignedAt));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = $"Failed to get signature status: {ex.Message}" });
        }
    }
}
