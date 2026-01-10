# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EstateFlow is a SaaS application for luxury real estate agents to provide premium transaction tracking to their clients. It consists of a Next.js frontend and a .NET 8 backend API with PostgreSQL.

## Development Commands

### Full Stack (Docker)
```bash
docker-compose up --build          # Start all services
docker-compose down -v             # Stop and clean volumes
```

### Backend (.NET 8)
```bash
cd backend
dotnet restore                     # Install dependencies
dotnet run                         # Run on http://localhost:5000
dotnet build                       # Build only
```

### Frontend (Next.js 14)
```bash
cd frontend
npm install                        # Install dependencies
npm run dev                        # Run on http://localhost:3000
npm run build                      # Production build
npm run lint                       # ESLint
```

## Architecture

### Backend Structure
- `Controllers/` - REST API endpoints (Auth, Agents, Deals, Documents, Stripe, Templates, Public)
- `Data/Entities/` - EF Core entities (Agent, Deal, TimelineStep, Document, MagicLink, TimelineTemplate)
- `Data/EstateFlowDbContext.cs` - Database context
- `Services/` - Business logic (AuthService, EmailService)

### Frontend Structure
- `app/` - Next.js App Router pages
  - `app/auth/` - Magic link login flow
  - `app/dashboard/` - Agent dashboard (deals, branding, subscription)
  - `app/deal/[token]/` - Public client view
- `components/ui/` - Reusable UI components (shadcn/ui based)
- `lib/api.ts` - API client with typed endpoints
- `lib/auth.tsx` - Auth context and hooks

### Key Data Flow
1. **Agent Auth**: Email -> Magic Link -> JWT token stored in localStorage
2. **Client Access**: Unique `accessToken` per deal, no login required
3. **Subscriptions**: Stripe Checkout -> Webhook -> Agent.SubscriptionStatus update

## Environment Variables

Copy `.env.example` to `.env`. Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Minimum 32 characters
- `RESEND_API_KEY` - For sending magic link emails
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` - Payment processing
- `FRONTEND_URL` - Used for CORS and email links

## API Conventions

- All authenticated endpoints require `Authorization: Bearer <jwt>` header
- Public client endpoints use `/api/public/deals/{accessToken}` pattern
- Stripe webhooks at `/api/stripe/webhook` (no auth, signature verified)

## Database

PostgreSQL 16 with EF Core. Schema auto-created on startup via `EnsureCreated()`.

Entity relationships:
- Agent -> Deals (1:N)
- Deal -> TimelineSteps (1:N)
- Deal -> Documents (1:N)
- Agent -> MagicLinks (1:N)

## Deployment

### Production Infrastructure
- **Platform**: Dokploy (self-hosted on VPS at 72.62.181.156:3000)
- **Domain**: estateflow.cloud (frontend), api.estateflow.cloud (backend)
- **DNS**: Hostinger

### Deployment Process
1. Push code to `main` branch on GitHub (opyum/EstateFlow)
2. Go to Dokploy dashboard → Projects → EstateFlow → production → estateflow-stack
3. Click "Deploy" button → Confirm
4. Dokploy pulls from GitHub, builds Docker images, and restarts services

### Dokploy Configuration
- **Provider**: Git (SSH key authentication)
- **Repository**: git@github.com:opyum/EstateFlow.git
- **Branch**: main
- **Compose Path**: ./docker-compose.yml
- **Autodeploy**: Enabled (can be triggered via webhook)

### Webhook URL (for CI/CD)
```
http://72.62.181.156:3000/api/deploy/compose/{compose-id}
```

### Services Deployed
- `postgres` - PostgreSQL 16 database
- `backend` - .NET 9 API (port 5000 → 8080 internal)
- `frontend` - Next.js 14 (port 3001 → 3000 internal)

### Monitoring
- Dokploy dashboard: Logs, Deployments, Monitoring tabs
- Health check: https://api.estateflow.cloud/health

## Multi-Tenant Architecture

### Roles
- **Admin**: Full access including Stripe billing, member management, branding
- **TeamLead**: View all deals, reassign deals, access team dashboard, no billing access
- **Employee**: Only their assigned deals, core features only

### Key Entities
- **Organization**: Owns deals and Stripe subscription, has branding (color, logo)
- **OrganizationMember**: Links Agents to Organizations with Role
- **Invitation**: Pending team invites with token, expires in 7 days

### API Authorization
- JWT includes `org_id` and `role` claims
- Use `[RequireAdmin]` or `[RequireTeamLeadOrAbove]` attributes on endpoints
- `IOrganizationContextService` provides current organization context

### Pricing Model
- Base subscription: 49€/month (includes Admin)
- Additional seat: 10€/month per invited member
- Stripe uses quantity-based pricing for seats

### New Endpoints
- `GET/PUT /api/organization` - Organization CRUD
- `GET /api/organization/members` - List members
- `POST /api/organization/invite` - Invite member (adds Stripe seat)
- `DELETE /api/organization/members/{id}` - Remove member (removes Stripe seat)
- `GET/PUT /api/organization/deals` - Team deal management
- `GET /api/invite/{token}` - Get invite info
- `POST /api/invite/{token}/accept` - Accept invitation

### Frontend Routes
- `/dashboard/team` - Team dashboard (Admin, TeamLead)
- `/dashboard/team/members` - Member management (Admin only)
- `/invite/[token]` - Accept invitation (public)
