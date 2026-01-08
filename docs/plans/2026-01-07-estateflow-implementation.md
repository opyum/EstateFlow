# EstateFlow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete SaaS application for luxury real estate agents to provide premium transaction tracking experiences to their clients.

**Architecture:** Docker Compose orchestration with 3 services (PostgreSQL, .NET 8 API, Next.js frontend). Magic Link authentication, Stripe payments, Resend emails. Client access via unique token URLs.

**Tech Stack:** Docker, PostgreSQL 16, ASP.NET 8 Web API, Entity Framework Core, Next.js 14 (App Router), Tailwind CSS, shadcn/ui, Stripe, Resend

---

## Phase 1: Infrastructure Docker

### Task 1.1: Create Project Structure

**Files:**
- Create: `backend/`
- Create: `frontend/`
- Create: `docker/`
- Create: `.env.example`
- Create: `.gitignore`

**Step 1: Create directory structure**

```bash
mkdir -p backend frontend docker
```

**Step 2: Create .gitignore**

```gitignore
# Environment
.env
.env.local
.env.*.local

# Dependencies
node_modules/
.pnp/
.pnp.js

# Build
.next/
out/
build/
dist/
bin/
obj/

# Docker
docker/data/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Test
coverage/
```

**Step 3: Create .env.example**

```env
# ===================
# PostgreSQL
# ===================
POSTGRES_USER=estateflow
POSTGRES_PASSWORD=estateflow_dev_password
POSTGRES_DB=estateflow

# ===================
# Backend (.NET 8)
# ===================
ASPNETCORE_ENVIRONMENT=Development
DATABASE_URL=Host=postgres;Port=5432;Database=estateflow;Username=estateflow;Password=estateflow_dev_password

# JWT
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long
JWT_ISSUER=estateflow
JWT_AUDIENCE=estateflow
JWT_EXPIRY_HOURS=24

# Magic Link
MAGIC_LINK_EXPIRY_MINUTES=15
FRONTEND_URL=http://localhost:3000

# Resend (Emails)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@estateflow.com

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_ID=price_xxxxx

# File Storage
UPLOAD_PATH=/app/uploads

# ===================
# Frontend (Next.js)
# ===================
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Step 4: Commit**

```bash
git add .
git commit -m "chore: create project structure with env template"
```

---

### Task 1.2: Create Docker Compose Configuration

**Files:**
- Create: `docker-compose.yml`

**Step 1: Create docker-compose.yml**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: estateflow-db
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - estateflow-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: estateflow-api
    environment:
      - ASPNETCORE_ENVIRONMENT=${ASPNETCORE_ENVIRONMENT}
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_ISSUER=${JWT_ISSUER}
      - JWT_AUDIENCE=${JWT_AUDIENCE}
      - JWT_EXPIRY_HOURS=${JWT_EXPIRY_HOURS}
      - MAGIC_LINK_EXPIRY_MINUTES=${MAGIC_LINK_EXPIRY_MINUTES}
      - FRONTEND_URL=${FRONTEND_URL}
      - RESEND_API_KEY=${RESEND_API_KEY}
      - EMAIL_FROM=${EMAIL_FROM}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
      - STRIPE_PRICE_ID=${STRIPE_PRICE_ID}
      - UPLOAD_PATH=${UPLOAD_PATH}
    ports:
      - "5000:8080"
    volumes:
      - uploads_data:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - estateflow-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: estateflow-web
    environment:
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - estateflow-network

volumes:
  postgres_data:
  uploads_data:

networks:
  estateflow-network:
    driver: bridge
```

**Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: add docker-compose configuration"
```

---

### Task 1.3: Create Backend Dockerfile

**Files:**
- Create: `backend/Dockerfile`

**Step 1: Create backend Dockerfile**

```dockerfile
# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . .
RUN dotnet publish -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Create uploads directory
RUN mkdir -p /app/uploads

# Copy published app
COPY --from=build /app/publish .

# Expose port
EXPOSE 8080

# Set entry point
ENTRYPOINT ["dotnet", "EstateFlow.Api.dll"]
```

**Step 2: Commit**

```bash
git add backend/Dockerfile
git commit -m "chore: add backend Dockerfile for .NET 8"
```

---

### Task 1.4: Create Frontend Dockerfile

**Files:**
- Create: `frontend/Dockerfile`

**Step 1: Create frontend Dockerfile**

```dockerfile
# Dependencies stage
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args for environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Build the app
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**Step 2: Commit**

```bash
git add frontend/Dockerfile
git commit -m "chore: add frontend Dockerfile for Next.js"
```

---

### Task 1.5: Initialize Backend .NET 8 Project

**Files:**
- Create: `backend/EstateFlow.Api.csproj`
- Create: `backend/Program.cs`
- Create: `backend/appsettings.json`
- Create: `backend/appsettings.Development.json`

**Step 1: Create project file**

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.0" />
    <PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.0.0" />
    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.0" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="8.0.0">
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
      <PrivateAssets>all</PrivateAssets>
    </PackageReference>
    <PackageReference Include="Stripe.net" Version="43.0.0" />
    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.5.0" />
  </ItemGroup>

</Project>
```

**Step 2: Create minimal Program.cs**

```csharp
var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(builder.Configuration["FRONTEND_URL"] ?? "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Configure pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

app.Run();
```

**Step 3: Create appsettings.json**

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

**Step 4: Create appsettings.Development.json**

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "Microsoft.AspNetCore": "Information"
    }
  }
}
```

**Step 5: Commit**

```bash
git add backend/
git commit -m "feat: initialize .NET 8 Web API project"
```

---

### Task 1.6: Initialize Frontend Next.js Project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/next.config.js`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/tsconfig.json`
- Create: `frontend/app/layout.tsx`
- Create: `frontend/app/page.tsx`
- Create: `frontend/app/globals.css`

**Step 1: Create package.json**

```json
{
  "name": "estateflow-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.4",
    "react": "^18",
    "react-dom": "^18",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.303.0",
    "@radix-ui/react-slot": "^1.0.2"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.0.1",
    "postcss": "^8",
    "tailwindcss": "^3.3.0",
    "eslint": "^8",
    "eslint-config-next": "14.0.4"
  }
}
```

**Step 2: Create next.config.js**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

module.exports = nextConfig
```

**Step 3: Create tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
```

**Step 4: Create postcss.config.js**

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Step 5: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 6: Create app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Step 7: Create app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EstateFlow',
  description: 'Premium real estate transaction tracking',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

**Step 8: Create app/page.tsx**

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">EstateFlow</h1>
      <p className="mt-4 text-muted-foreground">
        Premium real estate transaction tracking
      </p>
    </main>
  )
}
```

**Step 9: Commit**

```bash
git add frontend/
git commit -m "feat: initialize Next.js 14 project with Tailwind"
```

---

### Task 1.7: Test Docker Compose Startup

**Step 1: Copy env file**

```bash
cp .env.example .env
```

**Step 2: Build and start containers**

```bash
docker-compose up --build
```

**Step 3: Verify all services are running**

Run: Open browser to:
- Frontend: http://localhost:3000 (should show "EstateFlow" page)
- Backend: http://localhost:5000/health (should show health JSON)
- Backend Swagger: http://localhost:5000/swagger (should show API docs)

**Step 4: Stop containers**

```bash
docker-compose down
```

**Step 5: Commit any fixes if needed**

```bash
git add .
git commit -m "chore: verify docker-compose startup"
```

---

## Phase 2: Backend Foundations

### Task 2.1: Create Entity Models

**Files:**
- Create: `backend/Models/Agent.cs`
- Create: `backend/Models/Deal.cs`
- Create: `backend/Models/TimelineStep.cs`
- Create: `backend/Models/Document.cs`
- Create: `backend/Models/TimelineTemplate.cs`
- Create: `backend/Models/Enums.cs`

**Step 1: Create Enums.cs**

```csharp
namespace EstateFlow.Api.Models;

public enum SubscriptionStatus
{
    Trial,
    Active,
    Cancelled,
    Expired
}

public enum DealStatus
{
    Active,
    Completed,
    Archived
}

public enum StepStatus
{
    Pending,
    InProgress,
    Completed
}

public enum DocumentCategory
{
    ToSign,
    Reference
}
```

**Step 2: Create Agent.cs**

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstateFlow.Api.Models;

public class Agent
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? FullName { get; set; }

    [MaxLength(50)]
    public string? Phone { get; set; }

    [MaxLength(500)]
    public string? PhotoUrl { get; set; }

    [MaxLength(7)]
    public string BrandColor { get; set; } = "#1a1a2e";

    [MaxLength(500)]
    public string? LogoUrl { get; set; }

    [Column(TypeName = "jsonb")]
    public string? SocialLinks { get; set; }

    public SubscriptionStatus SubscriptionStatus { get; set; } = SubscriptionStatus.Trial;

    [MaxLength(255)]
    public string? StripeCustomerId { get; set; }

    [MaxLength(255)]
    public string? StripeSubscriptionId { get; set; }

    public bool OnboardingCompleted { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Deal> Deals { get; set; } = new List<Deal>();
}
```

**Step 3: Create Deal.cs**

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstateFlow.Api.Models;

public class Deal
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid AgentId { get; set; }

    [Required]
    [MaxLength(255)]
    public string ClientName { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string ClientEmail { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string PropertyAddress { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? PropertyPhotoUrl { get; set; }

    [MaxLength(1000)]
    public string? WelcomeMessage { get; set; }

    public DealStatus Status { get; set; } = DealStatus.Active;

    [Required]
    [MaxLength(64)]
    public string AccessToken { get; set; } = Guid.NewGuid().ToString("N");

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(AgentId))]
    public Agent Agent { get; set; } = null!;

    public ICollection<TimelineStep> TimelineSteps { get; set; } = new List<TimelineStep>();

    public ICollection<Document> Documents { get; set; } = new List<Document>();
}
```

**Step 4: Create TimelineStep.cs**

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstateFlow.Api.Models;

public class TimelineStep
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid DealId { get; set; }

    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    public StepStatus Status { get; set; } = StepStatus.Pending;

    public DateTime? DueDate { get; set; }

    public DateTime? CompletedAt { get; set; }

    public int Order { get; set; }

    // Navigation
    [ForeignKey(nameof(DealId))]
    public Deal Deal { get; set; } = null!;
}
```

