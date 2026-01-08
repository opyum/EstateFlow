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
