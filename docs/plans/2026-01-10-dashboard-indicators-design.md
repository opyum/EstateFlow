# Dashboard Indicateurs - Design Document

**Date**: 2026-01-10
**Objectif**: Créer un dashboard pertinent pour les administrateurs et chefs d'équipe des agences immobilières, axé sur la performance et le pilotage opérationnel.

---

## Décisions de conception

| Aspect | Décision |
|--------|----------|
| Focus | Performance + Pilotage opérationnel |
| Horizon temporel | Aujourd'hui + Cette semaine |
| Mesure performance | Évolution temporelle (pas de comparaison entre agents) |
| Système d'alertes | Échéances + Inactivité, niveaux orange/rouge |
| Seuils | Par étape, définis dans templates, override possible par deal |
| Vue équipe | Agrégée + drill-down sur chaque agent |
| KPIs principaux | Deals actifs + en alerte + complétés + délai moyen |
| Actions | Consultation uniquement (pas d'actions rapides) |

---

## 1. Structure des KPIs (Header)

Quatre cartes de KPIs visibles immédiatement en haut du dashboard :

### Carte 1 - Deals actifs
- Nombre total de deals en cours
- Variation vs mois dernier (+/- avec flèche colorée)

### Carte 2 - En alerte
- Nombre de deals ayant au moins une alerte
- Sous-détail : "X critiques, Y à surveiller"
- Carte teintée selon gravité maximale (orange ou rouge)

### Carte 3 - Complétés ce mois
- Nombre de deals passés en "Completed" ce mois
- Variation vs mois dernier

### Carte 4 - Délai moyen
- Durée moyenne pour compléter un deal (création → completion)
- Variation vs mois dernier (+ = dégradation, - = amélioration)

**Scope :**
- Dashboard agent : ses propres chiffres
- Dashboard équipe : agrégé pour l'organisation

---

## 2. Bloc "Aujourd'hui"

Section affichant les éléments nécessitant une attention immédiate.

### Structure

**🔴 Critiques** (en haut, fond rouge léger)
- Étapes dont `dueDate` est dépassée
- Deals inactifs au-delà du seuil critique
- Affichage : Nom du deal, étape concernée, retard (ex: "Signature compromis - 3 jours de retard")

**🟠 À surveiller** (en dessous, fond orange léger)
- Étapes dont `dueDate` arrive aujourd'hui ou demain
- Deals approchant le seuil d'inactivité
- Affichage : Nom du deal, étape concernée, échéance (ex: "Obtention prêt - échéance demain")

**Si aucune alerte :**
- Message positif : "Aucune urgence aujourd'hui ✓" avec fond vert léger

**Dashboard équipe :**
- Chaque ligne affiche aussi le nom de l'agent assigné

**Interaction :**
- Clic sur une ligne → redirection vers la page de gestion du deal

---

## 3. Bloc "Cette semaine"

Section permettant d'anticiper sur les 7 prochains jours.

### Format : Liste triée par date

```
Lundi 13/01
  - Villa Marbella → Signature compromis (InProgress)
  - Appartement Dupont → Acte final (InProgress)

Mardi 14/01
  - Penthouse Nice → Diagnostic (Pending) ⚠️

Mercredi 15/01
  - (aucune échéance)
```

### Chaque élément affiche :
- Nom du deal
- Étape concernée
- Statut actuel (Pending, InProgress)
- Badge d'avertissement si étape "Pending" avec échéance proche

### Dashboard équipe :
- Agent assigné affiché sur chaque ligne

### Navigation :
- Lien "Voir toutes les échéances" pour vue au-delà de 7 jours

---

## 4. Vue équipe (Admin/TeamLead)

Section "Mon équipe" visible uniquement pour Admin et TeamLead.

### Affichage principal

| Agent | Deals actifs | En alerte | Complétés (mois) |
|-------|--------------|-----------|------------------|
| Marie Dupont | 8 | 🔴 2 | 3 |
| Jean Martin | 5 | 🟢 0 | 2 |
| Sophie Leroy | 6 | 🟠 1 | 4 |

### Indicateurs par agent :
- Nombre de deals actifs assignés
- Badge coloré alertes (rouge/orange/vert)
- Deals complétés ce mois

### Drill-down

Cliquer sur un agent ouvre une vue détaillée :
- Ses 4 KPIs personnels
- Son bloc "Aujourd'hui"
- Son bloc "Cette semaine"
- Évolution de ses stats vs mois dernier

Permet au manager de voir exactement ce que voit l'agent.

---

## 5. Modifications du modèle de données

### TimelineTemplateStep (nouveau ou enrichi)

```csharp
public class TimelineTemplateStep
{
    // Existants
    public string Title { get; set; }
    public string Description { get; set; }
    public int Order { get; set; }

    // NOUVEAUX
    public int ExpectedDurationDays { get; set; }      // Durée attendue
    public int InactivityWarningDays { get; set; }     // Seuil alerte orange
    public int InactivityCriticalDays { get; set; }    // Seuil alerte rouge
}
```

### TimelineStep (enrichi)

```csharp
public class TimelineStep
{
    // Existants
    public Guid Id { get; set; }
    public Guid DealId { get; set; }
    public string Title { get; set; }
    public string Status { get; set; }  // Pending, InProgress, Completed
    public DateTime? DueDate { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int Order { get; set; }

    // NOUVEAUX
    public int ExpectedDurationDays { get; set; }      // Hérité du template, modifiable
    public int InactivityWarningDays { get; set; }     // Hérité du template, modifiable
    public int InactivityCriticalDays { get; set; }    // Hérité du template, modifiable
    public DateTime? StartedAt { get; set; }           // Passage en InProgress
    public DateTime? LastActivityAt { get; set; }      // Dernière modification
}
```

### Calcul des alertes

| Type | Condition |
|------|-----------|
| Retard échéance | `dueDate < aujourd'hui` ET `status != Completed` |
| Échéance proche | `dueDate` dans les 2 prochains jours |
| Inactivité warning | `lastActivityAt + warningDays < aujourd'hui` |
| Inactivité critique | `lastActivityAt + criticalDays < aujourd'hui` |

---

## 6. Nouveaux endpoints API

### Dashboard agent individuel

`GET /api/agents/me/dashboard`

```json
{
  "kpis": {
    "activeDeals": 8,
    "activeDealsTrend": 2,
    "alertDeals": 3,
    "alertCritical": 1,
    "alertWarning": 2,
    "completedThisMonth": 4,
    "completedTrend": 1,
    "avgCompletionDays": 45,
    "avgCompletionTrend": -3
  },
  "today": [
    {
      "dealId": "uuid",
      "dealName": "Villa Marbella",
      "clientName": "M. Dupont",
      "stepTitle": "Signature compromis",
      "alertType": "overdue",
      "alertLevel": "critical",
      "daysOverdue": 3,
      "dueDate": "2026-01-07"
    }
  ],
  "thisWeek": [
    {
      "date": "2026-01-13",
      "items": [
        {
          "dealId": "uuid",
          "dealName": "Appartement Nice",
          "clientName": "Mme Martin",
          "stepTitle": "Diagnostic",
          "stepStatus": "InProgress",
          "dueDate": "2026-01-13"
        }
      ]
    }
  ]
}
```

### Dashboard équipe

`GET /api/organization/dashboard` (TeamLead+)

```json
{
  "kpis": {
    // Mêmes champs, agrégés pour l'organisation
  },
  "today": [
    {
      // Mêmes champs + agentId, agentName
    }
  ],
  "thisWeek": [
    // Mêmes champs + agentId, agentName
  ],
  "team": [
    {
      "agentId": "uuid",
      "agentName": "Marie Dupont",
      "photoUrl": "...",
      "activeDeals": 8,
      "alertCritical": 1,
      "alertWarning": 1,
      "completedThisMonth": 3
    }
  ]
}
```

### Drill-down agent

`GET /api/organization/dashboard/agent/{agentId}` (TeamLead+)

Retourne le même format que `/api/agents/me/dashboard` mais pour l'agent spécifié.

---

## 7. Composants frontend

### Nouveaux composants

```
components/dashboard/
  ├── KpiCards.tsx          # Les 4 cartes de KPIs avec tendances
  ├── TrendBadge.tsx        # Flèche +/- avec couleur (vert/rouge)
  ├── AlertSection.tsx      # Bloc "Aujourd'hui" avec alertes groupées
  ├── AlertItem.tsx         # Ligne d'alerte individuelle
  ├── WeekSection.tsx       # Bloc "Cette semaine"
  ├── WeekItem.tsx          # Ligne échéance à venir
  ├── TeamOverview.tsx      # Liste agents avec compteurs
  └── AgentDrilldown.tsx    # Modal/drawer détail agent
```

### Pages modifiées

**`app/dashboard/page.tsx`** (agent individuel)
- Remplacer les stats actuelles par `KpiCards`
- Ajouter `AlertSection` (Aujourd'hui)
- Ajouter `WeekSection` (Cette semaine)
- Appeler `/api/agents/me/dashboard`

**`app/dashboard/team/page.tsx`** (Admin/TeamLead)
- Ajouter `KpiCards` agrégés en haut
- Ajouter `AlertSection` de l'équipe
- Ajouter `WeekSection` de l'équipe
- Remplacer liste actuelle par `TeamOverview`
- Ajouter `AgentDrilldown` (modal ou drawer)

### API client

Ajouter dans `lib/api.ts` :
```typescript
// Agent dashboard
agentApi.getDashboard(): Promise<AgentDashboardResponse>

// Organization dashboard
organizationApi.getDashboard(): Promise<OrgDashboardResponse>
organizationApi.getAgentDashboard(agentId: string): Promise<AgentDashboardResponse>
```

---

## 8. Configuration des seuils

### Interface templates (Admin)

Nouvelle page `/dashboard/templates` ou section dans paramètres organisation.

Pour chaque étape du template :
```
┌─────────────────────────────────────────────────┐
│ Étape : Signature du compromis                  │
│                                                 │
│ Durée attendue : [14] jours                     │
│ Alerte inactivité : [5] jours → orange          │
│ Alerte critique : [10] jours → rouge            │
└─────────────────────────────────────────────────┘
```

### Override par deal (Agent)

Sur la page de gestion du deal, bouton "⚙️ Ajuster les délais" ouvre un panneau pour modifier les seuils de ce deal.

### Règles d'héritage

1. À la création du deal, les valeurs du template sont copiées sur chaque étape
2. Les modifications du template n'affectent PAS les deals existants
3. Les modifications sur un deal n'affectent QUE ce deal

---

## 9. Ce qui n'est PAS inclus

Par choix de conception, les éléments suivants sont exclus de cette version :

- **Comparaison entre agents** : pas de classement ni de benchmarking
- **Engagement client** : vues, téléchargements, analytics client
- **Actions rapides** : pas de modification depuis le dashboard
- **Notifications push** : alertes email ou notifications temps réel

Ces fonctionnalités pourront être ajoutées dans une version ultérieure si nécessaire.

---

## 10. Résumé des modifications

### Backend
- [ ] Enrichir entité `TimelineStep` (5 nouveaux champs)
- [ ] Créer/enrichir entité `TimelineTemplateStep`
- [ ] Endpoint `GET /api/agents/me/dashboard`
- [ ] Endpoint `GET /api/organization/dashboard`
- [ ] Endpoint `GET /api/organization/dashboard/agent/{agentId}`
- [ ] Logique de calcul des alertes (service)

### Frontend
- [ ] 8 nouveaux composants dans `components/dashboard/`
- [ ] Refonte `app/dashboard/page.tsx`
- [ ] Refonte `app/dashboard/team/page.tsx`
- [ ] Page/section configuration templates
- [ ] Panel override seuils par deal
- [ ] Nouvelles méthodes API client

### Base de données
- [ ] Migration pour nouveaux champs `TimelineStep`
- [ ] Migration pour `TimelineTemplateStep` si nouvelle entité