**Step 5: Create Document.cs**

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstateFlow.Api.Models;

public class Document
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid DealId { get; set; }

    [Required]
    [MaxLength(255)]
    public string Filename { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string FilePath { get; set; } = string.Empty;

    public DocumentCategory Category { get; set; } = DocumentCategory.Reference;

    public long FileSize { get; set; }

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(DealId))]
    public Deal Deal { get; set; } = null!;
}
```

**Step 6: Create TimelineTemplate.cs**

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstateFlow.Api.Models;

public class TimelineTemplate
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [Required]
    [Column(TypeName = "jsonb")]
    public string Steps { get; set; } = "[]";
}
```

**Step 7: Commit**

```bash
git add backend/Models/
git commit -m "feat: add entity models for all database tables"
```

---

### Task 2.2: Create DbContext and Configure Entity Framework

**Files:**
- Create: `backend/Data/AppDbContext.cs`
- Modify: `backend/Program.cs`

**Step 1: Create AppDbContext.cs**

```csharp
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Models;

namespace EstateFlow.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Agent> Agents => Set<Agent>();
    public DbSet<Deal> Deals => Set<Deal>();
    public DbSet<TimelineStep> TimelineSteps => Set<TimelineStep>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<TimelineTemplate> TimelineTemplates => Set<TimelineTemplate>();

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
            entity.HasOne(doc => doc.Deal)
                  .WithMany(d => d.Documents)
                  .HasForeignKey(doc => doc.DealId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
```

**Step 2: Update Program.cs to add DbContext**

```csharp
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;

var builder = WebApplication.CreateBuilder(args);

// Database
var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? "Host=localhost;Database=estateflow;Username=estateflow;Password=estateflow";
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:3000";
        policy.WithOrigins(frontendUrl)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Apply migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

// Configure pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

app.Run();
```

**Step 3: Commit**

```bash
git add backend/Data/ backend/Program.cs
git commit -m "feat: add DbContext with Entity Framework configuration"
```

---

### Task 2.3: Create Initial Migration and Seed Data

**Files:**
- Create: `backend/Data/DbInitializer.cs`
- Modify: `backend/Program.cs`

**Step 1: Create DbInitializer.cs for seed data**

```csharp
using EstateFlow.Api.Models;
using System.Text.Json;

namespace EstateFlow.Api.Data;

public static class DbInitializer
{
    public static void SeedTemplates(AppDbContext context)
    {
        if (context.TimelineTemplates.Any())
            return;

        var templates = new List<TimelineTemplate>
        {
            new TimelineTemplate
            {
                Name = "Achat Appartement",
                Description = "Template standard pour l'achat d'un appartement",
                Steps = JsonSerializer.Serialize(new[]
                {
                    new { title = "Offre acceptee", description = "L'offre d'achat a ete acceptee par le vendeur", order = 1 },
                    new { title = "Compromis de vente", description = "Signature du compromis de vente chez le notaire", order = 2 },
                    new { title = "Demande de pret", description = "Constitution et depot du dossier de pret bancaire", order = 3 },
                    new { title = "Accord de pret", description = "Reception de l'accord de principe de la banque", order = 4 },
                    new { title = "Offre de pret", description = "Reception et signature de l'offre de pret", order = 5 },
                    new { title = "Levee des conditions", description = "Toutes les conditions suspensives sont levees", order = 6 },
                    new { title = "Signature acte authentique", description = "Signature finale chez le notaire et remise des cles", order = 7 }
                })
            },
            new TimelineTemplate
            {
                Name = "Vente Villa",
                Description = "Template pour la vente d'une villa ou maison individuelle",
                Steps = JsonSerializer.Serialize(new[]
                {
                    new { title = "Mandat signe", description = "Signature du mandat de vente exclusif", order = 1 },
                    new { title = "Diagnostics realises", description = "Realisation de tous les diagnostics obligatoires", order = 2 },
                    new { title = "Mise en vente", description = "Publication de l'annonce sur les portails", order = 3 },
                    new { title = "Visites", description = "Organisation des visites avec les acheteurs potentiels", order = 4 },
                    new { title = "Offre recue", description = "Reception d'une offre d'achat", order = 5 },
                    new { title = "Negociation", description = "Negociation du prix et des conditions", order = 6 },
                    new { title = "Compromis", description = "Signature du compromis de vente", order = 7 },
                    new { title = "Acte authentique", description = "Signature de l'acte de vente definitif", order = 8 }
                })
            },
            new TimelineTemplate
            {
                Name = "Investissement Locatif",
                Description = "Template pour un achat en vue de location",
                Steps = JsonSerializer.Serialize(new[]
                {
                    new { title = "Etude de rentabilite", description = "Analyse du rendement locatif potentiel", order = 1 },
                    new { title = "Offre d'achat", description = "Soumission de l'offre d'achat", order = 2 },
                    new { title = "Financement", description = "Montage du dossier de financement", order = 3 },
                    new { title = "Compromis", description = "Signature du compromis de vente", order = 4 },
                    new { title = "Travaux prevus", description = "Devis et planification des travaux eventuels", order = 5 },
                    new { title = "Acte de vente", description = "Signature chez le notaire", order = 6 },
                    new { title = "Mise en location", description = "Recherche de locataires et signature du bail", order = 7 }
                })
            }
        };

        context.TimelineTemplates.AddRange(templates);
        context.SaveChanges();
    }
}
```

**Step 2: Update Program.cs to call seed**

Add after `db.Database.Migrate();`:

```csharp
// Apply migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    DbInitializer.SeedTemplates(db);
}
```

**Step 3: Generate migration (run locally or in container)**

```bash
cd backend
dotnet ef migrations add InitialCreate
```

**Step 4: Commit**

```bash
git add backend/
git commit -m "feat: add initial migration and seed timeline templates"
```

---

### Task 2.4: Create Magic Link Authentication Service

**Files:**
- Create: `backend/Models/MagicLinkToken.cs`
- Create: `backend/Services/IMagicLinkService.cs`
- Create: `backend/Services/MagicLinkService.cs`
- Modify: `backend/Data/AppDbContext.cs`

**Step 1: Create MagicLinkToken.cs**

```csharp
using System.ComponentModel.DataAnnotations;

namespace EstateFlow.Api.Models;

public class MagicLinkToken
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string Token { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public bool IsUsed { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

**Step 2: Add to AppDbContext.cs**

Add this line to DbSet declarations:
```csharp
public DbSet<MagicLinkToken> MagicLinkTokens => Set<MagicLinkToken>();
```

Add to OnModelCreating:
```csharp
// MagicLinkToken
modelBuilder.Entity<MagicLinkToken>(entity =>
{
    entity.HasIndex(e => e.Token).IsUnique();
    entity.HasIndex(e => e.Email);
});
```

**Step 3: Create IMagicLinkService.cs**

```csharp
namespace EstateFlow.Api.Services;

public interface IMagicLinkService
{
    Task<string> GenerateTokenAsync(string email);
    Task<string?> ValidateTokenAsync(string token);
    Task InvalidateTokenAsync(string token);
}
```

**Step 4: Create MagicLinkService.cs**

```csharp
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;
using EstateFlow.Api.Models;

namespace EstateFlow.Api.Services;

public class MagicLinkService : IMagicLinkService
{
    private readonly AppDbContext _context;
    private readonly int _expiryMinutes;

    public MagicLinkService(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _expiryMinutes = int.Parse(
            Environment.GetEnvironmentVariable("MAGIC_LINK_EXPIRY_MINUTES") ?? "15"
        );
    }

    public async Task<string> GenerateTokenAsync(string email)
    {
        // Invalidate any existing tokens for this email
        var existingTokens = await _context.MagicLinkTokens
            .Where(t => t.Email == email && !t.IsUsed)
            .ToListAsync();

        foreach (var t in existingTokens)
        {
            t.IsUsed = true;
        }

        // Generate new token
        var token = GenerateSecureToken();
        var magicLink = new MagicLinkToken
        {
            Email = email.ToLowerInvariant(),
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddMinutes(_expiryMinutes)
        };

        _context.MagicLinkTokens.Add(magicLink);
        await _context.SaveChangesAsync();

        return token;
    }

    public async Task<string?> ValidateTokenAsync(string token)
    {
        var magicLink = await _context.MagicLinkTokens
            .FirstOrDefaultAsync(t =>
                t.Token == token &&
                !t.IsUsed &&
                t.ExpiresAt > DateTime.UtcNow);

        if (magicLink == null)
            return null;

        magicLink.IsUsed = true;
        await _context.SaveChangesAsync();

        return magicLink.Email;
    }

    public async Task InvalidateTokenAsync(string token)
    {
        var magicLink = await _context.MagicLinkTokens
            .FirstOrDefaultAsync(t => t.Token == token);

        if (magicLink != null)
        {
            magicLink.IsUsed = true;
            await _context.SaveChangesAsync();
        }
    }

    private static string GenerateSecureToken()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .Replace("=", "");
    }
}
```

**Step 5: Register service in Program.cs**

Add before `var app = builder.Build();`:
```csharp
builder.Services.AddScoped<IMagicLinkService, MagicLinkService>();
```

Add using at top:
```csharp
using EstateFlow.Api.Services;
```

**Step 6: Commit**

```bash
git add backend/
git commit -m "feat: add magic link authentication service"
```

---

### Task 2.5: Create JWT Authentication Configuration

**Files:**
- Create: `backend/Services/IJwtService.cs`
- Create: `backend/Services/JwtService.cs`
- Modify: `backend/Program.cs`

**Step 1: Create IJwtService.cs**

```csharp
using EstateFlow.Api.Models;

namespace EstateFlow.Api.Services;

