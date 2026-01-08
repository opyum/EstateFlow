using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data.Entities;

namespace EstateFlow.Api.Data;

public class EstateFlowDbContext : DbContext
{
    public EstateFlowDbContext(DbContextOptions<EstateFlowDbContext> options) : base(options)
    {
    }

    public DbSet<Agent> Agents => Set<Agent>();
    public DbSet<Deal> Deals => Set<Deal>();
    public DbSet<TimelineStep> TimelineSteps => Set<TimelineStep>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<TimelineTemplate> TimelineTemplates => Set<TimelineTemplate>();
    public DbSet<MagicLink> MagicLinks => Set<MagicLink>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Agent
        modelBuilder.Entity<Agent>(entity =>
        {
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.SubscriptionStatus)
                  .HasConversion<string>();
        });

        // Deal
        modelBuilder.Entity<Deal>(entity =>
        {
            entity.HasIndex(e => e.AccessToken).IsUnique();
            entity.Property(e => e.Status)
                  .HasConversion<string>();

            entity.HasOne(d => d.Agent)
                  .WithMany(a => a.Deals)
                  .HasForeignKey(d => d.AgentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // TimelineStep
        modelBuilder.Entity<TimelineStep>(entity =>
        {
            entity.Property(e => e.Status)
                  .HasConversion<string>();

            entity.HasOne(t => t.Deal)
                  .WithMany(d => d.TimelineSteps)
                  .HasForeignKey(t => t.DealId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Document
        modelBuilder.Entity<Document>(entity =>
        {
            entity.Property(e => e.Category)
                  .HasConversion<string>();

            entity.HasOne(d => d.Deal)
                  .WithMany(deal => deal.Documents)
                  .HasForeignKey(d => d.DealId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // MagicLink
        modelBuilder.Entity<MagicLink>(entity =>
        {
            entity.HasIndex(e => e.Token).IsUnique();

            entity.HasOne(m => m.Agent)
                  .WithMany(a => a.MagicLinks)
                  .HasForeignKey(m => m.AgentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Seed timeline templates
        SeedTimelineTemplates(modelBuilder);
    }

    private static void SeedTimelineTemplates(ModelBuilder modelBuilder)
    {
        var templates = new[]
        {
            new TimelineTemplate
            {
                Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                Name = "Achat Appartement",
                Steps = """
                [
                    {"title": "Offre acceptee", "description": "Votre offre a ete acceptee par le vendeur", "order": 1},
                    {"title": "Signature compromis", "description": "Signature du compromis de vente chez le notaire", "order": 2},
                    {"title": "Depot dossier bancaire", "description": "Envoi du dossier complet a la banque", "order": 3},
                    {"title": "Accord de pret", "description": "Reception de l'accord definitif de la banque", "order": 4},
                    {"title": "Levee des conditions suspensives", "description": "Toutes les conditions sont remplies", "order": 5},
                    {"title": "Signature acte authentique", "description": "Signature finale chez le notaire et remise des cles", "order": 6}
                ]
                """
            },
            new TimelineTemplate
            {
                Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                Name = "Vente Maison",
                Steps = """
                [
                    {"title": "Mandat de vente signe", "description": "Le mandat de vente a ete signe", "order": 1},
                    {"title": "Diagnostics realises", "description": "Tous les diagnostics obligatoires ont ete effectues", "order": 2},
                    {"title": "Offre recue", "description": "Une offre d'achat a ete recue", "order": 3},
                    {"title": "Offre acceptee", "description": "L'offre a ete acceptee", "order": 4},
                    {"title": "Signature compromis", "description": "Signature du compromis de vente", "order": 5},
                    {"title": "Purge des droits de preemption", "description": "Delai de preemption termine", "order": 6},
                    {"title": "Signature acte authentique", "description": "Vente finalisee chez le notaire", "order": 7}
                ]
                """
            },
            new TimelineTemplate
            {
                Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                Name = "Location Prestige",
                Steps = """
                [
                    {"title": "Visite effectuee", "description": "Le bien a ete visite", "order": 1},
                    {"title": "Dossier locataire valide", "description": "Le dossier du locataire est complet et valide", "order": 2},
                    {"title": "Bail prepare", "description": "Le contrat de bail est pret", "order": 3},
                    {"title": "Signature du bail", "description": "Le bail a ete signe par toutes les parties", "order": 4},
                    {"title": "Etat des lieux entree", "description": "L'etat des lieux d'entree a ete realise", "order": 5},
                    {"title": "Remise des cles", "description": "Les cles ont ete remises au locataire", "order": 6}
                ]
                """
            }
        };

        modelBuilder.Entity<TimelineTemplate>().HasData(templates);
    }
}
