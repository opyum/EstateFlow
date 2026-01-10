using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstateFlow.Api.Data.Entities;

public enum DealStatus
{
    Active,
    Completed,
    Archived
}

[Table("deals")]
public class Deal
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("agent_id")]
    public Guid AgentId { get; set; }

    [Column("organization_id")]
    public Guid OrganizationId { get; set; }

    [Column("assigned_to_agent_id")]
    public Guid? AssignedToAgentId { get; set; }

    [Column("created_by_agent_id")]
    public Guid? CreatedByAgentId { get; set; }

    [Required]
    [Column("client_name")]
    [MaxLength(255)]
    public string ClientName { get; set; } = string.Empty;

    [Required]
    [Column("client_email")]
    [MaxLength(255)]
    public string ClientEmail { get; set; } = string.Empty;

    [Required]
    [Column("property_address")]
    [MaxLength(500)]
    public string PropertyAddress { get; set; } = string.Empty;

    [Column("property_photo_url")]
    [MaxLength(500)]
    public string? PropertyPhotoUrl { get; set; }

    [Column("welcome_message")]
    public string? WelcomeMessage { get; set; }

    [Column("status")]
    public DealStatus Status { get; set; } = DealStatus.Active;

    [Required]
    [Column("access_token")]
    [MaxLength(64)]
    public string AccessToken { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("AgentId")]
    public Agent Agent { get; set; } = null!;

    [ForeignKey("OrganizationId")]
    public Organization Organization { get; set; } = null!;

    [ForeignKey("AssignedToAgentId")]
    public Agent? AssignedToAgent { get; set; }

    [ForeignKey("CreatedByAgentId")]
    public Agent? CreatedByAgent { get; set; }

    public ICollection<TimelineStep> TimelineSteps { get; set; } = new List<TimelineStep>();
    public ICollection<Document> Documents { get; set; } = new List<Document>();
}
