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

    // Seuils configurables (hérités du template, modifiables par deal)
    [Column("expected_duration_days")]
    public int ExpectedDurationDays { get; set; } = 14;

    [Column("inactivity_warning_days")]
    public int InactivityWarningDays { get; set; } = 5;

    [Column("inactivity_critical_days")]
    public int InactivityCriticalDays { get; set; } = 10;

    // Tracking d'activité
    [Column("started_at")]
    public DateTime? StartedAt { get; set; }

    [Column("last_activity_at")]
    public DateTime? LastActivityAt { get; set; }

    // Navigation
    [ForeignKey("DealId")]
    public Deal Deal { get; set; } = null!;
}