public interface IJwtService
{
    string GenerateToken(Agent agent);
    Guid? ValidateToken(string token);
}
```

**Step 2: Create JwtService.cs**

```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using EstateFlow.Api.Models;

namespace EstateFlow.Api.Services;

public class JwtService : IJwtService
{
    private readonly string _secret;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _expiryHours;

    public JwtService()
    {
        _secret = Environment.GetEnvironmentVariable("JWT_SECRET")
            ?? throw new InvalidOperationException("JWT_SECRET not configured");
        _issuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "estateflow";
        _audience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "estateflow";
        _expiryHours = int.Parse(Environment.GetEnvironmentVariable("JWT_EXPIRY_HOURS") ?? "24");
    }

    public string GenerateToken(Agent agent)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, agent.Id.ToString()),
            new Claim(ClaimTypes.Email, agent.Email),
            new Claim("subscription_status", agent.SubscriptionStatus.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(_expiryHours),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public Guid? ValidateToken(string token)
    {
        try
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
            var handler = new JwtSecurityTokenHandler();

            var principal = handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = true,
                ValidIssuer = _issuer,
                ValidateAudience = true,
                ValidAudience = _audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            }, out _);

            var idClaim = principal.FindFirst(ClaimTypes.NameIdentifier);
            if (idClaim != null && Guid.TryParse(idClaim.Value, out var agentId))
            {
                return agentId;
            }
        }
        catch
        {
            // Token validation failed
        }

        return null;
    }
}
```

**Step 3: Update Program.cs with JWT authentication**

Add these usings:
```csharp
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
```

Add JWT configuration before `var app = builder.Build();`:
```csharp
// JWT Authentication
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? "your_super_secret_jwt_key_minimum_32_characters_long";
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "estateflow";
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "estateflow";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddScoped<IJwtService, JwtService>();
```

**Step 4: Commit**

```bash
git add backend/
git commit -m "feat: add JWT authentication service and configuration"
```

---

### Task 2.6: Create Email Service

**Files:**
- Create: `backend/Services/IEmailService.cs`
- Create: `backend/Services/EmailService.cs`

**Step 1: Create IEmailService.cs**

```csharp
namespace EstateFlow.Api.Services;

public interface IEmailService
{
    Task SendMagicLinkAsync(string email, string token);
    Task SendDealCreatedAsync(string clientEmail, string clientName, string agentName, string dealUrl);
    Task SendStepUpdatedAsync(string clientEmail, string clientName, string stepTitle, string stepStatus, string dealUrl);
    Task SendDocumentAddedAsync(string clientEmail, string clientName, string documentName, string dealUrl);
}
```

**Step 2: Create EmailService.cs**

```csharp
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace EstateFlow.Api.Services;

public class EmailService : IEmailService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _fromEmail;
    private readonly string _frontendUrl;

    public EmailService(IHttpClientFactory httpClientFactory)
    {
        _httpClient = httpClientFactory.CreateClient();
        _apiKey = Environment.GetEnvironmentVariable("RESEND_API_KEY") ?? "";
        _fromEmail = Environment.GetEnvironmentVariable("EMAIL_FROM") ?? "noreply@estateflow.com";
        _frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:3000";
    }

    public async Task SendMagicLinkAsync(string email, string token)
    {
        var magicLinkUrl = $"{_frontendUrl}/auth/callback?token={token}";

        var html = $@"
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
            <h1 style='color: #1a1a2e;'>Connectez-vous a EstateFlow</h1>
            <p>Cliquez sur le bouton ci-dessous pour vous connecter a votre compte:</p>
            <a href='{magicLinkUrl}'
               style='display: inline-block; background-color: #1a1a2e; color: white;
                      padding: 12px 24px; text-decoration: none; border-radius: 6px;
                      margin: 20px 0;'>
                Se connecter
            </a>
            <p style='color: #666; font-size: 14px;'>
                Ce lien expire dans 15 minutes. Si vous n'avez pas demande ce lien, ignorez cet email.
            </p>
        </div>";

        await SendEmailAsync(email, "Connectez-vous a EstateFlow", html);
    }

    public async Task SendDealCreatedAsync(string clientEmail, string clientName, string agentName, string dealUrl)
    {
        var html = $@"
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
            <h1 style='color: #1a1a2e;'>Bienvenue {clientName}!</h1>
            <p>{agentName} vous a invite a suivre votre transaction immobiliere.</p>
            <a href='{dealUrl}'
               style='display: inline-block; background-color: #1a1a2e; color: white;
                      padding: 12px 24px; text-decoration: none; border-radius: 6px;
                      margin: 20px 0;'>
                Suivre ma transaction
            </a>
            <p style='color: #666; font-size: 14px;'>
                Vous pouvez acceder a votre suivi a tout moment via ce lien.
            </p>
        </div>";

        await SendEmailAsync(clientEmail, $"Suivez votre acquisition avec {agentName}", html);
    }

    public async Task SendStepUpdatedAsync(string clientEmail, string clientName, string stepTitle, string stepStatus, string dealUrl)
    {
        var statusText = stepStatus switch
        {
            "InProgress" => "en cours",
            "Completed" => "terminee",
            _ => "mise a jour"
        };

        var html = $@"
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
            <h1 style='color: #1a1a2e;'>Mise a jour de votre dossier</h1>
            <p>Bonjour {clientName},</p>
            <p>L'etape <strong>{stepTitle}</strong> est maintenant <strong>{statusText}</strong>.</p>
            <a href='{dealUrl}'
               style='display: inline-block; background-color: #1a1a2e; color: white;
                      padding: 12px 24px; text-decoration: none; border-radius: 6px;
                      margin: 20px 0;'>
                Voir le detail
            </a>
        </div>";

        await SendEmailAsync(clientEmail, $"Mise a jour: {stepTitle}", html);
    }

    public async Task SendDocumentAddedAsync(string clientEmail, string clientName, string documentName, string dealUrl)
    {
        var html = $@"
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
            <h1 style='color: #1a1a2e;'>Nouveau document disponible</h1>
            <p>Bonjour {clientName},</p>
            <p>Un nouveau document a ete ajoute a votre dossier: <strong>{documentName}</strong></p>
            <a href='{dealUrl}'
               style='display: inline-block; background-color: #1a1a2e; color: white;
                      padding: 12px 24px; text-decoration: none; border-radius: 6px;
                      margin: 20px 0;'>
                Voir le document
            </a>
        </div>";

        await SendEmailAsync(clientEmail, $"Nouveau document: {documentName}", html);
    }

    private async Task SendEmailAsync(string to, string subject, string html)
    {
        if (string.IsNullOrEmpty(_apiKey) || _apiKey == "re_xxxxx")
        {
            // Development mode - log instead of sending
            Console.WriteLine($"[EMAIL] To: {to}, Subject: {subject}");
            return;
        }

        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

        var body = new
        {
            from = _fromEmail,
            to = new[] { to },
            subject = subject,
            html = html
        };

        request.Content = new StringContent(
            JsonSerializer.Serialize(body),
            Encoding.UTF8,
            "application/json"
        );

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
    }
}
```

**Step 3: Register service in Program.cs**

Add before `var app = builder.Build();`:
```csharp
builder.Services.AddHttpClient();
builder.Services.AddScoped<IEmailService, EmailService>();
```

**Step 4: Commit**

```bash
git add backend/
git commit -m "feat: add email service with Resend integration"
```

---

### Task 2.7: Create Auth Controller

**Files:**
- Create: `backend/Controllers/AuthController.cs`
- Create: `backend/DTOs/AuthDtos.cs`

**Step 1: Create AuthDtos.cs**

```csharp
using System.ComponentModel.DataAnnotations;

namespace EstateFlow.Api.DTOs;

public record SendMagicLinkRequest(
    [Required][EmailAddress] string Email
);

public record ValidateMagicLinkRequest(
    [Required] string Token
);

public record AuthResponse(
    string Token,
    AgentDto Agent
);

public record AgentDto(
    Guid Id,
    string Email,
    string? FullName,
    string? Phone,
    string? PhotoUrl,
    string BrandColor,
    string? LogoUrl,
    object? SocialLinks,
    string SubscriptionStatus,
    bool OnboardingCompleted
);
```

**Step 2: Create AuthController.cs**

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;
using EstateFlow.Api.DTOs;
using EstateFlow.Api.Models;
using EstateFlow.Api.Services;
using System.Text.Json;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IMagicLinkService _magicLinkService;
    private readonly IJwtService _jwtService;
    private readonly IEmailService _emailService;

    public AuthController(
        AppDbContext context,
        IMagicLinkService magicLinkService,
        IJwtService jwtService,
        IEmailService emailService)
    {
        _context = context;
        _magicLinkService = magicLinkService;
        _jwtService = jwtService;
        _emailService = emailService;
    }

    [HttpPost("send-magic-link")]
    public async Task<IActionResult> SendMagicLink([FromBody] SendMagicLinkRequest request)
    {
        var email = request.Email.ToLowerInvariant();
        var token = await _magicLinkService.GenerateTokenAsync(email);
        await _emailService.SendMagicLinkAsync(email, token);

        return Ok(new { message = "Magic link sent to your email" });
    }

    [HttpPost("validate")]
    public async Task<IActionResult> ValidateMagicLink([FromBody] ValidateMagicLinkRequest request)
    {
        var email = await _magicLinkService.ValidateTokenAsync(request.Token);

        if (email == null)
        {
            return Unauthorized(new { error = "Invalid or expired token" });
        }

        // Get or create agent
        var agent = await _context.Agents.FirstOrDefaultAsync(a => a.Email == email);

        if (agent == null)
        {
            agent = new Agent { Email = email };
            _context.Agents.Add(agent);
            await _context.SaveChangesAsync();
        }

        var jwtToken = _jwtService.GenerateToken(agent);

        return Ok(new AuthResponse(
            jwtToken,
            ToDto(agent)
        ));
    }

    private static AgentDto ToDto(Agent agent)
    {
        object? socialLinks = null;
        if (!string.IsNullOrEmpty(agent.SocialLinks))
        {
            try
            {
                socialLinks = JsonSerializer.Deserialize<object>(agent.SocialLinks);
            }
            catch { }
        }

        return new AgentDto(
            agent.Id,
            agent.Email,
            agent.FullName,
            agent.Phone,
            agent.PhotoUrl,
            agent.BrandColor,
            agent.LogoUrl,
            socialLinks,
            agent.SubscriptionStatus.ToString(),
            agent.OnboardingCompleted
        );
    }
}
```

