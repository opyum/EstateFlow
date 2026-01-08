# EstateFlow - Digital Deal Room

Application SaaS pour agents immobiliers de luxe permettant d'offrir une experience de suivi de transaction premium a leurs clients.

## Stack Technique

- **Frontend**: Next.js 14, Tailwind CSS, shadcn/ui
- **Backend**: .NET 8 Web API, Entity Framework Core
- **Base de donnees**: PostgreSQL 16
- **Authentification**: Magic Link (JWT)
- **Paiement**: Stripe
- **Emails**: Resend

## Demarrage rapide

### 1. Configurer l'environnement

```bash
cp .env.example .env
```

Editez `.env` avec vos propres valeurs (Stripe, Resend).

### 2. Lancer avec Docker

```bash
docker-compose up --build
```

### 3. Acceder a l'application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Swagger**: http://localhost:5000/swagger

## Structure du projet

```
.
├── backend/                 # API .NET 8
│   ├── Controllers/         # Endpoints API
│   ├── Data/               # DbContext et Entities
│   ├── Services/           # Services metier
│   └── Dockerfile
├── frontend/               # Application Next.js
│   ├── app/               # Pages (App Router)
│   ├── components/        # Composants UI
│   ├── lib/              # Utilitaires et API client
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Fonctionnalites

### Agent
- Authentification par Magic Link
- Dashboard avec statistiques
- Creation/gestion de transactions
- Timeline personnalisable
- Upload de documents
- Branding personnalise (logo, couleurs)
- Gestion abonnement Stripe

### Client
- Acces via lien unique (sans compte)
- Vue timeline interactive
- Telechargement documents
- Contact agent (tel, email, maps)
- Interface mobile-first

## API Endpoints

### Auth
- `POST /api/auth/login` - Envoi magic link
- `POST /api/auth/callback` - Validation token

### Agent
- `GET /api/agents/me` - Profil agent
- `PUT /api/agents/me` - Mise a jour profil
- `GET /api/agents/me/stats` - Statistiques

### Deals
- `GET /api/deals` - Liste des transactions
- `POST /api/deals` - Nouvelle transaction
- `GET /api/deals/{id}` - Detail transaction
- `PUT /api/deals/{id}` - Mise a jour
- `DELETE /api/deals/{id}` - Suppression

### Timeline Steps
- `GET /api/deals/{id}/steps` - Etapes
- `POST /api/deals/{id}/steps` - Nouvelle etape
- `PUT /api/deals/{id}/steps/{stepId}` - Mise a jour etape
- `DELETE /api/deals/{id}/steps/{stepId}` - Suppression

### Documents
- `GET /api/deals/{id}/documents` - Liste documents
- `POST /api/deals/{id}/documents` - Upload
- `GET /api/deals/{id}/documents/{docId}/download` - Telechargement
- `DELETE /api/deals/{id}/documents/{docId}` - Suppression

### Public (Client)
- `GET /api/public/deals/{accessToken}` - Vue client
- `GET /api/public/deals/{accessToken}/documents/{docId}/download` - Telechargement

### Stripe
- `POST /api/stripe/checkout` - Creer session paiement
- `POST /api/stripe/portal` - Acceder portail gestion
- `POST /api/stripe/webhook` - Webhooks Stripe

## Variables d'environnement

Voir `.env.example` pour la liste complete.

## Developpement

### Backend (sans Docker)

```bash
cd backend
dotnet restore
dotnet run
```

### Frontend (sans Docker)

```bash
cd frontend
npm install
npm run dev
```

## Licence

Proprietary - All rights reserved
