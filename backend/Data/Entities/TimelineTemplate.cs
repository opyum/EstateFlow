using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstateFlow.Api.Data.Entities;

[Table("timeline_templates")]
public class TimelineTemplate
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("name")]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [Column("steps", TypeName = "jsonb")]
    public string Steps { get; set; } = "[]";
}