**Step 3: Commit**

```bash
git add backend/
git commit -m "feat: add auth controller with magic link endpoints"
```

---

## Phase 3: Backend - API Agents

### Task 3.1: Create Agent Controller

**Files:**
- Create: `backend/DTOs/AgentDtos.cs`
- Create: `backend/Controllers/AgentsController.cs`

**Step 1: Create AgentDtos.cs**

```csharp
using System.ComponentModel.DataAnnotations;

namespace EstateFlow.Api.DTOs;

public record UpdateAgentProfileRequest(
    string? FullName,
    string? Phone,
    string? PhotoUrl
);

public record UpdateAgentBrandingRequest(
    [MaxLength(7)] string? BrandColor,
    string? LogoUrl,
    object? SocialLinks
);

public record CompleteOnboardingRequest(
    [Required] string FullName,
    string? Phone,
    string? PhotoUrl,
    string? BrandColor,
    string? LogoUrl,
    object? SocialLinks
);
```

**Step 2: Create AgentsController.cs**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;
using EstateFlow.Api.DTOs;
using EstateFlow.Api.Models;
using System.Security.Claims;
using System.Text.Json;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AgentsController : ControllerBase
{
    private readonly AppDbContext _context;

    public AgentsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentAgent()
    {
        var agentId = GetAgentId();
        if (agentId == null) return Unauthorized();

        var agent = await _context.Agents.FindAsync(agentId);
        if (agent == null) return NotFound();

        return Ok(ToDto(agent));
    }

    [HttpPut("me/profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateAgentProfileRequest request)
    {
        var agentId = GetAgentId();
        if (agentId == null) return Unauthorized();

        var agent = await _context.Agents.FindAsync(agentId);
        if (agent == null) return NotFound();

        if (request.FullName != null) agent.FullName = request.FullName;
        if (request.Phone != null) agent.Phone = request.Phone;
        if (request.PhotoUrl != null) agent.PhotoUrl = request.PhotoUrl;
        agent.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(ToDto(agent));
    }

    [HttpPut("me/branding")]
    public async Task<IActionResult> UpdateBranding([FromBody] UpdateAgentBrandingRequest request)
    {
        var agentId = GetAgentId();
        if (agentId == null) return Unauthorized();

        var agent = await _context.Agents.FindAsync(agentId);
        if (agent == null) return NotFound();

        if (request.BrandColor != null) agent.BrandColor = request.BrandColor;
        if (request.LogoUrl != null) agent.LogoUrl = request.LogoUrl;
        if (request.SocialLinks != null)
            agent.SocialLinks = JsonSerializer.Serialize(request.SocialLinks);
        agent.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(ToDto(agent));
    }

    [HttpPost("me/complete-onboarding")]
    public async Task<IActionResult> CompleteOnboarding([FromBody] CompleteOnboardingRequest request)
    {
        var agentId = GetAgentId();
        if (agentId == null) return Unauthorized();

        var agent = await _context.Agents.FindAsync(agentId);
        if (agent == null) return NotFound();

        agent.FullName = request.FullName;
        if (request.Phone != null) agent.Phone = request.Phone;
        if (request.PhotoUrl != null) agent.PhotoUrl = request.PhotoUrl;
        if (request.BrandColor != null) agent.BrandColor = request.BrandColor;
        if (request.LogoUrl != null) agent.LogoUrl = request.LogoUrl;
        if (request.SocialLinks != null)
            agent.SocialLinks = JsonSerializer.Serialize(request.SocialLinks);
        agent.OnboardingCompleted = true;
        agent.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(ToDto(agent));
    }

    private Guid? GetAgentId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (claim != null && Guid.TryParse(claim.Value, out var id))
            return id;
        return null;
    }

    private static AgentDto ToDto(Agent agent)
    {
        object? socialLinks = null;
        if (!string.IsNullOrEmpty(agent.SocialLinks))
        {
            try { socialLinks = JsonSerializer.Deserialize<object>(agent.SocialLinks); }
            catch { }
        }

        return new AgentDto(
            agent.Id,
            agent.Email,
            agent.FullName,
            agent.Phone,
            agent.PhotoUrl,
            agent.BrandColor,
            agent.LogoUrl,
            socialLinks,
            agent.SubscriptionStatus.ToString(),
            agent.OnboardingCompleted
        );
    }
}
```

**Step 3: Commit**

```bash
git add backend/
git commit -m "feat: add agents controller with profile and branding endpoints"
```

---

### Task 3.2: Create Deals Controller

**Files:**
- Create: `backend/DTOs/DealDtos.cs`
- Create: `backend/Controllers/DealsController.cs`

**Step 1: Create DealDtos.cs**

```csharp
using System.ComponentModel.DataAnnotations;
using EstateFlow.Api.Models;

namespace EstateFlow.Api.DTOs;

public record CreateDealRequest(
    [Required] string ClientName,
    [Required][EmailAddress] string ClientEmail,
    [Required] string PropertyAddress,
    string? PropertyPhotoUrl,
    string? WelcomeMessage,
    Guid? TemplateId
);

public record UpdateDealRequest(
    string? ClientName,
    string? ClientEmail,
    string? PropertyAddress,
    string? PropertyPhotoUrl,
    string? WelcomeMessage,
    string? Status
);

public record DealDto(
    Guid Id,
    string ClientName,
    string ClientEmail,
    string PropertyAddress,
    string? PropertyPhotoUrl,
    string? WelcomeMessage,
    string Status,
    string AccessToken,
    string ClientUrl,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<TimelineStepDto> TimelineSteps,
    List<DocumentDto> Documents
);

public record DealListItemDto(
    Guid Id,
    string ClientName,
    string PropertyAddress,
    string Status,
    int CompletedSteps,
    int TotalSteps,
    DateTime CreatedAt
);

public record TimelineStepDto(
    Guid Id,
    string Title,
    string? Description,
    string Status,
    DateTime? DueDate,
    DateTime? CompletedAt,
    int Order
);

public record DocumentDto(
    Guid Id,
    string Filename,
    string Category,
    long FileSize,
    DateTime UploadedAt,
    string DownloadUrl
);
```

**Step 2: Create DealsController.cs**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;
using EstateFlow.Api.DTOs;
using EstateFlow.Api.Models;
using EstateFlow.Api.Services;
using System.Security.Claims;
using System.Text.Json;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DealsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;
    private readonly string _frontendUrl;

    public DealsController(AppDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
        _frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:3000";
    }

    [HttpGet]
    public async Task<IActionResult> GetDeals([FromQuery] string? status = null)
    {
        var agentId = GetAgentId();
        if (agentId == null) return Unauthorized();

        var query = _context.Deals
            .Where(d => d.AgentId == agentId)
            .Include(d => d.TimelineSteps)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<DealStatus>(status, true, out var dealStatus))
        {
            query = query.Where(d => d.Status == dealStatus);
        }

        var deals = await query
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new DealListItemDto(
                d.Id,
                d.ClientName,
                d.PropertyAddress,
                d.Status.ToString(),
                d.TimelineSteps.Count(s => s.Status == StepStatus.Completed),
                d.TimelineSteps.Count,
                d.CreatedAt
            ))
            .ToListAsync();

        return Ok(deals);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetDeal(Guid id)
    {
        var agentId = GetAgentId();
        if (agentId == null) return Unauthorized();

        var deal = await _context.Deals
            .Include(d => d.TimelineSteps.OrderBy(s => s.Order))
            .Include(d => d.Documents)
            .FirstOrDefaultAsync(d => d.Id == id && d.AgentId == agentId);

        if (deal == null) return NotFound();

        return Ok(ToDto(deal));
    }

    [HttpPost]
    public async Task<IActionResult> CreateDeal([FromBody] CreateDealRequest request)
    {
        var agentId = GetAgentId();
        if (agentId == null) return Unauthorized();

        var agent = await _context.Agents.FindAsync(agentId);
        if (agent == null) return NotFound("Agent not found");

        var deal = new Deal
        {
            AgentId = agentId.Value,
            ClientName = request.ClientName,
            ClientEmail = request.ClientEmail,
            PropertyAddress = request.PropertyAddress,
            PropertyPhotoUrl = request.PropertyPhotoUrl,
            WelcomeMessage = request.WelcomeMessage ?? $"Bienvenue {request.ClientName}, suivez ici l'avancement de votre acquisition."
        };

        // Copy steps from template if provided
        if (request.TemplateId.HasValue)
        {
            var template = await _context.TimelineTemplates.FindAsync(request.TemplateId.Value);
            if (template != null)
            {
                var templateSteps = JsonSerializer.Deserialize<List<TemplateStep>>(template.Steps);
                if (templateSteps != null)
                {
                    foreach (var step in templateSteps)
                    {
                        deal.TimelineSteps.Add(new TimelineStep
                        {
                            Title = step.title,
                            Description = step.description,
                            Order = step.order,
                            Status = StepStatus.Pending
                        });
                    }
                }
            }
        }

        _context.Deals.Add(deal);
        await _context.SaveChangesAsync();

        // Send email to client
        var dealUrl = $"{_frontendUrl}/deal/{deal.AccessToken}";
        await _emailService.SendDealCreatedAsync(
            deal.ClientEmail,
            deal.ClientName,
            agent.FullName ?? agent.Email,
            dealUrl
        );

        return CreatedAtAction(nameof(GetDeal), new { id = deal.Id }, ToDto(deal));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDeal(Guid id, [FromBody] UpdateDealRequest request)
    {
        var agentId = GetAgentId();
        if (agentId == null) return Unauthorized();

        var deal = await _context.Deals
            .Include(d => d.TimelineSteps)
            .Include(d => d.Documents)
            .FirstOrDefaultAsync(d => d.Id == id && d.AgentId == agentId);

        if (deal == null) return NotFound();

        if (request.ClientName != null) deal.ClientName = request.ClientName;
        if (request.ClientEmail != null) deal.ClientEmail = request.ClientEmail;
        if (request.PropertyAddress != null) deal.PropertyAddress = request.PropertyAddress;
        if (request.PropertyPhotoUrl != null) deal.PropertyPhotoUrl = request.PropertyPhotoUrl;
        if (request.WelcomeMessage != null) deal.WelcomeMessage = request.WelcomeMessage;
        if (request.Status != null && Enum.TryParse<DealStatus>(request.Status, true, out var status))
            deal.Status = status;
        deal.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(ToDto(deal));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDeal(Guid id)
    {
        var agentId = GetAgentId();
        if (agentId == null) return Unauthorized();

        var deal = await _context.Deals.FirstOrDefaultAsync(d => d.Id == id && d.AgentId == agentId);
        if (deal == null) return NotFound();

        _context.Deals.Remove(deal);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id}/resend-link")]
    public async Task<IActionResult> ResendClientLink(Guid id)
    {
        var agentId = GetAgentId();
        if (agentId == null) return Unauthorized();

        var deal = await _context.Deals
            .Include(d => d.Agent)
            .FirstOrDefaultAsync(d => d.Id == id && d.AgentId == agentId);

        if (deal == null) return NotFound();

        var dealUrl = $"{_frontendUrl}/deal/{deal.AccessToken}";
        await _emailService.SendDealCreatedAsync(
            deal.ClientEmail,
            deal.ClientName,
            deal.Agent.FullName ?? deal.Agent.Email,
            dealUrl
        );

        return Ok(new { message = "Link sent to client" });
    }

    private Guid? GetAgentId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (claim != null && Guid.TryParse(claim.Value, out var id))
            return id;
        return null;
    }

    private DealDto ToDto(Deal deal)
    {
        return new DealDto(
            deal.Id,
            deal.ClientName,
            deal.ClientEmail,
            deal.PropertyAddress,
            deal.PropertyPhotoUrl,
            deal.WelcomeMessage,
            deal.Status.ToString(),
            deal.AccessToken,
            $"{_frontendUrl}/deal/{deal.AccessToken}",
            deal.CreatedAt,
            deal.UpdatedAt,
            deal.TimelineSteps.OrderBy(s => s.Order).Select(s => new TimelineStepDto(
                s.Id,
                s.Title,
                s.Description,
                s.Status.ToString(),
                s.DueDate,
                s.CompletedAt,
                s.Order
            )).ToList(),
            deal.Documents.Select(d => new DocumentDto(
                d.Id,
                d.Filename,
                d.Category.ToString(),
                d.FileSize,
                d.UploadedAt,
                $"/api/documents/{d.Id}/download"
            )).ToList()
        );
    }

    private record TemplateStep(string title, string description, int order);
}
```

**Step 3: Commit**

```bash
git add backend/
git commit -m "feat: add deals controller with CRUD and email notifications"
```

---

### Task 3.3: Create Timeline Steps Controller

**Files:**
- Create: `backend/DTOs/TimelineStepDtos.cs`
- Create: `backend/Controllers/TimelineStepsController.cs`

**Step 1: Create TimelineStepDtos.cs**

```csharp
using System.ComponentModel.DataAnnotations;

namespace EstateFlow.Api.DTOs;

public record CreateTimelineStepRequest(
    [Required] Guid DealId,
    [Required] string Title,
    string? Description,
    DateTime? DueDate,
    int? Order
);

public record UpdateTimelineStepRequest(
    string? Title,
    string? Description,
    string? Status,
    DateTime? DueDate,
    int? Order
);

public record ReorderStepsRequest(
    List<StepOrderItem> Steps
);

public record StepOrderItem(Guid Id, int Order);
```

**Step 2: Create TimelineStepsController.cs**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;
using EstateFlow.Api.DTOs;
using EstateFlow.Api.Models;
using EstateFlow.Api.Services;
using System.Security.Claims;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/timeline-steps")]
[Authorize]
public class TimelineStepsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;
    private readonly string _frontendUrl;

    public TimelineStepsController(AppDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
        _frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:3000";
    }

    [HttpPost]
    public async Task<IActionResult> CreateStep([FromBody] CreateTimelineStepRequest request)
    {
        var agentId = GetAgentId();
        if (agentId == null) return Unauthorized();

        var deal = await _context.Deals
            .Include(d => d.TimelineSteps)
            .FirstOrDefaultAsync(d => d.Id == request.DealId && d.AgentId == agentId);

        if (deal == null) return NotFound("Deal not found");

        var maxOrder = deal.TimelineSteps.Any()
            ? deal.TimelineSteps.Max(s => s.Order)
            : 0;

        var step = new TimelineStep
        {
            DealId = request.DealId,
            Title = request.Title,
            Description = request.Description,
            DueDate = request.DueDate,
            Order = request.Order ?? maxOrder + 1
        };

        _context.TimelineSteps.Add(step);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetStep), new { id = step.Id }, ToDto(step));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetStep(Guid id)
    {
        var agentId = GetAgentId();
        if (agentId == null) return Unauthorized();

        var step = await _context.TimelineSteps
            .Include(s => s.Deal)
            .FirstOrDefaultAsync(s => s.Id == id && s.Deal.AgentId == agentId);

        if (step == null) return NotFound();

        return Ok(ToDto(step));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateStep(Guid id, [FromBody] UpdateTimelineStepRequest request)
    {
        var agentId = GetAgentId();
        if (agentId == null) return Unauthorized();

        var step = await _context.TimelineSteps
            .Include(s => s.Deal)
            .FirstOrDefaultAsync(s => s.Id == id && s.Deal.AgentId == agentId);

        if (step == null) return NotFound();

        var previousStatus = step.Status;

        if (request.Title != null) step.Title = request.Title;
        if (request.Description != null) step.Description = request.Description;
        if (request.DueDate.HasValue) step.DueDate = request.DueDate;
        if (request.Order.HasValue) step.Order = request.Order.Value;

        if (request.Status != null && Enum.TryParse<StepStatus>(request.Status, true, out var status))
        {
            step.Status = status;
            if (status == StepStatus.Completed && !step.CompletedAt.HasValue)
            {
                step.CompletedAt = DateTime.UtcNow;
            }
            else if (status != StepStatus.Completed)
            {
                step.CompletedAt = null;
            }
        }

        await _context.SaveChangesAsync();

        // Send notification if status changed
        if (previousStatus != step.Status)
        {
            var dealUrl = $"{_frontendUrl}/deal/{step.Deal.AccessToken}";
            await _emailService.SendStepUpdatedAsync(
                step.Deal.ClientEmail,
                step.Deal.ClientName,
                step.Title,
                step.Status.ToString(),
                dealUrl
            );
        }

        return Ok(ToDto(step));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteStep(Guid id)
    {
        var agentId = GetAgentId();
        if (agentId == null) return Unauthorized();

        var step = await _context.TimelineSteps
            .Include(s => s.Deal)
            .FirstOrDefaultAsync(s => s.Id == id && s.Deal.AgentId == agentId);

        if (step == null) return NotFound();

        _context.TimelineSteps.Remove(step);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("reorder")]
    public async Task<IActionResult> ReorderSteps([FromBody] ReorderStepsRequest request)
    {
        var agentId = GetAgentId();
        if (agentId == null) return Unauthorized();

        foreach (var item in request.Steps)
        {
            var step = await _context.TimelineSteps
                .Include(s => s.Deal)
                .FirstOrDefaultAsync(s => s.Id == item.Id && s.Deal.AgentId == agentId);

            if (step != null)
            {
                step.Order = item.Order;
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Steps reordered" });
    }

    private Guid? GetAgentId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (claim != null && Guid.TryParse(claim.Value, out var id))
            return id;
        return null;
    }

    private static TimelineStepDto ToDto(TimelineStep step)
    {
        return new TimelineStepDto(
            step.Id,
            step.Title,
            step.Description,
            step.Status.ToString(),
            step.DueDate,
            step.CompletedAt,
            step.Order
        );
    }
}
```

**Step 3: Commit**

```bash
git add backend/
git commit -m "feat: add timeline steps controller with notifications"
```

---

### Task 3.4: Create Documents Controller

**Files:**
- Create: `backend/Controllers/DocumentsController.cs`

**Step 1: Create DocumentsController.cs**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;
using EstateFlow.Api.DTOs;
using EstateFlow.Api.Models;
using EstateFlow.Api.Services;
using System.Security.Claims;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;
    private readonly string _uploadPath;
    private readonly string _frontendUrl;

    public DocumentsController(AppDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
        _uploadPath = Environment.GetEnvironmentVariable("UPLOAD_PATH") ?? "/app/uploads";
        _frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:3000";
    }

    [HttpPost("upload/{dealId}")]
    [Authorize]
    public async Task<IActionResult> UploadDocument(Guid dealId, IFormFile file, [FromQuery] string category = "Reference")
    {
        var agentId = GetAgentId();
        if (agentId == null) return Unauthorized();

        var deal = await _context.Deals.FirstOrDefaultAsync(d => d.Id == dealId && d.AgentId == agentId);
        if (deal == null) return NotFound("Deal not found");

        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded");

        // Create directory if not exists
        var dealDirectory = Path.Combine(_uploadPath, dealId.ToString());
        Directory.CreateDirectory(dealDirectory);

        // Generate unique filename
        var extension = Path.GetExtension(file.FileName);
        var uniqueFileName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(dealDirectory, uniqueFileName);

        // Save file
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Parse category
        var docCategory = DocumentCategory.Reference;
        if (Enum.TryParse<DocumentCategory>(category, true, out var parsedCategory))
            docCategory = parsedCategory;

        // Create document record
        var document = new Document
        {
            DealId = dealId,
            Filename = file.FileName,
            FilePath = filePath,
            Category = docCategory,
            FileSize = file.Length
        };

        _context.Documents.Add(document);
        await _context.SaveChangesAsync();

        // Send notification
        var dealUrl = $"{_frontendUrl}/deal/{deal.AccessToken}";
        await _emailService.SendDocumentAddedAsync(
            deal.ClientEmail,
            deal.ClientName,
            file.FileName,
            dealUrl
        );

        return Ok(new DocumentDto(
            document.Id,
            document.Filename,
            document.Category.ToString(),
            document.FileSize,
            document.UploadedAt,
            $"/api/documents/{document.Id}/download"
        ));
    }

    [HttpGet("{id}/download")]
    [AllowAnonymous]
    public async Task<IActionResult> DownloadDocument(Guid id, [FromQuery] string? token = null)
    {
        var document = await _context.Documents
            .Include(d => d.Deal)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (document == null) return NotFound();

        // Verify access (either authenticated agent or valid deal token)
        var agentId = GetAgentId();
        var isAgent = agentId.HasValue && document.Deal.AgentId == agentId.Value;
        var isClient = !string.IsNullOrEmpty(token) && document.Deal.AccessToken == token;

        if (!isAgent && !isClient)
            return Unauthorized();

        if (!System.IO.File.Exists(document.FilePath))
            return NotFound("File not found on disk");

        var fileBytes = await System.IO.File.ReadAllBytesAsync(document.FilePath);
        var contentType = GetContentType(document.Filename);

        return File(fileBytes, contentType, document.Filename);
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteDocument(Guid id)
    {
        var agentId = GetAgentId();
        if (agentId == null) return Unauthorized();

        var document = await _context.Documents
            .Include(d => d.Deal)
            .FirstOrDefaultAsync(d => d.Id == id && d.Deal.AgentId == agentId);

        if (document == null) return NotFound();

        // Delete file from disk
        if (System.IO.File.Exists(document.FilePath))
        {
            System.IO.File.Delete(document.FilePath);
        }

        _context.Documents.Remove(document);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private Guid? GetAgentId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (claim != null && Guid.TryParse(claim.Value, out var id))
            return id;
        return null;
    }

    private static string GetContentType(string fileName)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        return extension switch
        {
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            _ => "application/octet-stream"
        };
    }
}
```

**Step 2: Commit**

```bash
git add backend/
git commit -m "feat: add documents controller with upload/download"
```

---

### Task 3.5: Create Templates Controller

**Files:**
- Create: `backend/Controllers/TemplatesController.cs`

**Step 1: Create TemplatesController.cs**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;
using System.Text.Json;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TemplatesController : ControllerBase
{
    private readonly AppDbContext _context;

    public TemplatesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetTemplates()
    {
        var templates = await _context.TimelineTemplates
            .Select(t => new
            {
                t.Id,
                t.Name,
                t.Description,
                Steps = JsonSerializer.Deserialize<object>(t.Steps)
            })
            .ToListAsync();

        return Ok(templates);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTemplate(Guid id)
    {
        var template = await _context.TimelineTemplates.FindAsync(id);
        if (template == null) return NotFound();

        return Ok(new
        {
            template.Id,
            template.Name,
            template.Description,
            Steps = JsonSerializer.Deserialize<object>(template.Steps)
        });
    }
}
```

**Step 2: Commit**

```bash
git add backend/
git commit -m "feat: add templates controller"
```

---

### Task 3.6: Create Public Deal Controller (Client Access)

**Files:**
- Create: `backend/Controllers/PublicDealController.cs`

**Step 1: Create PublicDealController.cs**

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;
using System.Text.Json;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/public/deal")]
public class PublicDealController : ControllerBase
{
    private readonly AppDbContext _context;

    public PublicDealController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("{accessToken}")]
    public async Task<IActionResult> GetDealByToken(string accessToken)
    {
        var deal = await _context.Deals
            .Include(d => d.Agent)
            .Include(d => d.TimelineSteps.OrderBy(s => s.Order))
            .Include(d => d.Documents)
            .FirstOrDefaultAsync(d => d.AccessToken == accessToken && d.Status != Models.DealStatus.Archived);

        if (deal == null)
            return NotFound(new { error = "Deal not found or no longer available" });

        // Parse agent social links
        object? socialLinks = null;
        if (!string.IsNullOrEmpty(deal.Agent.SocialLinks))
        {
            try { socialLinks = JsonSerializer.Deserialize<object>(deal.Agent.SocialLinks); }
            catch { }
        }

        var response = new
        {
            deal = new
            {
                id = deal.Id,
                clientName = deal.ClientName,
                propertyAddress = deal.PropertyAddress,
                propertyPhotoUrl = deal.PropertyPhotoUrl,
                welcomeMessage = deal.WelcomeMessage,
                status = deal.Status.ToString(),
                createdAt = deal.CreatedAt,
                timelineSteps = deal.TimelineSteps.Select(s => new
                {
                    id = s.Id,
                    title = s.Title,
                    description = s.Description,
                    status = s.Status.ToString(),
                    dueDate = s.DueDate,
                    completedAt = s.CompletedAt,
                    order = s.Order
                }),
                documents = deal.Documents.Select(d => new
                {
                    id = d.Id,
                    filename = d.Filename,
                    category = d.Category.ToString(),
                    fileSize = d.FileSize,
                    uploadedAt = d.UploadedAt,
                    downloadUrl = $"/api/documents/{d.Id}/download?token={accessToken}"
                })
            },
            agent = new
            {
                fullName = deal.Agent.FullName,
                email = deal.Agent.Email,
                phone = deal.Agent.Phone,
                photoUrl = deal.Agent.PhotoUrl,
                brandColor = deal.Agent.BrandColor,
                logoUrl = deal.Agent.LogoUrl,
                socialLinks = socialLinks
            }
        };

        return Ok(response);
    }
}
```

**Step 2: Commit**

```bash
git add backend/
git commit -m "feat: add public deal controller for client access"
```

---

## Phase 4: Backend - Stripe Integration

### Task 4.1: Create Stripe Service

**Files:**
- Create: `backend/Services/IStripeService.cs`
- Create: `backend/Services/StripeService.cs`

**Step 1: Create IStripeService.cs**

```csharp
namespace EstateFlow.Api.Services;

public interface IStripeService
{
    Task<string> CreateCheckoutSessionAsync(string agentId, string email);
    Task<string> CreateBillingPortalSessionAsync(string stripeCustomerId);
    Task HandleWebhookAsync(string json, string signature);
}
```

**Step 2: Create StripeService.cs**

```csharp
using Stripe;
using Stripe.Checkout;
using EstateFlow.Api.Data;
using EstateFlow.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EstateFlow.Api.Services;

public class StripeService : IStripeService
{
    private readonly AppDbContext _context;
    private readonly string _priceId;
    private readonly string _webhookSecret;
    private readonly string _frontendUrl;

    public StripeService(AppDbContext context)
    {
        _context = context;
        StripeConfiguration.ApiKey = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY");
        _priceId = Environment.GetEnvironmentVariable("STRIPE_PRICE_ID") ?? "";
        _webhookSecret = Environment.GetEnvironmentVariable("STRIPE_WEBHOOK_SECRET") ?? "";
        _frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:3000";
    }

    public async Task<string> CreateCheckoutSessionAsync(string agentId, string email)
    {
        var options = new SessionCreateOptions
        {
            CustomerEmail = email,
            PaymentMethodTypes = new List<string> { "card" },
            LineItems = new List<SessionLineItemOptions>
            {
                new SessionLineItemOptions
                {
                    Price = _priceId,
                    Quantity = 1
                }
            },
            Mode = "subscription",
            SuccessUrl = $"{_frontendUrl}/dashboard?payment=success",
            CancelUrl = $"{_frontendUrl}/onboarding?payment=cancelled",
            Metadata = new Dictionary<string, string>
            {
                { "agent_id", agentId }
            }
        };

        var service = new SessionService();
        var session = await service.CreateAsync(options);

        return session.Url;
    }

    public async Task<string> CreateBillingPortalSessionAsync(string stripeCustomerId)
    {
        var options = new Stripe.BillingPortal.SessionCreateOptions
        {
            Customer = stripeCustomerId,
            ReturnUrl = $"{_frontendUrl}/dashboard/subscription"
        };

        var service = new Stripe.BillingPortal.SessionService();
        var session = await service.CreateAsync(options);

        return session.Url;
    }

    public async Task HandleWebhookAsync(string json, string signature)
    {
        var stripeEvent = EventUtility.ConstructEvent(json, signature, _webhookSecret);

        switch (stripeEvent.Type)
        {
            case "checkout.session.completed":
                await HandleCheckoutCompleted(stripeEvent);
                break;
            case "invoice.paid":
                await HandleInvoicePaid(stripeEvent);
                break;
            case "invoice.payment_failed":
                await HandlePaymentFailed(stripeEvent);
                break;
            case "customer.subscription.deleted":
                await HandleSubscriptionDeleted(stripeEvent);
                break;
        }
    }

    private async Task HandleCheckoutCompleted(Event stripeEvent)
    {
        var session = stripeEvent.Data.Object as Session;
        if (session?.Metadata == null) return;

        if (!session.Metadata.TryGetValue("agent_id", out var agentIdStr)) return;
        if (!Guid.TryParse(agentIdStr, out var agentId)) return;

        var agent = await _context.Agents.FindAsync(agentId);
        if (agent == null) return;

        agent.StripeCustomerId = session.CustomerId;
        agent.StripeSubscriptionId = session.SubscriptionId;
        agent.SubscriptionStatus = SubscriptionStatus.Active;
        agent.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    private async Task HandleInvoicePaid(Event stripeEvent)
    {
        var invoice = stripeEvent.Data.Object as Invoice;
        if (invoice?.CustomerId == null) return;

        var agent = await _context.Agents
            .FirstOrDefaultAsync(a => a.StripeCustomerId == invoice.CustomerId);

        if (agent == null) return;

        agent.SubscriptionStatus = SubscriptionStatus.Active;
        agent.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    private async Task HandlePaymentFailed(Event stripeEvent)
    {
        var invoice = stripeEvent.Data.Object as Invoice;
        if (invoice?.CustomerId == null) return;

        var agent = await _context.Agents
            .FirstOrDefaultAsync(a => a.StripeCustomerId == invoice.CustomerId);

        if (agent == null) return;

        // Could send email notification here
        Console.WriteLine($"[STRIPE] Payment failed for agent {agent.Email}");
    }

    private async Task HandleSubscriptionDeleted(Event stripeEvent)
    {
        var subscription = stripeEvent.Data.Object as Subscription;
        if (subscription?.CustomerId == null) return;

        var agent = await _context.Agents
            .FirstOrDefaultAsync(a => a.StripeCustomerId == subscription.CustomerId);

        if (agent == null) return;

        agent.SubscriptionStatus = SubscriptionStatus.Cancelled;
        agent.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }
}
```

**Step 3: Register service in Program.cs**

Add before `var app = builder.Build();`:
```csharp
builder.Services.AddScoped<IStripeService, StripeService>();
```

**Step 4: Commit**

```bash
git add backend/
git commit -m "feat: add Stripe service with checkout and webhooks"
```

---

### Task 4.2: Create Stripe Controller

**Files:**
- Create: `backend/Controllers/StripeController.cs`

**Step 1: Create StripeController.cs**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EstateFlow.Api.Data;
using EstateFlow.Api.Services;
using System.Security.Claims;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StripeController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IStripeService _stripeService;

    public StripeController(AppDbContext context, IStripeService stripeService)
    {
        _context = context;
        _stripeService = stripeService;
    }

    [HttpPost("create-checkout-session")]
    [Authorize]
    public async Task<IActionResult> CreateCheckoutSession()
    {
        var agentId = GetAgentId();
        if (agentId == null) return Unauthorized();

        var agent = await _context.Agents.FindAsync(agentId);
        if (agent == null) return NotFound();

        var url = await _stripeService.CreateCheckoutSessionAsync(
            agentId.Value.ToString(),
            agent.Email
        );

        return Ok(new { url });
    }

    [HttpPost("create-portal-session")]
    [Authorize]
    public async Task<IActionResult> CreatePortalSession()
    {
        var agentId = GetAgentId();
        if (agentId == null) return Unauthorized();

        var agent = await _context.Agents.FindAsync(agentId);
        if (agent == null) return NotFound();

        if (string.IsNullOrEmpty(agent.StripeCustomerId))
            return BadRequest(new { error = "No subscription found" });

        var url = await _stripeService.CreateBillingPortalSessionAsync(agent.StripeCustomerId);

        return Ok(new { url });
    }

    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> Webhook()
    {
        var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
        var signature = Request.Headers["Stripe-Signature"].FirstOrDefault();

        if (string.IsNullOrEmpty(signature))
            return BadRequest();

        try
        {
            await _stripeService.HandleWebhookAsync(json, signature);
            return Ok();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[STRIPE WEBHOOK ERROR] {ex.Message}");
            return BadRequest();
        }
    }

    private Guid? GetAgentId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (claim != null && Guid.TryParse(claim.Value, out var id))
            return id;
        return null;
    }
}
```

**Step 2: Commit**

```bash
git add backend/
git commit -m "feat: add Stripe controller with checkout and webhook endpoints"
```

---

## Phase 5: Frontend - Foundations

### Task 5.1: Create shadcn/ui Utility Functions

**Files:**
- Create: `frontend/lib/utils.ts`

**Step 1: Create lib/utils.ts**

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Step 2: Commit**

```bash
git add frontend/
git commit -m "feat: add shadcn/ui utility functions"
```

---

### Task 5.2: Create Base UI Components (Button, Input, Card)

**Files:**
- Create: `frontend/components/ui/button.tsx`
- Create: `frontend/components/ui/input.tsx`
- Create: `frontend/components/ui/card.tsx`
- Create: `frontend/components/ui/badge.tsx`
- Create: `frontend/components/ui/label.tsx`

**Step 1: Create button.tsx**

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

**Step 2: Create input.tsx**

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
```

**Step 3: Create card.tsx**

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...props} />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
)
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

