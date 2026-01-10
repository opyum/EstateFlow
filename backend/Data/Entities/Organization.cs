using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstateFlow.Api.Data.Entities;

[Table("organizations")]
public class Organization
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("name")]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [Column("brand_color")]
    [MaxLength(7)]
    public string BrandColor { get; set; } = "#1a1a2e";

    [Column("logo_url")]
    [MaxLength(500)]
    public string? LogoUrl { get; set; }

    [Column("subscription_status")]
    public SubscriptionStatus SubscriptionStatus { get; set; } = SubscriptionStatus.Trial;

    [Column("stripe_customer_id")]
    [MaxLength(255)]
    public string? StripeCustomerId { get; set; }

    [Column("stripe_subscription_id")]
    [MaxLength(255)]
    public string? StripeSubscriptionId { get; set; }

    [Column("stripe_seat_item_id")]
    [MaxLength(255)]
    public string? StripeSeatItemId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<OrganizationMember> Members { get; set; } = new List<OrganizationMember>();
    public ICollection<Deal> Deals { get; set; } = new List<Deal>();
    public ICollection<Invitation> Invitations { get; set; } = new List<Invitation>();
}
