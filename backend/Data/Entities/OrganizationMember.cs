using System.ComponentModel.DataAnnotations.Schema;

namespace EstateFlow.Api.Data.Entities;

[Table("organization_members")]
public class OrganizationMember
{
    [Column("organization_id")]
    public Guid OrganizationId { get; set; }

    [ForeignKey("OrganizationId")]
    public Organization Organization { get; set; } = null!;

    [Column("agent_id")]
    public Guid AgentId { get; set; }

    [ForeignKey("AgentId")]
    public Agent Agent { get; set; } = null!;

    [Column("role")]
    public Role Role { get; set; } = Role.Employee;

    [Column("joined_at")]
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
