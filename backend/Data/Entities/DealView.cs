using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstateFlow.Api.Data.Entities;

public enum ViewType
{
    PageView,
    DocumentDownload
}

[Table("deal_views")]
public class DealView
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("deal_id")]
    public Guid DealId { get; set; }

    [Column("view_type")]
    public ViewType Type { get; set; } = ViewType.PageView;

    [Column("document_id")]
    public Guid? DocumentId { get; set; }

    [Column("user_agent")]
    [MaxLength(500)]
    public string? UserAgent { get; set; }

    [Column("ip_address")]
    [MaxLength(45)]
    public string? IpAddress { get; set; }

    [Column("viewed_at")]
    public DateTime ViewedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("DealId")]
    public Deal Deal { get; set; } = null!;

    [ForeignKey("DocumentId")]
    public Document? Document { get; set; }
}