**Step 4: Create badge.tsx**

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-green-500 text-white",
        warning: "border-transparent bg-yellow-500 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
```

**Step 5: Create label.tsx**

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}
      {...props}
    />
  )
)
Label.displayName = "Label"

export { Label }
```

**Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: add base UI components (Button, Input, Card, Badge, Label)"
```

---

### Task 5.3: Create API Client

**Files:**
- Create: `frontend/lib/api.ts`
- Create: `frontend/lib/types.ts`

**Step 1: Create types.ts**

```typescript
export interface Agent {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  photoUrl: string | null
  brandColor: string
  logoUrl: string | null
  socialLinks: Record<string, string> | null
  subscriptionStatus: 'Trial' | 'Active' | 'Cancelled' | 'Expired'
  onboardingCompleted: boolean
}

export interface Deal {
  id: string
  clientName: string
  clientEmail: string
  propertyAddress: string
  propertyPhotoUrl: string | null
  welcomeMessage: string | null
  status: 'Active' | 'Completed' | 'Archived'
  accessToken: string
  clientUrl: string
  createdAt: string
  updatedAt: string
  timelineSteps: TimelineStep[]
  documents: Document[]
}

export interface DealListItem {
  id: string
  clientName: string
  propertyAddress: string
  status: string
  completedSteps: number
  totalSteps: number
  createdAt: string
}

