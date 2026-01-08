# PRD EstateFlow - Digital Deal Room Immobilier

**Date:** 2026-01-07
**Version:** 1.0
**Statut:** Validé

---

## 1. Vision Produit

**EstateFlow** est une application SaaS B2B2C permettant aux agents immobiliers de luxe d'offrir une expérience de suivi de transaction premium à leurs clients.

**Proposition de valeur:** "Arrêtez de gérer vos millions par SMS. Offrez à vos clients l'expérience de closing qu'ils méritent."

L'agent s'abonne, configure son branding, et génère des "Deal Rooms" pour chaque transaction. Le client final reçoit un lien unique pour suivre son achat.

---

## 2. Architecture Technique

### 2.1 Stack Technique

| Composant | Technologie |
|-----------|-------------|
| **Frontend** | Next.js 14 + Tailwind CSS + shadcn/ui |
| **Backend API** | .NET 8 (Web API) |
| **Base de données** | PostgreSQL 16 |
| **Authentification** | Magic Link (JWT tokens) |
| **Paiement** | Stripe (Checkout + Webhooks) |
| **Emails** | Resend (configurable via env) |
| **Stockage fichiers** | Volume Docker persistant |
| **Orchestration** | Docker Compose (single command) |

### 2.2 Architecture Conteneurs

```
docker-compose.yml
├── frontend (Next.js) - Port 3000
├── backend (ASP.NET 8) - Port 5000
├── postgres (PostgreSQL 16) - Port 5432
└── volumes:
    ├── postgres_data (persistance DB)
    └── uploads_data (documents)
```

### 2.3 Communication

- Frontend <-> Backend : API REST (JSON)
- Backend <-> PostgreSQL : Entity Framework Core
- Backend -> Resend : API HTTP pour emails

---

## 3. Modèle de Données

