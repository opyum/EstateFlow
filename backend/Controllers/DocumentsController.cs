using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;
using EstateFlow.Api.Data.Entities;
using EstateFlow.Api.Services;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/deals/{dealId:guid}/documents")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly EstateFlowDbContext _context;
    private readonly IEmailService _emailService;
    private readonly string _uploadPath;

    // ========== SECURITY: File upload constraints ==========
    private const long MaxFileSize = 10 * 1024 * 1024; // 10 MB
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg"
    };
    private static readonly Dictionary<string, string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        { ".pdf", "application/pdf" },
        { ".doc", "application/msword" },
        { ".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
        { ".xls", "application/vnd.ms-excel" },
        { ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
        { ".png", "image/png" },
        { ".jpg", "image/jpeg" },
        { ".jpeg", "image/jpeg" }
    };

    public DocumentsController(EstateFlowDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
        _uploadPath = Environment.GetEnvironmentVariable("UPLOAD_PATH") ?? "/app/uploads";
    }

    private Guid GetCurrentAgentId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null ? Guid.Parse(claim.Value) : Guid.Empty;
    }

    public record DocumentDto(
        Guid Id,
        string Filename,
        string Category,
        DateTime UploadedAt
    );

    [HttpGet]
    public async Task<ActionResult<List<DocumentDto>>> GetDocuments(Guid dealId)
    {
        var agentId = GetCurrentAgentId();
        var deal = await _context.Deals
            .Include(d => d.Documents)
            .FirstOrDefaultAsync(d => d.Id == dealId && d.AgentId == agentId);

        if (deal == null)
            return NotFound(new { error = "Deal not found" });

        return Ok(deal.Documents.Select(ToDto));
    }

    [HttpPost]
    [RequestSizeLimit(MaxFileSize)]
    public async Task<ActionResult<DocumentDto>> UploadDocument(
        Guid dealId,
        [FromForm] IFormFile file,
        [FromForm] string? category)
    {
        var agentId = GetCurrentAgentId();
        var deal = await _context.Deals.FirstOrDefaultAsync(d => d.Id == dealId && d.AgentId == agentId);

        if (deal == null)
            return NotFound(new { error = "Deal not found" });

        if (file == null || file.Length == 0)
            return BadRequest(new { error = "File is required" });

        // ========== SECURITY: Validate file size ==========
        if (file.Length > MaxFileSize)
            return BadRequest(new { error = $"File size exceeds maximum allowed ({MaxFileSize / 1024 / 1024} MB)" });

        // ========== SECURITY: Validate file extension ==========
        var extension = Path.GetExtension(file.FileName)?.ToLowerInvariant();
        if (string.IsNullOrEmpty(extension) || !AllowedExtensions.Contains(extension))
            return BadRequest(new { error = "File type not allowed. Allowed: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG" });

        // ========== SECURITY: Validate MIME type matches extension ==========
        if (AllowedMimeTypes.TryGetValue(extension, out var expectedMimeType))
        {
            if (!file.ContentType.Equals(expectedMimeType, StringComparison.OrdinalIgnoreCase))
            {
                // Allow some flexibility for JPEG variations
                if (!(extension is ".jpg" or ".jpeg" && file.ContentType.StartsWith("image/jpeg", StringComparison.OrdinalIgnoreCase)))
                {
                    return BadRequest(new { error = "File content does not match extension" });
                }
            }
        }

        // ========== SECURITY: Sanitize filename ==========
        var safeFilename = Path.GetFileNameWithoutExtension(file.FileName);
        safeFilename = string.Concat(safeFilename.Where(c => char.IsLetterOrDigit(c) || c == '-' || c == '_' || c == ' '));
        if (string.IsNullOrEmpty(safeFilename)) safeFilename = "document";
        safeFilename = safeFilename[..Math.Min(safeFilename.Length, 100)] + extension;

        // Parse category
        var docCategory = DocumentCategory.Reference;
        if (!string.IsNullOrEmpty(category) && Enum.TryParse<DocumentCategory>(category, true, out var parsedCategory))
        {
            docCategory = parsedCategory;
        }

        // Create directory if not exists
        var dealFolder = Path.Combine(_uploadPath, dealId.ToString());
        Directory.CreateDirectory(dealFolder);

        // Generate unique filename
        var uniqueName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(dealFolder, uniqueName);

        // ========== SECURITY: Verify path is within upload directory ==========
        var fullPath = Path.GetFullPath(filePath);
        var fullUploadPath = Path.GetFullPath(_uploadPath);
        if (!fullPath.StartsWith(fullUploadPath, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "Invalid file path" });

        // Save file
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Create document record
        var document = new Document
        {
            DealId = dealId,
            Filename = safeFilename,
            FilePath = filePath,
            Category = docCategory
        };

        _context.Documents.Add(document);
        await _context.SaveChangesAsync();

        // Send notification
        var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:3000";
        var dealUrl = $"{frontendUrl}/deal/{deal.AccessToken}";
        await _emailService.SendNewDocumentEmailAsync(
            deal.ClientEmail,
            deal.ClientName,
            safeFilename,
            dealUrl
        );

        return CreatedAtAction(nameof(GetDocuments), new { dealId }, ToDto(document));
    }

    [HttpGet("{documentId:guid}/download")]
    public async Task<ActionResult> DownloadDocument(Guid dealId, Guid documentId)
    {
        var agentId = GetCurrentAgentId();
        var deal = await _context.Deals.FirstOrDefaultAsync(d => d.Id == dealId && d.AgentId == agentId);

        if (deal == null)
            return NotFound(new { error = "Deal not found" });

        var document = await _context.Documents.FirstOrDefaultAsync(d => d.Id == documentId && d.DealId == dealId);

        if (document == null)
            return NotFound(new { error = "Document not found" });

        // ========== SECURITY: Validate file path is within upload directory ==========
        var fullPath = Path.GetFullPath(document.FilePath);
        var fullUploadPath = Path.GetFullPath(_uploadPath);
        if (!fullPath.StartsWith(fullUploadPath, StringComparison.OrdinalIgnoreCase))
            return NotFound(new { error = "File not found" });

        if (!System.IO.File.Exists(fullPath))
            return NotFound(new { error = "File not found on server" });

        var bytes = await System.IO.File.ReadAllBytesAsync(fullPath);
        var contentType = GetContentType(document.Filename);

        return File(bytes, contentType, document.Filename);
    }

    [HttpDelete("{documentId:guid}")]
    public async Task<ActionResult> DeleteDocument(Guid dealId, Guid documentId)
    {
        var agentId = GetCurrentAgentId();
        var deal = await _context.Deals.FirstOrDefaultAsync(d => d.Id == dealId && d.AgentId == agentId);

        if (deal == null)
            return NotFound(new { error = "Deal not found" });

        var document = await _context.Documents.FirstOrDefaultAsync(d => d.Id == documentId && d.DealId == dealId);

        if (document == null)
            return NotFound(new { error = "Document not found" });

        // Delete file
        if (System.IO.File.Exists(document.FilePath))
        {
            System.IO.File.Delete(document.FilePath);
        }

        _context.Documents.Remove(document);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static DocumentDto ToDto(Document doc) => new(
        doc.Id,
        doc.Filename,
        doc.Category.ToString(),
        doc.UploadedAt
    );

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