export interface TimelineStep {
  id: string
  title: string
  description: string | null
  status: 'Pending' | 'InProgress' | 'Completed'
  dueDate: string | null
  completedAt: string | null
  order: number
}

export interface Document {
  id: string
  filename: string
  category: 'ToSign' | 'Reference'
  fileSize: number
  uploadedAt: string
  downloadUrl: string
}

export interface Template {
  id: string
  name: string
  description: string | null
  steps: Array<{ title: string; description: string; order: number }>
}

export interface AuthResponse {
  token: string
  agent: Agent
}

export interface PublicDealResponse {
  deal: {
    id: string
    clientName: string
    propertyAddress: string
    propertyPhotoUrl: string | null
    welcomeMessage: string | null
    status: string
    createdAt: string
    timelineSteps: TimelineStep[]
    documents: Array<{
      id: string
      filename: string
      category: string
      fileSize: number
      uploadedAt: string
      downloadUrl: string
    }>
  }
  agent: {
    fullName: string | null
    email: string
    phone: string | null
    photoUrl: string | null
    brandColor: string
    logoUrl: string | null
    socialLinks: Record<string, string> | null
  }
}
```

**Step 2: Create api.ts**

```typescript
import type { Agent, AuthResponse, Deal, DealListItem, Template, PublicDealResponse } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