### 3.1 Table `agents`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Primary Key |
| email | VARCHAR | Unique |
| full_name | VARCHAR | Nom complet |
| phone | VARCHAR | Téléphone |
| photo_url | VARCHAR | URL photo profil |
| brand_color | VARCHAR(7) | Couleur hex (#FF5733) |
| logo_url | VARCHAR | URL logo agence |
| social_links | JSON | {instagram, linkedin, etc.} |
| subscription_status | ENUM | trial, active, cancelled, expired |
| stripe_customer_id | VARCHAR | ID client Stripe |
| stripe_subscription_id | VARCHAR | ID abonnement Stripe |
| created_at | TIMESTAMP | Date création |
| updated_at | TIMESTAMP | Date modification |

### 3.2 Table `deals`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Primary Key |
| agent_id | UUID | FK -> agents |
| client_name | VARCHAR | Nom client |
| client_email | VARCHAR | Email client |
| property_address | VARCHAR | Adresse du bien |
| property_photo_url | VARCHAR | Photo du bien |
| welcome_message | TEXT | Message personnalisé |
| status | ENUM | active, completed, archived |
| access_token | VARCHAR | Token unique URL client |
| created_at | TIMESTAMP | Date création |
| updated_at | TIMESTAMP | Date modification |

### 3.3 Table `timeline_steps`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Primary Key |
| deal_id | UUID | FK -> deals |
| title | VARCHAR | Titre étape |
| description | TEXT | Description détaillée |
| status | ENUM | pending, in_progress, completed |
| due_date | DATE | Date prévue |
| completed_at | TIMESTAMP | Date complétion |
| order | INT | Ordre d'affichage |

### 3.4 Table `documents`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Primary Key |
| deal_id | UUID | FK -> deals |
| filename | VARCHAR | Nom fichier |
| file_path | VARCHAR | Chemin stockage |
| category | ENUM | to_sign, reference |
| uploaded_at | TIMESTAMP | Date upload |

### 3.5 Table `timeline_templates`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Primary Key |
| name | VARCHAR | Nom template (ex: "Achat Condo") |
| steps | JSON | Array des étapes par défaut |

---

## 4. Fonctionnalités Dashboard Agent

### 4.1 Authentification Agent

- Page de connexion avec saisie email
- Envoi Magic Link par email
- Validation du lien -> création session JWT
- Redirection vers dashboard ou onboarding (premier accès)

### 4.2 Onboarding (Première connexion)

- **Étape 1:** Informations personnelles (nom, téléphone, photo)
- **Étape 2:** Branding (logo, couleur primaire)
- **Étape 3:** Réseaux sociaux (optionnel)
- **Étape 4:** Configuration Stripe (redirection Checkout)

### 4.3 Gestion des Transactions (Deals)

- **Liste des deals:** Vue tableau avec statut visuel (badges colorés)
- **Filtres:** Par statut (active, completed, archived)
- **Création de deal:**
  - Sélection d'un template de timeline
  - Infos client (nom, email)
  - Infos bien (adresse, photo)
  - Message de bienvenue personnalisé
  - Génération automatique du lien client unique

### 4.4 Édition d'un Deal

- **Timeline:** Modifier statuts, dates, ajouter/supprimer étapes
- **Documents:** Upload fichiers, catégorisation (à signer / référence)
- **Aperçu:** Voir l'interface client en temps réel
- **Actions:** Renvoyer le lien au client, archiver le deal

### 4.5 Centre de Branding

- Modification logo, couleur, photo, réseaux sociaux
- Prévisualisation en direct de l'interface client

### 4.6 Gestion Abonnement

- Statut actuel, date de renouvellement
- Lien vers portail Stripe (gérer carte, annuler)

---

## 5. Fonctionnalités Interface Client

### 5.1 Accès Client

- URL unique: `app.estateflow.com/deal/{access_token}`
- Aucun compte requis, accès direct via le lien
- Session temporaire (cookie) pour mémoriser la visite

### 5.2 Page d'Accueil "Wow"

- **Hero:** Photo HD du bien en arrière-plan (full-width)
- **Message personnalisé:** "Bonjour Mr & Mme Smith, bienvenue dans le suivi de votre acquisition"
- **Carte Agent:** Photo, nom, téléphone, réseaux sociaux
- **Branding:** Couleurs et logo de l'agent appliqués dynamiquement

### 5.3 Timeline Interactive

- **Design:** Frise verticale, mobile-first
- **États visuels:**
  - Complété: grisé avec check
  - En cours: couleur primaire, pulsation subtile
  - À venir: outline, dates prévisionnelles
- **Détails:** Clic sur étape -> description détaillée
- **Progression:** Barre de progression globale en haut

### 5.4 Coffre-fort Documents

- **Deux sections:**
  - "Documents à signer" (priorité visuelle)
  - "Documents de référence"
- **Actions:** Télécharger, visualiser (PDF inline si possible)
- **Indicateur:** Badge "Nouveau" sur documents récents

### 5.5 Actions Rapides (Footer fixe)

- Bouton "Appeler l'Agent" (tel: link)
- Bouton "Envoyer un Email" (mailto: link)
- Bouton "Voir le Bien" (Google Maps link)

### 5.6 Design Responsive

- Mobile-first absolu (80% des consultations sur téléphone)
- Adaptation tablette et desktop élégante

---

## 6. Intégrations Externes

### 6.1 Emails Transactionnels (Resend)

**Authentification:**
- Magic Link Agent: "Connectez-vous à EstateFlow"

**Notifications Client:**
- Nouveau Deal: "Bienvenue ! Suivez votre acquisition ici"
- Changement d'étape: "Mise à jour : [Étape] est maintenant [Statut]"
- Nouveau document: "Un nouveau document a été ajouté à votre dossier"

**Notifications Agent:**
- Confirmation d'inscription
- Confirmation de paiement
- Rappel d'expiration abonnement (7 jours avant)

### 6.2 Intégration Stripe

**Flux d'inscription:**
1. Agent complète onboarding
2. Redirection vers Stripe Checkout (abonnement 49€/mois)
3. Webhook `checkout.session.completed` -> active le compte
4. Retour vers dashboard

**Webhooks écoutés:**
- `checkout.session.completed` -> active compte
- `invoice.paid` -> maintient accès
- `invoice.payment_failed` -> email alerte
- `customer.subscription.deleted` -> désactive accès

**Portail client:** Lien vers Stripe Billing Portal pour gérer carte/annuler

---

## 7. Plan de Développement

### Phase 1 : Infrastructure Docker

| # | Tâche |
|---|-------|
| 1 | Créer la structure de projet (dossiers frontend/, backend/, docker/) |
| 2 | Configurer `docker-compose.yml` avec les 3 services |
| 3 | Créer Dockerfile pour le backend .NET 8 |
| 4 | Créer Dockerfile pour le frontend Next.js |
| 5 | Configurer les volumes persistants (postgres_data, uploads_data) |
| 6 | Configurer le fichier `.env.example` avec toutes les variables |
| 7 | Tester le démarrage complet avec `docker-compose up` |

### Phase 2 : Backend - Fondations

| # | Tâche |
|---|-------|
| 8 | Initialiser projet ASP.NET 8 Web API |
| 9 | Configurer Entity Framework Core + PostgreSQL |
| 10 | Créer les entités (Agent, Deal, TimelineStep, Document, Template) |
| 11 | Configurer les migrations et le seed des templates |
| 12 | Implémenter le système de Magic Link (génération token, validation) |
| 13 | Configurer l'authentification JWT |
| 14 | Créer les middlewares (auth, error handling, CORS) |

### Phase 3 : Backend - API Agents

| # | Tâche |
|---|-------|
| 15 | Endpoints CRUD Agent (profil, branding) |
| 16 | Endpoints CRUD Deals (create, list, update, archive) |
| 17 | Endpoints CRUD Timeline Steps |
| 18 | Endpoints Upload/Download Documents |
| 19 | Endpoint génération lien client unique |

### Phase 4 : Backend - Intégrations

| # | Tâche |
|---|-------|
| 20 | Configurer service Resend (envoi emails) |
| 21 | Créer templates emails (Magic Link, notifications) |
| 22 | Intégrer Stripe Checkout (création session) |
| 23 | Implémenter webhooks Stripe (payment, subscription) |
| 24 | Endpoint accès portail Stripe (billing portal) |
| 25 | Logique activation/désactivation compte selon abonnement |

### Phase 5 : Frontend - Fondations

| # | Tâche |
|---|-------|
| 26 | Initialiser projet Next.js 14 (App Router) |
| 27 | Configurer Tailwind CSS + shadcn/ui |
| 28 | Créer le système de theming dynamique (couleur agent) |
| 29 | Configurer les appels API (fetch wrapper avec auth) |
| 30 | Créer layouts (Agent Dashboard, Client Public) |
| 31 | Implémenter le système d'authentification côté client |

### Phase 6 : Frontend - Dashboard Agent

| # | Tâche |
|---|-------|
| 32 | Page Login (saisie email, envoi Magic Link) |
| 33 | Page Callback (validation token, redirection) |
| 34 | Wizard Onboarding (4 étapes) |
| 35 | Page Dashboard (liste des deals, stats) |
| 36 | Page Création Deal (formulaire + sélection template) |
| 37 | Page Édition Deal (timeline, documents, aperçu) |
| 38 | Page Branding (formulaire + preview live) |
| 39 | Page Abonnement (statut, lien portail Stripe) |

### Phase 7 : Frontend - Interface Client

| # | Tâche |
|---|-------|
| 40 | Page Deal Client (accès via token) |
| 41 | Composant Hero (photo bien, message bienvenue) |
| 42 | Composant Carte Agent (photo, contact, réseaux) |
| 43 | Composant Timeline Interactive (états visuels) |
| 44 | Composant Coffre-fort Documents (2 sections) |
| 45 | Composant Actions Rapides (footer fixe) |
| 46 | Adaptation responsive (mobile, tablet, desktop) |

### Phase 8 : Notifications & Polish

| # | Tâche |
|---|-------|
| 47 | Implémenter envoi email "Nouveau Deal" au client |
| 48 | Implémenter envoi email "Changement étape" |
| 49 | Implémenter envoi email "Nouveau document" |
| 50 | Ajouter indicateurs visuels "Nouveau" sur documents récents |
| 51 | Optimiser les images (compression, lazy loading) |
| 52 | Ajouter animations subtiles (transitions, hover states) |
| 53 | Implémenter la barre de progression globale |

### Phase 9 : Tests & Déploiement

| # | Tâche |
|---|-------|
| 54 | Tester le flux complet Agent (inscription -> création deal) |
| 55 | Tester le flux complet Client (accès -> navigation) |
| 56 | Tester les webhooks Stripe (paiement, annulation) |
| 57 | Tester la persistance des données (restart containers) |
| 58 | Tester le responsive sur différents devices |
| 59 | Documenter les variables d'environnement (README) |
| 60 | Créer script de seed pour données de démo |

---

## 8. Configuration Docker

### 8.1 Variables d'Environnement

```env
# Base de données
POSTGRES_USER=estateflow
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=estateflow

# Backend
DATABASE_URL=Host=postgres;Database=estateflow;Username=estateflow;Password=your_secure_password
JWT_SECRET=your_jwt_secret_key
JWT_ISSUER=estateflow
JWT_AUDIENCE=estateflow

# Resend (Emails)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@estateflow.com

# Stripe
STRIPE_SECRET_KEY=sk_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_ID=price_xxxxx
STRIPE_PORTAL_RETURN_URL=http://localhost:3000/dashboard

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 8.2 Commande de Lancement

```bash
docker-compose up --build
```

---

## 9. Livrables

| Livrable | Description |
|----------|-------------|
| `docker-compose.yml` | Orchestration complète (1 commande) |
| `frontend/` | Application Next.js 14 |
| `backend/` | API ASP.NET 8 |
| `.env.example` | Template des variables |
| `README.md` | Documentation de démarrage |

---

## 10. Critères de Succès MVP

- [ ] Un agent peut s'inscrire et payer via Stripe
- [ ] Un agent peut configurer son branding (logo, couleur)
- [ ] Un agent peut créer un deal à partir d'un template
- [ ] Un agent peut modifier la timeline et ajouter des documents
- [ ] Un client peut accéder à son deal via lien unique
- [ ] Un client voit la timeline avec le branding de l'agent
- [ ] Un client peut télécharger les documents
- [ ] Les notifications email fonctionnent
- [ ] Tout fonctionne avec `docker-compose up`
