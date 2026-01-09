using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstateFlow.Api.Data.Entities;

public enum DocumentCategory
{
    ToSign,
    Reference
}

[Table("documents")]
public class Document
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("deal_id")]
    public Guid DealId { get; set; }

    [Required]
    [Column("filename")]
    [MaxLength(255)]
    public string Filename { get; set; } = string.Empty;

    [Required]
    [Column("file_path")]
    [MaxLength(500)]
    public string FilePath { get; set; } = string.Empty;

    [Column("category")]
    public DocumentCategory Category { get; set; } = DocumentCategory.Reference;

    [Column("uploaded_at")]
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    [Column("signature_request_id")]
    [MaxLength(100)]
    public string? SignatureRequestId { get; set; }

    [Column("signature_status")]
    [MaxLength(50)]
    public string? SignatureStatus { get; set; }

    [Column("signed_file_path")]
    [MaxLength(500)]
    public string? SignedFilePath { get; set; }

    [Column("signed_at")]
    public DateTime? SignedAt { get; set; }

    // Navigation
    [ForeignKey("DealId")]
    public Deal Deal { get; set; } = null!;
}