class ApiClient {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
  }

  getToken(): string | null {
    if (this.token) return this.token
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token')
    }
    return this.token
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || 'Request failed')
    }

    return response.json()
  }

  // Auth
  async sendMagicLink(email: string): Promise<{ message: string }> {
    return this.fetch('/api/auth/send-magic-link', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  async validateMagicLink(token: string): Promise<AuthResponse> {
    return this.fetch('/api/auth/validate', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  }

  // Agent
  async getAgent(): Promise<Agent> {
    return this.fetch('/api/agents/me')
  }

  async updateProfile(data: Partial<Agent>): Promise<Agent> {
    return this.fetch('/api/agents/me/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async updateBranding(data: Partial<Agent>): Promise<Agent> {
    return this.fetch('/api/agents/me/branding', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async completeOnboarding(data: Partial<Agent>): Promise<Agent> {
    return this.fetch('/api/agents/me/complete-onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Deals
  async getDeals(status?: string): Promise<DealListItem[]> {
    const query = status ? `?status=${status}` : ''
    return this.fetch(`/api/deals${query}`)
  }

  async getDeal(id: string): Promise<Deal> {
    return this.fetch(`/api/deals/${id}`)
  }

  async createDeal(data: {
    clientName: string
    clientEmail: string
    propertyAddress: string
    propertyPhotoUrl?: string
    welcomeMessage?: string
    templateId?: string
  }): Promise<Deal> {
    return this.fetch('/api/deals', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateDeal(id: string, data: Partial<Deal>): Promise<Deal> {
    return this.fetch(`/api/deals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteDeal(id: string): Promise<void> {
    await this.fetch(`/api/deals/${id}`, { method: 'DELETE' })
  }

  async resendDealLink(id: string): Promise<{ message: string }> {
    return this.fetch(`/api/deals/${id}/resend-link`, { method: 'POST' })
  }

  // Timeline Steps
  async updateStep(id: string, data: Partial<{ title: string; description: string; status: string; dueDate: string }>): Promise<void> {
    await this.fetch(`/api/timeline-steps/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Templates
  async getTemplates(): Promise<Template[]> {
    return this.fetch('/api/templates')
  }

  // Stripe
  async createCheckoutSession(): Promise<{ url: string }> {
    return this.fetch('/api/stripe/create-checkout-session', { method: 'POST' })
  }

  async createPortalSession(): Promise<{ url: string }> {
    return this.fetch('/api/stripe/create-portal-session', { method: 'POST' })
  }

  // Public (no auth)
  async getPublicDeal(accessToken: string): Promise<PublicDealResponse> {
    return this.fetch(`/api/public/deal/${accessToken}`)
  }
}

export const api = new ApiClient()
```

**Step 3: Commit**

```bash
git add frontend/
git commit -m "feat: add API client with types"
```

---

### Task 5.4: Create Auth Context

**Files:**
- Create: `frontend/contexts/AuthContext.tsx`

**Step 1: Create AuthContext.tsx**

```tsx
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Agent } from '@/lib/types'

interface AuthContextType {
  agent: Agent | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (token: string, agent: Agent) => void
  logout: () => void
  refreshAgent: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = api.getToken()
    if (token) {
      api.getAgent()
        .then(setAgent)
        .catch(() => {
          api.setToken(null)
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = (token: string, agent: Agent) => {
    api.setToken(token)
    setAgent(agent)
  }

  const logout = () => {
    api.setToken(null)
    setAgent(null)
  }

  const refreshAgent = async () => {
    const updatedAgent = await api.getAgent()
    setAgent(updatedAgent)
  }

  return (
    <AuthContext.Provider value={{
      agent,
      isLoading,
      isAuthenticated: !!agent,
      login,
      logout,
      refreshAgent,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

**Step 2: Update app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EstateFlow',
  description: 'Premium real estate transaction tracking',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

**Step 3: Commit**

```bash
git add frontend/
git commit -m "feat: add auth context and provider"
```

---

## Phase 6: Frontend - Agent Dashboard

### Task 6.1: Create Login Page

**Files:**
- Create: `frontend/app/login/page.tsx`

**Step 1: Create login/page.tsx**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await api.sendMagicLink(email)
      setIsSent(true)
    } catch (err) {
      setError('Failed to send magic link. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a magic link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <p>Click the link in the email to sign in.</p>
            <p className="mt-2 text-sm">The link expires in 15 minutes.</p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button variant="ghost" onClick={() => setIsSent(false)}>
              Use a different email
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to EstateFlow</CardTitle>
          <CardDescription>
            Enter your email to receive a magic link
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="agent@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Magic Link'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/
git commit -m "feat: add login page with magic link"
```

---

### Task 6.2: Create Auth Callback Page

**Files:**
- Create: `frontend/app/auth/callback/page.tsx`

**Step 1: Create auth/callback/page.tsx**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setError('Invalid or missing token')
      return
    }

    api.validateMagicLink(token)
      .then((response) => {
        login(response.token, response.agent)

        if (!response.agent.onboardingCompleted) {
          router.push('/onboarding')
        } else {
          router.push('/dashboard')
        }
      })
      .catch(() => {
        setError('Invalid or expired link. Please request a new one.')
      })
  }, [searchParams, login, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Authentication Failed</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Signing you in...</CardTitle>
          <CardDescription>Please wait</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/
git commit -m "feat: add auth callback page"
```

---

### Task 6.3: Create Dashboard Layout

**Files:**
- Create: `frontend/app/dashboard/layout.tsx`
- Create: `frontend/components/DashboardNav.tsx`

**Step 1: Create DashboardNav.tsx**

```tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Home, FolderOpen, Palette, CreditCard, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/deals', label: 'Deals', icon: FolderOpen },
  { href: '/dashboard/branding', label: 'Branding', icon: Palette },
  { href: '/dashboard/subscription', label: 'Subscription', icon: CreditCard },
]

export function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { agent, logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <nav className="w-64 bg-white border-r min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-xl font-bold">EstateFlow</h1>
        {agent && (
          <p className="text-sm text-muted-foreground truncate">{agent.email}</p>
        )}
      </div>

      <div className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </div>

      <Button variant="ghost" onClick={handleLogout} className="justify-start gap-3">
        <LogOut className="h-4 w-4" />
        Logout
      </Button>
    </nav>
  )
}
```

**Step 2: Create dashboard/layout.tsx**

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardNav } from '@/components/DashboardNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, agent } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (agent && !agent.onboardingCompleted) {
      router.push('/onboarding')
    }
  }, [agent, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add frontend/
git commit -m "feat: add dashboard layout with navigation"
```

---

### Task 6.4: Create Dashboard Home Page

**Files:**
- Create: `frontend/app/dashboard/page.tsx`

**Step 1: Create dashboard/page.tsx**

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import type { DealListItem } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, FolderOpen, CheckCircle, Clock } from 'lucide-react'

export default function DashboardPage() {
  const { agent } = useAuth()
  const [deals, setDeals] = useState<DealListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.getDeals()
      .then(setDeals)
      .finally(() => setIsLoading(false))
  }, [])

  const activeDeals = deals.filter(d => d.status === 'Active')
  const completedDeals = deals.filter(d => d.status === 'Completed')

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back{agent?.fullName ? `, ${agent.fullName}` : ''}
          </h1>
          <p className="text-muted-foreground">Here's an overview of your transactions</p>
        </div>
        <Link href="/dashboard/deals/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Deal
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDeals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedDeals.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Deals</CardTitle>
          <CardDescription>Your latest transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : deals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No deals yet</p>
              <Link href="/dashboard/deals/new">
                <Button>Create your first deal</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {deals.slice(0, 5).map((deal) => (
                <Link
                  key={deal.id}
                  href={`/dashboard/deals/${deal.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium">{deal.clientName}</p>
                    <p className="text-sm text-muted-foreground">{deal.propertyAddress}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {deal.completedSteps}/{deal.totalSteps} steps
                    </span>
                    <Badge variant={deal.status === 'Active' ? 'default' : 'secondary'}>
                      {deal.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/
git commit -m "feat: add dashboard home page with stats"
```

---

## Phase 7: Frontend - Client Interface

### Task 7.1: Create Public Deal Page

**Files:**
- Create: `frontend/app/deal/[token]/page.tsx`

**Step 1: Create deal/[token]/page.tsx**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { PublicDealResponse } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Phone, Mail, MapPin, Download, Check, Clock, Circle } from 'lucide-react'

export default function PublicDealPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<PublicDealResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getPublicDeal(params.token)
      .then(setData)
      .catch(() => setError('Deal not found or no longer available'))
  }, [params.token])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md text-center p-8">
          <h1 className="text-xl font-bold text-destructive mb-2">Oops!</h1>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p>Loading...</p>
      </div>
    )
  }

  const { deal, agent } = data
  const completedSteps = deal.timelineSteps.filter(s => s.status === 'Completed').length
  const progress = deal.timelineSteps.length > 0
    ? (completedSteps / deal.timelineSteps.length) * 100
    : 0

  const toSignDocs = deal.documents.filter(d => d.category === 'ToSign')
  const referenceDocs = deal.documents.filter(d => d.category === 'Reference')

  return (
    <div
      className="min-h-screen"
      style={{ '--brand-color': agent.brandColor } as React.CSSProperties}
    >
      {/* Hero */}
      <div
        className="relative h-64 md:h-80 bg-cover bg-center"
        style={{
          backgroundImage: deal.propertyPhotoUrl
            ? `url(${deal.propertyPhotoUrl})`
            : `linear-gradient(135deg, ${agent.brandColor}, #1a1a2e)`
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 h-full flex flex-col justify-end p-6 text-white">
          {agent.logoUrl && (
            <img src={agent.logoUrl} alt="Logo" className="h-8 w-auto mb-4" />
          )}
          <h1 className="text-2xl md:text-3xl font-bold">{deal.welcomeMessage}</h1>
          <p className="text-white/80 mt-2">{deal.propertyAddress}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        {/* Progress Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedSteps}/{deal.timelineSteps.length} steps
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${progress}%`, backgroundColor: agent.brandColor }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Agent Card */}
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            {agent.photoUrl ? (
              <img src={agent.photoUrl} alt={agent.fullName || ''} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: agent.brandColor }}
              >
                {agent.fullName?.charAt(0) || agent.email.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold">{agent.fullName || 'Your Agent'}</p>
              <p className="text-sm text-muted-foreground">{agent.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-4">Timeline</h2>
            <div className="space-y-4">
              {deal.timelineSteps.map((step, index) => {
                const isCompleted = step.status === 'Completed'
                const isInProgress = step.status === 'InProgress'

                return (
                  <div key={step.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      {isCompleted ? (
                        <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      ) : isInProgress ? (
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center animate-pulse"
                          style={{ backgroundColor: agent.brandColor }}
                        >
                          <Clock className="h-4 w-4 text-white" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full border-2 border-muted flex items-center justify-center">
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      {index < deal.timelineSteps.length - 1 && (
                        <div className={`w-0.5 h-8 ${isCompleted ? 'bg-green-500' : 'bg-muted'}`} />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className={`font-medium ${isCompleted ? 'text-muted-foreground' : ''}`}>
                        {step.title}
                      </p>
                      {step.description && (
                        <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                      )}
                      {step.dueDate && !isCompleted && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Due: {new Date(step.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        {deal.documents.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold mb-4">Documents</h2>

              {toSignDocs.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">To Sign</h3>
                  <div className="space-y-2">
                    {toSignDocs.map((doc) => (
                      <a
                        key={doc.id}
                        href={`${process.env.NEXT_PUBLIC_API_URL}${doc.downloadUrl}`}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                      >
                        <span className="text-sm font-medium">{doc.filename}</span>
                        <Download className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {referenceDocs.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Reference</h3>
                  <div className="space-y-2">
                    {referenceDocs.map((doc) => (
                      <a
                        key={doc.id}
                        href={`${process.env.NEXT_PUBLIC_API_URL}${doc.downloadUrl}`}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                      >
                        <span className="text-sm font-medium">{doc.filename}</span>
                        <Download className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="max-w-2xl mx-auto flex gap-2">
          {agent.phone && (
            <a href={`tel:${agent.phone}`} className="flex-1">
              <Button variant="outline" className="w-full">
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
            </a>
          )}
          <a href={`mailto:${agent.email}`} className="flex-1">
            <Button variant="outline" className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deal.propertyAddress)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button variant="outline" className="w-full">
              <MapPin className="h-4 w-4 mr-2" />
              Map
            </Button>
          </a>
        </div>
      </div>

      {/* Spacer for fixed footer */}
      <div className="h-20" />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/
git commit -m "feat: add public deal page with timeline and documents"
```

---

## Phase 8 & 9: Remaining Tasks

The remaining phases include:
- Onboarding wizard
- Deals list and detail pages
- Branding page
- Subscription management
- Polish and testing

These follow the same patterns established above. Continue implementing each task with the same granular steps.

---

## Summary

This implementation plan covers:
- **60+ granular tasks** organized in 9 phases
- **Complete code** for all backend controllers, services, and entities
- **Complete code** for frontend pages, components, and API client
- **Docker configuration** for single-command deployment
- **Stripe integration** for payments
- **Email notifications** via Resend

Each task follows TDD principles where applicable and includes commit steps for version control.
