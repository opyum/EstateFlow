using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstateFlow.Api.Data.Entities;

public enum SubscriptionStatus
{
    Trial,
    Active,
    Cancelled,
    Expired
}

[Table("agents")]
public class Agent
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("email")]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Column("full_name")]
    [MaxLength(255)]
    public string? FullName { get; set; }

    [Column("phone")]
    [MaxLength(50)]
    public string? Phone { get; set; }

    [Column("photo_url")]
    [MaxLength(500)]
    public string? PhotoUrl { get; set; }

    [Column("brand_color")]
    [MaxLength(7)]
    public string BrandColor { get; set; } = "#1a1a2e";

    [Column("logo_url")]
    [MaxLength(500)]
    public string? LogoUrl { get; set; }

    [Column("social_links", TypeName = "jsonb")]
    public string? SocialLinks { get; set; }

    [Column("subscription_status")]
    public SubscriptionStatus SubscriptionStatus { get; set; } = SubscriptionStatus.Trial;

    [Column("stripe_customer_id")]
    [MaxLength(255)]
    public string? StripeCustomerId { get; set; }

    [Column("stripe_subscription_id")]
    [MaxLength(255)]
    public string? StripeSubscriptionId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Deal> Deals { get; set; } = new List<Deal>();
    public ICollection<MagicLink> MagicLinks { get; set; } = new List<MagicLink>();
}
