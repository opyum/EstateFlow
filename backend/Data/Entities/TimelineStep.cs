using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstateFlow.Api.Data.Entities;

public enum StepStatus
{
    Pending,
    InProgress,
    Completed
}

[Table("timeline_steps")]
public class TimelineStep
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("deal_id")]
    public Guid DealId { get; set; }

    [Required]
    [Column("title")]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("status")]
    public StepStatus Status { get; set; } = StepStatus.Pending;

    [Column("due_date")]
    public DateOnly? DueDate { get; set; }

    [Column("completed_at")]
    public DateTime? CompletedAt { get; set; }

    [Column("order")]
    public int Order { get; set; }

    // Navigation
    [ForeignKey("DealId")]
    public Deal Deal { get; set; } = null!;
}
