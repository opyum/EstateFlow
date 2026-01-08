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

    // Navigation
    [ForeignKey("DealId")]
    public Deal Deal { get; set; } = null!;
}
