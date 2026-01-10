# Design Multi-Tenant EstateFlow

**Date** : 10 janvier 2026
**Statut** : Validé
**Auteur** : Claude + Utilisateur

---

## Résumé

Ajout de fonctionnalités multi-tenant permettant aux agences immobilières d'inviter et gérer leurs employés avec un modèle de tarification par siège.

### Tarification
- Abonnement de base : 49€/mois (inclut l'Admin)
- Siège supplémentaire : 10€/mois par membre invité

### Période d'essai
- Limité à 1 deal
- Pas d'invitation possible pendant l'essai

---

## 1. Modèle de données

### Nouvelles entités

#### Organization
```csharp
public class Organization
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public DateTime CreatedAt { get; set; }

    // Branding (migré depuis Agent)
    public string? BrandColor { get; set; }
    public string? LogoUrl { get; set; }

    // Stripe (migré depuis Agent)
    public string? StripeCustomerId { get; set; }
    public string? StripeSubscriptionId { get; set; }
    public SubscriptionStatus SubscriptionStatus { get; set; }

    // Relations
    public ICollection<OrganizationMember> Members { get; set; }
    public ICollection<Deal> Deals { get; set; }
    public ICollection<Invitation> Invitations { get; set; }
}
```

#### OrganizationMember
```csharp
public class OrganizationMember
{
    public Guid OrganizationId { get; set; }
    public Organization Organization { get; set; }

    public Guid AgentId { get; set; }
    public Agent Agent { get; set; }

    public Role Role { get; set; }
    public DateTime JoinedAt { get; set; }
}

public enum Role
{
    Admin,
    TeamLead,
    Employee
}
```

#### Invitation
```csharp
public class Invitation
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public Organization Organization { get; set; }

    public string Email { get; set; }
    public Role Role { get; set; }
    public string Token { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? AcceptedAt { get; set; }

    // Suivi Stripe
    public string? StripeSubscriptionItemId { get; set; }
}
```

### Modifications aux entités existantes

#### Agent (modifications)
```csharp
public class Agent
{
    public Guid Id { get; set; }
    public string Email { get; set; }
    public string Name { get; set; }
    public string? PhotoUrl { get; set; }  // Conservé
    public DateTime CreatedAt { get; set; }

    // SUPPRIMÉ : BrandColor, LogoUrl, StripeCustomerId,
    //            StripeSubscriptionId, SubscriptionStatus

    // Relations
    public ICollection<OrganizationMember> OrganizationMemberships { get; set; }
    public ICollection<MagicLink> MagicLinks { get; set; }
}
```

#### Deal (modifications)
```csharp
public class Deal
{
    // ... champs existants ...

    // NOUVEAU
    public Guid OrganizationId { get; set; }
    public Organization Organization { get; set; }

    // RENOMMÉ : AgentId → AssignedToAgentId
    public Guid AssignedToAgentId { get; set; }
    public Agent AssignedToAgent { get; set; }

    // NOUVEAU
    public Guid CreatedByAgentId { get; set; }
    public Agent CreatedByAgent { get; set; }
}
```

---

## 2. Rôles et permissions

### Matrice des permissions

| Action | Admin | Chef d'équipe | Employé |
|--------|:-----:|:-------------:|:-------:|
| **Deals** |
| Voir ses propres deals | ✅ | ✅ | ✅ |
| Voir tous les deals de l'org | ✅ | ✅ | ❌ |
| Créer un deal | ✅ | ✅ | ✅ |
| Modifier un deal (assigné à soi) | ✅ | ✅ | ✅ |
| Modifier tout deal de l'org | ✅ | ✅ | ❌ |
| Réassigner un deal | ✅ | ✅ | ❌ |
| Supprimer un deal | ✅ | ✅ | ❌ |
| **Membres** |
| Inviter un membre | ✅ | ❌ | ❌ |
| Retirer un membre | ✅ | ❌ | ❌ |
| Changer le rôle d'un membre | ✅ | ❌ | ❌ |
| Transférer le rôle Admin | ✅ | ❌ | ❌ |
| **Organisation** |
| Modifier le branding | ✅ | ❌ | ❌ |
| Accès dashboard équipe | ✅ | ✅ | ❌ |
| **Billing** |
| Gérer abonnement Stripe | ✅ | ❌ | ❌ |
| Voir les factures | ✅ | ❌ | ❌ |

### Contraintes sur les rôles
- **1 seul Admin** par Organisation
- L'Admin peut transférer son rôle à un autre membre (devient alors Chef ou Employé)
- Plusieurs Chefs d'équipe possibles
- Plusieurs Employés possibles

---

## 3. Intégration Stripe

### Configuration Stripe

**Products à créer :**
1. **EstateFlow Pro** - 49€/mois (abonnement de base)
2. **Siège additionnel** - 10€/mois (quantity-based)

**Structure Subscription :**
```
Subscription
├── SubscriptionItem 1: "EstateFlow Pro" (quantity = 1, fixe)
└── SubscriptionItem 2: "Siège additionnel" (quantity = nombre de membres invités)
```

### Flux d'invitation avec Stripe

```
1. Admin clique "Inviter"
   │
2. Backend: stripe.subscriptionItems.update(seatItemId, quantity + 1)
   │
   ├── Échec paiement → Erreur affichée, pas d'invitation
   │
   └── Succès → 3. Création Invitation en DB
                │
                4. Envoi email via Resend
                │
                5. Invité accepte → Ajout OrganizationMember
```

### Flux de suppression membre

```
1. Admin retire un membre
   │
2. Deals du membre → Réassignés automatiquement à l'Admin
   │
3. Backend: stripe.subscriptionItems.update(seatItemId, quantity - 1)
   │
4. Suppression OrganizationMember
   │
5. Prorata calculé automatiquement par Stripe
```

### Webhooks Stripe

| Webhook | Action |
|---------|--------|
| `invoice.payment_failed` | Notifier l'Admin par email |
| `customer.subscription.deleted` | Révoquer accès org (status = Cancelled) |
| `customer.subscription.updated` | Sync SubscriptionStatus |

---

## 4. Flux d'invitation et authentification

### Invitation d'un nouveau membre

1. Admin accède à "Gérer l'équipe" → clique "Inviter"
2. Saisit : email, rôle (Chef d'équipe ou Employé)
3. Backend :
   - Vérifie que l'email n'est pas déjà membre de l'org
   - Met à jour Stripe (ajoute un siège)
   - Crée une `Invitation` avec token unique (expire dans 7 jours)
   - Envoie l'email via Resend
4. Invité reçoit l'email avec lien : `{FRONTEND_URL}/invite/{token}`

### Acceptation de l'invitation

1. Invité clique le lien → page d'acceptation
2. **Si l'email existe déjà** en tant qu'Agent :
   - On l'ajoute à l'Organisation avec le rôle assigné
3. **Si l'email n'existe pas** :
   - Création d'un nouvel Agent (nom saisi sur la page)
   - Ajout à l'Organisation
4. Magic link envoyé pour connexion immédiate

### JWT Claims étendus

```json
{
  "agent_id": "guid",
  "email": "agent@example.com",
  "org_id": "guid",
  "role": "Admin|TeamLead|Employee"
}
```

### Multi-organisation

- Si un Agent appartient à plusieurs orgs → sélecteur d'org après login
- Contexte org actif stocké en localStorage
- Endpoint pour changer d'org active : `POST /api/auth/switch-org`

---

## 5. Dashboard Admin / Chef d'équipe

### Route
`/dashboard/team`

### En-tête - Statistiques

| Statistique | Description |
|-------------|-------------|
| Total deals | Nombre total de deals dans l'org |
| Deals actifs | Deals en cours |
| Complétés ce mois | Deals terminés dans le mois |
| Membres | Nombre de membres dans l'équipe |

### Liste des deals

| Colonne | Description |
|---------|-------------|
| Client | Nom du client |
| Propriété | Adresse du bien |
| Assigné à | Nom + photo de l'agent |
| Statut | Étape actuelle du timeline |
| Dernière activité | Date de dernière modification |

### Filtres

- Par agent assigné (dropdown)
- Par statut (Tous / En cours / Complétés)
- Par période (Ce mois / 3 mois / Tout)

### Actions

- Clic sur une ligne → ouvre le détail du deal
- Bouton "Réassigner" → modal avec liste des membres

---

## 6. Gestion des membres (Admin)

### Route
`/dashboard/team/members`

### Liste des membres

| Colonne | Description |
|---------|-------------|
| Photo | Photo de l'agent |
| Nom | Nom complet |
| Email | Email de contact |
| Rôle | Badge : Admin / Chef d'équipe / Employé |
| Deals actifs | Nombre de deals assignés |
| Rejoint le | Date d'arrivée dans l'org |
| Actions | Boutons selon permissions |

### Actions par membre

- **Changer le rôle** : dropdown (Chef d'équipe ↔ Employé)
- **Retirer de l'équipe** : confirmation requise
- **Transférer Admin** : visible uniquement sur les autres membres

### Section Invitations en attente

| Colonne | Description |
|---------|-------------|
| Email | Email invité |
| Rôle | Rôle proposé |
| Envoyée le | Date d'envoi |
| Expire le | Date d'expiration |
| Action | Annuler (rembourse le siège Stripe) |

---

## 7. Migration des utilisateurs existants

### Stratégie
Migration automatique au déploiement, transparente pour les utilisateurs.

### Script de migration

```csharp
// 1. Pour chaque Agent existant
foreach (var agent in existingAgents)
{
    // Créer Organisation
    var org = new Organization
    {
        Id = Guid.NewGuid(),
        Name = $"{agent.Name}'s Agency",
        BrandColor = agent.BrandColor,
        LogoUrl = agent.LogoUrl,
        StripeCustomerId = agent.StripeCustomerId,
        StripeSubscriptionId = agent.StripeSubscriptionId,
        SubscriptionStatus = agent.SubscriptionStatus,
        CreatedAt = agent.CreatedAt
    };

    // Créer membership Admin
    var membership = new OrganizationMember
    {
        OrganizationId = org.Id,
        AgentId = agent.Id,
        Role = Role.Admin,
        JoinedAt = agent.CreatedAt
    };

    // Migrer les deals
    foreach (var deal in agent.Deals)
    {
        deal.OrganizationId = org.Id;
        deal.AssignedToAgentId = agent.Id;
        deal.CreatedByAgentId = agent.Id;
    }
}

// 2. Supprimer colonnes obsolètes de Agent
// (via migration EF Core)
```

### Résultat
Chaque Agent solo devient Admin de sa propre Organisation à 1 personne. Aucune action requise de leur part.

---

## 8. Endpoints API

### Organisation

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| GET | `/api/organization` | Infos de l'org active | Tous |
| PUT | `/api/organization` | Modifier nom/branding | Admin |
| PUT | `/api/organization/transfer-admin` | Transférer rôle Admin | Admin |

### Membres

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| GET | `/api/organization/members` | Liste des membres | Tous |
| POST | `/api/organization/invite` | Inviter un membre | Admin |
| DELETE | `/api/organization/members/{id}` | Retirer un membre | Admin |
| PUT | `/api/organization/members/{id}/role` | Changer rôle | Admin |

### Invitations

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| GET | `/api/organization/invitations` | Invitations en attente | Admin |
| DELETE | `/api/organization/invitations/{id}` | Annuler invitation | Admin |
| GET | `/api/invite/{token}` | Infos invitation | Public |
| POST | `/api/invite/{token}/accept` | Accepter invitation | Public |

### Dashboard équipe

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| GET | `/api/organization/deals` | Tous les deals de l'org | Admin, TeamLead |
| GET | `/api/organization/stats` | Statistiques org | Admin, TeamLead |
| PUT | `/api/deals/{id}/assign` | Réassigner un deal | Admin, TeamLead |

---

## 9. Pages Frontend

### Nouvelles pages

| Route | Description | Accès |
|-------|-------------|-------|
| `/dashboard/team` | Dashboard équipe | Admin, TeamLead |
| `/dashboard/team/members` | Gestion membres | Admin |
| `/invite/[token]` | Acceptation invitation | Public |

### Modifications existantes

- `/dashboard/branding` → déplacé vers settings org (Admin only)
- Auth context → ajouter `organization` et `role`
- Navigation → conditionner liens selon le rôle
- Header → afficher nom de l'org + sélecteur si multi-org

---

## 10. Résumé des décisions

| Aspect | Décision |
|--------|----------|
| Structure organisationnelle | Migration douce : Agent → Admin de sa propre Org |
| Propriété des deals | Deals assignables/réassignables entre membres |
| Flux d'invitation | Paiement Stripe d'abord, puis envoi email |
| Suppression membre | Deals auto-réassignés à l'Admin |
| Permissions Chef d'équipe | Superviseur : voit tout, réassigne, ne gère pas les membres |
| Branding | Au niveau Organisation (photo personnelle par Agent) |
| Période d'essai | 1 deal max, pas d'invitation |
| Dashboard | Vue synthétique avec filtres |
| Unicité Admin | 1 seul Admin, transférable |
| Tarification | 49€/mois base + 10€/siège supplémentaire |
