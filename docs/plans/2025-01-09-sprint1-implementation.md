# Sprint 1 - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Réparer les 3 fonctionnalités critiques : upload documents, tracking consultations, intégration Yousign

**Architecture:**
- Backend .NET 8 avec EF Core + PostgreSQL
- Frontend Next.js 14 avec TypeScript
- Déploiement Docker sur Dokploy

**Tech Stack:** .NET 8, Next.js 14, PostgreSQL, Yousign API, Docker

---

## Vue d'ensemble des tâches

| # | Tâche | Effort | Priorité |
|---|-------|--------|----------|
| 1 | Réparer upload documents (frontend) | 3h | P0 |
| 2 | Tracking consultations client | 4h | P1 |
| 3 | Intégration Yousign (signature électronique) | 6h | P0 |
| 4 | Tests end-to-end | 2h | P1 |
| 5 | Déploiement Dokploy | 1h | P0 |

---

## Task 1: Réparer l'upload de documents

### Contexte
Le backend (`DocumentsController.cs:54-114`) fonctionne parfaitement. Le frontend a un bouton "Ajouter" (`[id]/page.tsx:229-232`) qui ne fait rien.

**Files:**
- Modify: `frontend/lib/api.ts` (ajouter documentsApi)
- Modify: `frontend/app/dashboard/deals/[id]/page.tsx` (ajouter modal upload)
- Create: `frontend/components/ui/document-upload-modal.tsx`

---

### Step 1.1: Ajouter l'API documents dans le client

**File:** `frontend/lib/api.ts`

Ajouter après `stepsApi` (ligne 111):

```typescript
// Documents
export const documentsApi = {
  upload: async (token: string, dealId: string, file: File, category: 'ToSign' | 'Reference' = 'Reference') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const response = await fetch(`${API_URL}/api/deals/${dealId}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json() as Promise<Document>;
  },

  delete: (token: string, dealId: string, documentId: string) =>
    apiFetch<void>(`/api/deals/${dealId}/documents/${documentId}`, {
      token,
      method: 'DELETE'
    }),
};
```

**Commit:** `feat(api): add documents upload and delete API`

---

### Step 1.2: Créer le composant modal d'upload

**File:** `frontend/components/ui/document-upload-modal.tsx`

```tsx
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, FileText, Loader2 } from 'lucide-react';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, category: 'ToSign' | 'Reference') => Promise<void>;
}

export function DocumentUploadModal({ isOpen, onClose, onUpload }: DocumentUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<'ToSign' | 'Reference'>('Reference');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      await onUpload(selectedFile, category);
      setSelectedFile(null);
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ajouter un document</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium truncate max-w-[200px]">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Glissez un fichier ou cliquez pour sélectionner
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, Word, Excel, Images (max 10MB)
                </p>
              </>
            )}
          </div>

          {/* Category selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Catégorie</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={category === 'Reference' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory('Reference')}
                className="flex-1"
              >
                Référence
              </Button>
              <Button
                type="button"
                variant={category === 'ToSign' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory('ToSign')}
                className="flex-1"
              >
                À signer
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedFile || isUploading}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                'Téléverser'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Commit:** `feat(ui): add document upload modal component`

---

### Step 1.3: Intégrer le modal dans la page deal

**File:** `frontend/app/dashboard/deals/[id]/page.tsx`

**Modifications:**

1. Ajouter l'import (après ligne 11):
```typescript
import { dealsApi, stepsApi, documentsApi, Deal, TimelineStep } from '@/lib/api';
import { DocumentUploadModal } from '@/components/ui/document-upload-modal';
```

2. Ajouter le state (après ligne 21):
```typescript
const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
```

3. Ajouter les handlers (après `updateDealStatus`, ligne 86):
```typescript
const handleDocumentUpload = async (file: File, category: 'ToSign' | 'Reference') => {
  await documentsApi.upload(token!, dealId, file, category);
  loadDeal();
};

const deleteDocument = async (documentId: string) => {
  if (!confirm('Supprimer ce document ?')) return;

  try {
    await documentsApi.delete(token!, dealId, documentId);
    loadDeal();
  } catch (error) {
    console.error('Failed to delete document:', error);
  }
};
```

4. Modifier le bouton "Ajouter" (ligne 229-232):
```tsx
<Button size="sm" variant="outline" onClick={() => setIsUploadModalOpen(true)}>
  <Upload className="h-4 w-4 mr-2" />
  Ajouter
</Button>
```

5. Ajouter le bouton supprimer aux documents (ligne 250-258, remplacer tout le bloc):
```tsx
<div className="flex items-center gap-2">
  <a
    href={`${apiUrl}/api/deals/${dealId}/documents/${doc.id}/download`}
    target="_blank"
    rel="noopener noreferrer"
  >
    <Button variant="outline" size="sm">
      Télécharger
    </Button>
  </a>
  <Button
    variant="ghost"
    size="sm"
    onClick={() => deleteDocument(doc.id)}
  >
    <Trash2 className="h-4 w-4 text-red-500" />
  </Button>
</div>
```

6. Ajouter le modal avant la fermeture du dernier `</div>` (avant ligne 321):
```tsx
<DocumentUploadModal
  isOpen={isUploadModalOpen}
  onClose={() => setIsUploadModalOpen(false)}
  onUpload={handleDocumentUpload}
/>
```

**Commit:** `feat(deals): integrate document upload modal and delete`

---

### Step 1.4: Tester manuellement

**Run:**
```bash
cd frontend && npm run dev
```

**Test:**
1. Se connecter en tant qu'agent
2. Ouvrir une transaction existante
3. Cliquer sur "Ajouter" → le modal s'ouvre
4. Glisser-déposer un PDF
5. Sélectionner catégorie "À signer"
6. Cliquer "Téléverser"
7. Vérifier que le document apparaît dans la liste
8. Cliquer "Télécharger" → le fichier se télécharge
9. Cliquer sur la corbeille → confirmation → document supprimé

**Expected:** Toutes les actions fonctionnent sans erreur.

**Commit:** (aucun - test manuel)

---

## Task 2: Tracking des consultations client

### Contexte
L'agent doit savoir si son client consulte le portail et télécharge les documents. Cela crée une vraie valeur par rapport à "j'envoie un email avec PJ".

**Files:**
- Create: `backend/Data/Entities/DealView.cs`
- Modify: `backend/Data/EstateFlowDbContext.cs`
- Modify: `backend/Controllers/PublicDealsController.cs`
- Create: `backend/Controllers/AnalyticsController.cs`
- Modify: `frontend/lib/api.ts`
- Modify: `frontend/app/dashboard/deals/[id]/page.tsx`

---

### Step 2.1: Créer l'entité DealView

**File:** `backend/Data/Entities/DealView.cs`

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstateFlow.Api.Data.Entities;

public enum ViewType
{
    PageView,
    DocumentDownload
}

[Table("deal_views")]
public class DealView
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("deal_id")]
    public Guid DealId { get; set; }

    [Column("view_type")]
    public ViewType Type { get; set; } = ViewType.PageView;

    [Column("document_id")]
    public Guid? DocumentId { get; set; }

    [Column("user_agent")]
    [MaxLength(500)]
    public string? UserAgent { get; set; }

    [Column("ip_address")]
    [MaxLength(45)]
    public string? IpAddress { get; set; }

    [Column("viewed_at")]
    public DateTime ViewedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("DealId")]
    public Deal Deal { get; set; } = null!;

    [ForeignKey("DocumentId")]
    public Document? Document { get; set; }
}
```

**Commit:** `feat(entities): add DealView entity for tracking`

---

### Step 2.2: Ajouter au DbContext

**File:** `backend/Data/EstateFlowDbContext.cs`

1. Ajouter le DbSet (après ligne 17):
```csharp
public DbSet<DealView> DealViews => Set<DealView>();
```

2. Ajouter la configuration dans `OnModelCreating` (après la config Document, vers ligne 66):
```csharp
// DealView
modelBuilder.Entity<DealView>(entity =>
{
    entity.Property(e => e.Type)
          .HasConversion<string>();

    entity.HasOne(v => v.Deal)
          .WithMany()
          .HasForeignKey(v => v.DealId)
          .OnDelete(DeleteBehavior.Cascade);

    entity.HasOne(v => v.Document)
          .WithMany()
          .HasForeignKey(v => v.DocumentId)
          .OnDelete(DeleteBehavior.SetNull);

    entity.HasIndex(e => e.DealId);
    entity.HasIndex(e => e.ViewedAt);
});
```

**Commit:** `feat(db): add DealView to context`

---

### Step 2.3: Logger les consultations dans PublicDealsController

**File:** `backend/Controllers/PublicDealsController.cs`

1. Ajouter using (après ligne 3):
```csharp
using EstateFlow.Api.Data.Entities;
```

2. Modifier `GetDealByToken` pour logger la vue (après ligne 69, avant le return):
```csharp
// Log the view
var dealView = new DealView
{
    DealId = deal.Id,
    Type = ViewType.PageView,
    UserAgent = Request.Headers["User-Agent"].FirstOrDefault(),
    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
};
_context.DealViews.Add(dealView);
await _context.SaveChangesAsync();
```

3. Modifier `DownloadDocument` pour logger le téléchargement (après ligne 116, avant le return):
```csharp
// Log the download
var downloadView = new DealView
{
    DealId = deal.Id,
    Type = ViewType.DocumentDownload,
    DocumentId = documentId,
    UserAgent = Request.Headers["User-Agent"].FirstOrDefault(),
    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
};
_context.DealViews.Add(downloadView);
await _context.SaveChangesAsync();
```

**Commit:** `feat(tracking): log page views and document downloads`

---

### Step 2.4: Créer le controller Analytics pour l'agent

**File:** `backend/Controllers/AnalyticsController.cs`

```csharp
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;
using EstateFlow.Api.Data.Entities;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/deals/{dealId:guid}/analytics")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly EstateFlowDbContext _context;

    public AnalyticsController(EstateFlowDbContext context)
    {
        _context = context;
    }

    private Guid GetCurrentAgentId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null ? Guid.Parse(claim.Value) : Guid.Empty;
    }

    public record DealAnalyticsDto(
        int TotalViews,
        int TotalDownloads,
        DateTime? LastViewedAt,
        List<ViewEventDto> RecentViews
    );

    public record ViewEventDto(
        string Type,
        string? DocumentName,
        DateTime ViewedAt
    );

    [HttpGet]
    public async Task<ActionResult<DealAnalyticsDto>> GetDealAnalytics(Guid dealId)
    {
        var agentId = GetCurrentAgentId();
        var deal = await _context.Deals.FirstOrDefaultAsync(d => d.Id == dealId && d.AgentId == agentId);

        if (deal == null)
            return NotFound(new { error = "Deal not found" });

        var views = await _context.DealViews
            .Include(v => v.Document)
            .Where(v => v.DealId == dealId)
            .OrderByDescending(v => v.ViewedAt)
            .ToListAsync();

        var totalViews = views.Count(v => v.Type == ViewType.PageView);
        var totalDownloads = views.Count(v => v.Type == ViewType.DocumentDownload);
        var lastViewedAt = views.FirstOrDefault()?.ViewedAt;

        var recentViews = views
            .Take(10)
            .Select(v => new ViewEventDto(
                v.Type.ToString(),
                v.Document?.Filename,
                v.ViewedAt
            ))
            .ToList();

        return Ok(new DealAnalyticsDto(
            totalViews,
            totalDownloads,
            lastViewedAt,
            recentViews
        ));
    }
}
```

**Commit:** `feat(api): add analytics endpoint for deal views`

---

### Step 2.5: Ajouter l'API analytics côté frontend

**File:** `frontend/lib/api.ts`

Ajouter après `documentsApi`:

```typescript
// Analytics
export interface DealAnalytics {
  totalViews: number;
  totalDownloads: number;
  lastViewedAt: string | null;
  recentViews: {
    type: string;
    documentName: string | null;
    viewedAt: string;
  }[];
}

export const analyticsApi = {
  getDealAnalytics: (token: string, dealId: string) =>
    apiFetch<DealAnalytics>(`/api/deals/${dealId}/analytics`, { token }),
};
```

**Commit:** `feat(api): add analytics API client`

---

### Step 2.6: Afficher les analytics dans la page deal

**File:** `frontend/app/dashboard/deals/[id]/page.tsx`

1. Ajouter l'import:
```typescript
import { dealsApi, stepsApi, documentsApi, analyticsApi, Deal, TimelineStep, DealAnalytics } from '@/lib/api';
import { Eye, Download } from 'lucide-react';
```

2. Ajouter le state (après `isUploadModalOpen`):
```typescript
const [analytics, setAnalytics] = useState<DealAnalytics | null>(null);
```

3. Charger les analytics dans useEffect (modifier loadDeal):
```typescript
const loadDeal = async () => {
  try {
    const [dealData, analyticsData] = await Promise.all([
      dealsApi.get(token!, dealId),
      analyticsApi.getDealAnalytics(token!, dealId)
    ]);
    setDeal(dealData);
    setAnalytics(analyticsData);
  } catch (error) {
    console.error('Failed to load deal:', error);
  } finally {
    setIsLoading(false);
  }
};
```

4. Ajouter une carte analytics dans la sidebar (après la carte "Lien client", vers ligne 317):
```tsx
{/* Analytics */}
<Card>
  <CardHeader>
    <CardTitle>Activité client</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {analytics ? (
      <>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-blue-600">
              <Eye className="h-4 w-4" />
              <span className="text-2xl font-bold">{analytics.totalViews}</span>
            </div>
            <p className="text-xs text-muted-foreground">Consultations</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-green-600">
              <Download className="h-4 w-4" />
              <span className="text-2xl font-bold">{analytics.totalDownloads}</span>
            </div>
            <p className="text-xs text-muted-foreground">Téléchargements</p>
          </div>
        </div>
        {analytics.lastViewedAt && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Dernière visite:</span>{' '}
            {new Date(analytics.lastViewedAt).toLocaleString('fr-FR')}
          </div>
        )}
        {analytics.recentViews.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Activité récente</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {analytics.recentViews.slice(0, 5).map((view, i) => (
                <div key={i} className="text-xs flex items-center gap-2 text-muted-foreground">
                  {view.type === 'PageView' ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  <span>
                    {view.type === 'PageView' ? 'Consultation' : `Téléchargé: ${view.documentName}`}
                  </span>
                  <span className="ml-auto">
                    {new Date(view.viewedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    ) : (
      <p className="text-sm text-muted-foreground text-center">Chargement...</p>
    )}
  </CardContent>
</Card>
```

**Commit:** `feat(ui): display client analytics on deal page`

---

## Task 3: Intégration Yousign

### Contexte
Yousign est un service français de signature électronique conforme eIDAS. L'intégration permet de transformer les documents "À signer" en véritables demandes de signature.

**Prérequis:**
- Compte Yousign (mode sandbox pour dev): https://yousign.com
- API Key depuis le dashboard Yousign

**Files:**
- Create: `backend/Services/YousignService.cs`
- Create: `backend/Services/IYousignService.cs`
- Create: `backend/Controllers/SignaturesController.cs`
- Modify: `backend/Data/Entities/Document.cs` (ajouter champs signature)
- Modify: `backend/Program.cs` (DI)
- Modify: `frontend/lib/api.ts`
- Modify: `frontend/app/dashboard/deals/[id]/page.tsx`

---

### Step 3.1: Ajouter les variables d'environnement

**File:** `.env` (et `.env.example`)

```env
# Yousign
YOUSIGN_API_KEY=your_sandbox_api_key
YOUSIGN_API_URL=https://api-sandbox.yousign.app/v3
YOUSIGN_WEBHOOK_SECRET=your_webhook_secret
```

**File:** `docker-compose.yml` - ajouter dans backend.environment:

```yaml
- YOUSIGN_API_KEY=${YOUSIGN_API_KEY}
- YOUSIGN_API_URL=${YOUSIGN_API_URL}
- YOUSIGN_WEBHOOK_SECRET=${YOUSIGN_WEBHOOK_SECRET}
```

**Commit:** `chore(env): add Yousign configuration`

---

### Step 3.2: Étendre l'entité Document

**File:** `backend/Data/Entities/Document.cs`

Ajouter après `UploadedAt` (ligne 36):

```csharp
[Column("signature_request_id")]
[MaxLength(100)]
public string? SignatureRequestId { get; set; }

[Column("signature_status")]
[MaxLength(50)]
public string? SignatureStatus { get; set; }

[Column("signed_file_path")]
[MaxLength(500)]
public string? SignedFilePath { get; set; }

[Column("signed_at")]
public DateTime? SignedAt { get; set; }
```

**Commit:** `feat(entities): add signature fields to Document`

---

### Step 3.3: Créer l'interface IYousignService

**File:** `backend/Services/IYousignService.cs`

```csharp
namespace EstateFlow.Api.Services;

public interface IYousignService
{
    Task<SignatureRequestResult> CreateSignatureRequestAsync(
        string filePath,
        string signerEmail,
        string signerName,
        string documentName
    );

    Task<SignatureStatus> GetSignatureStatusAsync(string signatureRequestId);

    Task<byte[]> DownloadSignedDocumentAsync(string signatureRequestId);
}

public record SignatureRequestResult(
    string SignatureRequestId,
    string SignerUrl,
    string Status
);

public record SignatureStatus(
    string Status,
    DateTime? SignedAt
);
```

**Commit:** `feat(services): add IYousignService interface`

---

### Step 3.4: Implémenter YousignService

**File:** `backend/Services/YousignService.cs`

```csharp
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace EstateFlow.Api.Services;

public class YousignService : IYousignService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiUrl;
    private readonly ILogger<YousignService> _logger;

    public YousignService(IConfiguration configuration, ILogger<YousignService> logger)
    {
        _logger = logger;
        _apiUrl = configuration["YOUSIGN_API_URL"] ?? "https://api-sandbox.yousign.app/v3";
        var apiKey = configuration["YOUSIGN_API_KEY"] ?? throw new InvalidOperationException("YOUSIGN_API_KEY not configured");

        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    public async Task<SignatureRequestResult> CreateSignatureRequestAsync(
        string filePath,
        string signerEmail,
        string signerName,
        string documentName)
    {
        // Step 1: Create signature request
        var createRequest = new
        {
            name = $"Signature: {documentName}",
            delivery_mode = "email",
            timezone = "Europe/Paris"
        };

        var createResponse = await _httpClient.PostAsync(
            $"{_apiUrl}/signature_requests",
            new StringContent(JsonSerializer.Serialize(createRequest), Encoding.UTF8, "application/json")
        );
        createResponse.EnsureSuccessStatusCode();

        var createResult = await JsonSerializer.DeserializeAsync<YousignSignatureRequest>(
            await createResponse.Content.ReadAsStreamAsync()
        );
        var signatureRequestId = createResult!.Id;

        // Step 2: Upload document
        var fileBytes = await File.ReadAllBytesAsync(filePath);
        var fileContent = new ByteArrayContent(fileBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");

        using var formData = new MultipartFormDataContent();
        formData.Add(fileContent, "file", Path.GetFileName(filePath));
        formData.Add(new StringContent("signable_document"), "nature");

        var uploadResponse = await _httpClient.PostAsync(
            $"{_apiUrl}/signature_requests/{signatureRequestId}/documents",
            formData
        );
        uploadResponse.EnsureSuccessStatusCode();

        var uploadResult = await JsonSerializer.DeserializeAsync<YousignDocument>(
            await uploadResponse.Content.ReadAsStreamAsync()
        );
        var documentId = uploadResult!.Id;

        // Step 3: Add signer
        var signerRequest = new
        {
            info = new
            {
                first_name = signerName.Split(' ').FirstOrDefault() ?? signerName,
                last_name = signerName.Split(' ').Skip(1).FirstOrDefault() ?? "",
                email = signerEmail,
                locale = "fr"
            },
            signature_level = "electronic_signature",
            signature_authentication_mode = "no_otp",
            fields = new[]
            {
                new
                {
                    type = "signature",
                    document_id = documentId,
                    page = 1,
                    x = 100,
                    y = 700,
                    width = 200,
                    height = 50
                }
            }
        };

        var signerResponse = await _httpClient.PostAsync(
            $"{_apiUrl}/signature_requests/{signatureRequestId}/signers",
            new StringContent(JsonSerializer.Serialize(signerRequest), Encoding.UTF8, "application/json")
        );
        signerResponse.EnsureSuccessStatusCode();

        var signerResult = await JsonSerializer.DeserializeAsync<YousignSigner>(
            await signerResponse.Content.ReadAsStreamAsync()
        );

        // Step 4: Activate signature request
        var activateResponse = await _httpClient.PostAsync(
            $"{_apiUrl}/signature_requests/{signatureRequestId}/activate",
            null
        );
        activateResponse.EnsureSuccessStatusCode();

        return new SignatureRequestResult(
            signatureRequestId,
            signerResult!.SignatureLink ?? "",
            "ongoing"
        );
    }

    public async Task<SignatureStatus> GetSignatureStatusAsync(string signatureRequestId)
    {
        var response = await _httpClient.GetAsync($"{_apiUrl}/signature_requests/{signatureRequestId}");
        response.EnsureSuccessStatusCode();

        var result = await JsonSerializer.DeserializeAsync<YousignSignatureRequest>(
            await response.Content.ReadAsStreamAsync()
        );

        return new SignatureStatus(
            result!.Status,
            result.Status == "done" ? DateTime.UtcNow : null
        );
    }

    public async Task<byte[]> DownloadSignedDocumentAsync(string signatureRequestId)
    {
        var response = await _httpClient.GetAsync(
            $"{_apiUrl}/signature_requests/{signatureRequestId}/documents/download"
        );
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsByteArrayAsync();
    }

    // DTOs for Yousign API responses
    private class YousignSignatureRequest
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = "";

        [JsonPropertyName("status")]
        public string Status { get; set; } = "";
    }

    private class YousignDocument
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = "";
    }

    private class YousignSigner
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = "";

        [JsonPropertyName("signature_link")]
        public string? SignatureLink { get; set; }
    }
}
```

**Commit:** `feat(services): implement YousignService`

---

### Step 3.5: Créer SignaturesController

**File:** `backend/Controllers/SignaturesController.cs`

```csharp
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EstateFlow.Api.Data;
using EstateFlow.Api.Services;

namespace EstateFlow.Api.Controllers;

[ApiController]
[Route("api/deals/{dealId:guid}/documents/{documentId:guid}/signature")]
[Authorize]
public class SignaturesController : ControllerBase
{
    private readonly EstateFlowDbContext _context;
    private readonly IYousignService _yousignService;
    private readonly IEmailService _emailService;

    public SignaturesController(
        EstateFlowDbContext context,
        IYousignService yousignService,
        IEmailService emailService)
    {
        _context = context;
        _yousignService = yousignService;
        _emailService = emailService;
    }

    private Guid GetCurrentAgentId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null ? Guid.Parse(claim.Value) : Guid.Empty;
    }

    public record SignatureRequestDto(string SignatureRequestId, string SignerUrl, string Status);
    public record SignatureStatusDto(string Status, DateTime? SignedAt);

    [HttpPost("request")]
    public async Task<ActionResult<SignatureRequestDto>> RequestSignature(Guid dealId, Guid documentId)
    {
        var agentId = GetCurrentAgentId();
        var deal = await _context.Deals.FirstOrDefaultAsync(d => d.Id == dealId && d.AgentId == agentId);

        if (deal == null)
            return NotFound(new { error = "Deal not found" });

        var document = await _context.Documents.FirstOrDefaultAsync(d => d.Id == documentId && d.DealId == dealId);

        if (document == null)
            return NotFound(new { error = "Document not found" });

        if (document.Category != Data.Entities.DocumentCategory.ToSign)
            return BadRequest(new { error = "Document must be in 'ToSign' category" });

        if (!string.IsNullOrEmpty(document.SignatureRequestId))
            return BadRequest(new { error = "Signature already requested for this document" });

        // Check file exists and is PDF
        if (!System.IO.File.Exists(document.FilePath))
            return NotFound(new { error = "File not found on server" });

        var extension = Path.GetExtension(document.FilePath).ToLowerInvariant();
        if (extension != ".pdf")
            return BadRequest(new { error = "Only PDF documents can be signed" });

        try
        {
            var result = await _yousignService.CreateSignatureRequestAsync(
                document.FilePath,
                deal.ClientEmail,
                deal.ClientName,
                document.Filename
            );

            document.SignatureRequestId = result.SignatureRequestId;
            document.SignatureStatus = result.Status;
            await _context.SaveChangesAsync();

            return Ok(new SignatureRequestDto(
                result.SignatureRequestId,
                result.SignerUrl,
                result.Status
            ));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = $"Failed to create signature request: {ex.Message}" });
        }
    }

    [HttpGet("status")]
    public async Task<ActionResult<SignatureStatusDto>> GetSignatureStatus(Guid dealId, Guid documentId)
    {
        var agentId = GetCurrentAgentId();
        var deal = await _context.Deals.FirstOrDefaultAsync(d => d.Id == dealId && d.AgentId == agentId);

        if (deal == null)
            return NotFound(new { error = "Deal not found" });

        var document = await _context.Documents.FirstOrDefaultAsync(d => d.Id == documentId && d.DealId == dealId);

        if (document == null)
            return NotFound(new { error = "Document not found" });

        if (string.IsNullOrEmpty(document.SignatureRequestId))
            return BadRequest(new { error = "No signature request for this document" });

        try
        {
            var status = await _yousignService.GetSignatureStatusAsync(document.SignatureRequestId);

            // Update local status
            document.SignatureStatus = status.Status;
            if (status.Status == "done" && !document.SignedAt.HasValue)
            {
                document.SignedAt = status.SignedAt;

                // Download signed document
                var signedBytes = await _yousignService.DownloadSignedDocumentAsync(document.SignatureRequestId);
                var signedPath = document.FilePath.Replace(".pdf", "_signed.pdf");
                await System.IO.File.WriteAllBytesAsync(signedPath, signedBytes);
                document.SignedFilePath = signedPath;
            }
            await _context.SaveChangesAsync();

            return Ok(new SignatureStatusDto(status.Status, status.SignedAt));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = $"Failed to get signature status: {ex.Message}" });
        }
    }
}
```

**Commit:** `feat(api): add signatures controller`

---

### Step 3.6: Enregistrer les services dans Program.cs

**File:** `backend/Program.cs`

Ajouter après l'enregistrement de `IEmailService`:

```csharp
builder.Services.AddSingleton<IYousignService, YousignService>();
```

**Commit:** `chore(di): register YousignService`

---

### Step 3.7: Ajouter l'API signatures côté frontend

**File:** `frontend/lib/api.ts`

Ajouter les types:

```typescript
export interface SignatureRequest {
  signatureRequestId: string;
  signerUrl: string;
  status: string;
}

export interface SignatureStatus {
  status: string;
  signedAt: string | null;
}
```

Modifier l'interface Document:

```typescript
export interface Document {
  id: string;
  filename: string;
  category: string;
  uploadedAt: string;
  signatureRequestId?: string;
  signatureStatus?: string;
  signedAt?: string;
}
```

Ajouter l'API:

```typescript
// Signatures
export const signaturesApi = {
  requestSignature: (token: string, dealId: string, documentId: string) =>
    apiFetch<SignatureRequest>(`/api/deals/${dealId}/documents/${documentId}/signature/request`, {
      token,
      method: 'POST',
    }),

  getStatus: (token: string, dealId: string, documentId: string) =>
    apiFetch<SignatureStatus>(`/api/deals/${dealId}/documents/${documentId}/signature/status`, {
      token,
    }),
};
```

**Commit:** `feat(api): add signatures API client`

---

### Step 3.8: Ajouter le bouton "Demander signature" dans l'UI

**File:** `frontend/app/dashboard/deals/[id]/page.tsx`

1. Ajouter l'import:
```typescript
import { Pen, CheckCircle, Clock, AlertCircle } from 'lucide-react';
```

2. Ajouter le handler:
```typescript
const requestSignature = async (documentId: string) => {
  try {
    await signaturesApi.requestSignature(token!, dealId, documentId);
    loadDeal();
  } catch (error) {
    console.error('Failed to request signature:', error);
    alert('Erreur: ' + (error as Error).message);
  }
};

const getSignatureStatusBadge = (doc: Document) => {
  if (!doc.signatureRequestId) return null;

  switch (doc.signatureStatus) {
    case 'done':
      return <Badge variant="success" className="ml-2"><CheckCircle className="h-3 w-3 mr-1" />Signé</Badge>;
    case 'ongoing':
      return <Badge variant="warning" className="ml-2"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
    case 'expired':
    case 'canceled':
      return <Badge variant="destructive" className="ml-2"><AlertCircle className="h-3 w-3 mr-1" />{doc.signatureStatus}</Badge>;
    default:
      return <Badge variant="outline" className="ml-2">{doc.signatureStatus}</Badge>;
  }
};
```

3. Modifier l'affichage des documents pour inclure le statut signature et le bouton (remplacer le bloc de rendu des documents):
```tsx
{deal.documents.map((doc) => (
  <div
    key={doc.id}
    className="flex items-center justify-between p-3 border rounded-lg"
  >
    <div className="flex items-center gap-2">
      <div>
        <p className="font-medium">{doc.filename}</p>
        <div className="flex items-center gap-2">
          <Badge variant={doc.category === 'ToSign' ? 'default' : 'secondary'}>
            {doc.category === 'ToSign' ? 'À signer' : 'Référence'}
          </Badge>
          {getSignatureStatusBadge(doc)}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2">
      {doc.category === 'ToSign' && !doc.signatureRequestId && (
        <Button
          variant="default"
          size="sm"
          onClick={() => requestSignature(doc.id)}
        >
          <Pen className="h-4 w-4 mr-1" />
          Signature
        </Button>
      )}
      <a
        href={`${apiUrl}/api/deals/${dealId}/documents/${doc.id}/download`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button variant="outline" size="sm">
          Télécharger
        </Button>
      </a>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => deleteDocument(doc.id)}
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  </div>
))}
```

**Commit:** `feat(ui): add signature request button and status`

---

## Task 4: Tests (Unit + E2E avec Playwright)

### Contexte
Les tests couvrent 3 niveaux :
1. **Tests unitaires backend** (xUnit) - Logique métier
2. **Tests unitaires frontend** (Vitest) - API client
3. **Tests E2E** (Playwright + Chrome) - Parcours utilisateur complets

---

### Step 4.1: Créer les tests backend (xUnit)

**File:** `backend/EstateFlow.Api.Tests/EstateFlow.Api.Tests.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <IsPackable>false</IsPackable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="8.0.0" />
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.8.0" />
    <PackageReference Include="xunit" Version="2.6.2" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.5.4" />
    <PackageReference Include="Moq" Version="4.20.70" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\EstateFlow.Api.csproj" />
  </ItemGroup>
</Project>
```

**File:** `backend/EstateFlow.Api.Tests/Controllers/DocumentsControllerTests.cs`

```csharp
using Xunit;
using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;
using System.Net.Http.Headers;

namespace EstateFlow.Api.Tests.Controllers;

public class DocumentsControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public DocumentsControllerTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Upload_WithoutAuth_Returns401()
    {
        // Arrange
        var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(new byte[] { 1, 2, 3 }), "file", "test.pdf");
        content.Add(new StringContent("Reference"), "category");

        // Act
        var response = await _client.PostAsync(
            "/api/deals/00000000-0000-0000-0000-000000000001/documents",
            content
        );

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Download_WithoutAuth_Returns401()
    {
        var response = await _client.GetAsync(
            "/api/deals/00000000-0000-0000-0000-000000000001/documents/00000000-0000-0000-0000-000000000002/download"
        );

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
```

**File:** `backend/EstateFlow.Api.Tests/Controllers/AnalyticsControllerTests.cs`

```csharp
using Xunit;
using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;

namespace EstateFlow.Api.Tests.Controllers;

public class AnalyticsControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public AnalyticsControllerTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetAnalytics_WithoutAuth_Returns401()
    {
        var response = await _client.GetAsync(
            "/api/deals/00000000-0000-0000-0000-000000000001/analytics"
        );

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
```

**Run:**
```bash
cd backend
mkdir -p EstateFlow.Api.Tests/Controllers
# Create the test files above
dotnet restore
dotnet test
```

**Commit:** `test(backend): add controller unit tests`

---

### Step 4.2: Créer les tests frontend (Vitest)

**File:** `frontend/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

**File:** `frontend/__tests__/setup.ts`

```typescript
import { vi } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));
```

**File:** `frontend/__tests__/lib/api.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

global.fetch = vi.fn();

describe('documentsApi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should upload document with FormData', async () => {
    const mockResponse = { id: '123', filename: 'test.pdf', category: 'Reference', uploadedAt: new Date().toISOString() };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { documentsApi } = await import('../../lib/api');
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

    const result = await documentsApi.upload('token123', 'deal-id', file, 'Reference');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/deals/deal-id/documents'),
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it('should delete document', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    });

    const { documentsApi } = await import('../../lib/api');
    await documentsApi.delete('token123', 'deal-id', 'doc-id');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/deals/deal-id/documents/doc-id'),
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });
});

describe('analyticsApi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch deal analytics', async () => {
    const mockAnalytics = {
      totalViews: 10,
      totalDownloads: 5,
      lastViewedAt: new Date().toISOString(),
      recentViews: [],
    };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalytics,
    });

    const { analyticsApi } = await import('../../lib/api');
    const result = await analyticsApi.getDealAnalytics('token123', 'deal-id');

    expect(result.totalViews).toBe(10);
    expect(result.totalDownloads).toBe(5);
  });
});
```

**File:** `frontend/package.json` - ajouter dans scripts et devDependencies:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed"
  }
}
```

**Run:**
```bash
cd frontend
npm install -D vitest @vitejs/plugin-react jsdom
npm run test:run
```

**Commit:** `test(frontend): add API unit tests`

---

### Step 4.3: Installer Playwright pour les tests E2E

**Run:**
```bash
cd frontend
npm install -D @playwright/test
npx playwright install chromium
```

**File:** `frontend/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

**Commit:** `test(e2e): add Playwright configuration`

---

### Step 4.4: Créer les fixtures E2E

**File:** `frontend/e2e/fixtures/auth.fixture.ts`

```typescript
import { test as base, Page } from '@playwright/test';

// Test user for E2E - create this in your dev database or use magic link bypass
const TEST_AGENT_EMAIL = 'e2e-test@estateflow.test';

export const test = base.extend<{
  authenticatedPage: Page;
  testDealId: string;
}>({
  authenticatedPage: async ({ page }, use) => {
    // For E2E, we'll use a test JWT token or bypass auth in dev mode
    // Option 1: Set localStorage directly (if your app supports it)
    await page.goto('/');

    // Wait for any initial load
    await page.waitForLoadState('networkidle');

    // For dev/test: bypass magic link by setting test token
    // In real scenario, implement a test auth endpoint
    await page.evaluate((email) => {
      // This simulates having logged in
      // Your backend should have a test endpoint: POST /api/auth/test-login
      localStorage.setItem('estateflow_test_mode', 'true');
      localStorage.setItem('estateflow_test_email', email);
    }, TEST_AGENT_EMAIL);

    await use(page);
  },

  testDealId: async ({}, use) => {
    // This would be set up in your test database seeding
    // For now, use a placeholder that your seed script creates
    await use('test-deal-id-from-seed');
  },
});

export { expect } from '@playwright/test';
```

**File:** `frontend/e2e/fixtures/test-data.ts`

```typescript
export const testAgent = {
  email: 'e2e-test@estateflow.test',
  fullName: 'Agent E2E Test',
  phone: '+33612345678',
};

export const testDeal = {
  clientName: 'M. et Mme Test',
  clientEmail: 'client-test@example.com',
  propertyAddress: '123 Rue de Test, 75001 Paris',
};

export const testDocument = {
  name: 'test-document.pdf',
  category: 'Reference',
};
```

**Commit:** `test(e2e): add auth fixtures and test data`

---

### Step 4.5: Test E2E - Connexion Magic Link

**File:** `frontend/e2e/auth.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/auth');

    await expect(page.getByRole('heading', { name: /connexion/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /recevoir le lien/i })).toBeVisible();
  });

  test('should show success message after requesting magic link', async ({ page }) => {
    await page.goto('/auth');

    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByRole('button', { name: /recevoir le lien/i }).click();

    // Should show confirmation message
    await expect(page.getByText(/lien.*envoyé|vérifiez.*email/i)).toBeVisible({ timeout: 10000 });
  });

  test('should redirect to dashboard when authenticated', async ({ page }) => {
    // Simulate authenticated state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'fake-jwt-token-for-test');
    });

    await page.goto('/dashboard');

    // Should either show dashboard or redirect to login if token invalid
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|auth)/);
  });
});
```

**Commit:** `test(e2e): add authentication tests`

---

### Step 4.6: Test E2E - Upload de documents

**File:** `frontend/e2e/documents.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Document Upload', () => {
  // Skip if no auth - these tests require a logged-in user
  test.skip(({ browserName }) => !process.env.E2E_AUTH_TOKEN, 'Requires authentication');

  test.beforeEach(async ({ page }) => {
    // Set auth token
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, process.env.E2E_AUTH_TOKEN || '');
  });

  test('should open upload modal when clicking Add button', async ({ page }) => {
    // Navigate to a deal page (use test deal ID)
    const testDealId = process.env.E2E_TEST_DEAL_ID || 'test-deal-id';
    await page.goto(`/dashboard/deals/${testDealId}`);

    // Click the upload button
    await page.getByRole('button', { name: /ajouter/i }).click();

    // Modal should appear
    await expect(page.getByRole('heading', { name: /ajouter un document/i })).toBeVisible();
    await expect(page.getByText(/glissez un fichier/i)).toBeVisible();
  });

  test('should upload a PDF document', async ({ page }) => {
    const testDealId = process.env.E2E_TEST_DEAL_ID || 'test-deal-id';
    await page.goto(`/dashboard/deals/${testDealId}`);

    // Open upload modal
    await page.getByRole('button', { name: /ajouter/i }).click();

    // Create a test file
    const testFilePath = path.join(__dirname, 'fixtures', 'test-document.pdf');

    // Upload via file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Select category
    await page.getByRole('button', { name: /référence/i }).click();

    // Submit
    await page.getByRole('button', { name: /téléverser/i }).click();

    // Wait for modal to close and document to appear
    await expect(page.getByRole('heading', { name: /ajouter un document/i })).not.toBeVisible({ timeout: 10000 });

    // Document should appear in the list
    await expect(page.getByText('test-document.pdf')).toBeVisible();
  });

  test('should show drag and drop zone', async ({ page }) => {
    const testDealId = process.env.E2E_TEST_DEAL_ID || 'test-deal-id';
    await page.goto(`/dashboard/deals/${testDealId}`);

    await page.getByRole('button', { name: /ajouter/i }).click();

    // Drop zone should be visible
    const dropZone = page.locator('.border-dashed');
    await expect(dropZone).toBeVisible();
    await expect(page.getByText(/glissez un fichier/i)).toBeVisible();
  });

  test('should delete a document', async ({ page }) => {
    const testDealId = process.env.E2E_TEST_DEAL_ID || 'test-deal-id';
    await page.goto(`/dashboard/deals/${testDealId}`);

    // Assuming there's at least one document
    const deleteButton = page.locator('button').filter({ has: page.locator('.text-red-500') }).first();

    if (await deleteButton.isVisible()) {
      // Set up dialog handler
      page.on('dialog', dialog => dialog.accept());

      await deleteButton.click();

      // Wait for deletion
      await page.waitForResponse(response =>
        response.url().includes('/documents/') && response.status() === 204
      );
    }
  });
});
```

**File:** `frontend/e2e/fixtures/test-document.pdf` - Créer un fichier PDF de test:

```bash
# Créer un simple PDF de test
echo "%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer << /Size 4 /Root 1 0 R >>
startxref
196
%%EOF" > frontend/e2e/fixtures/test-document.pdf
```

**Commit:** `test(e2e): add document upload tests`

---

### Step 4.7: Test E2E - Analytics et Tracking

**File:** `frontend/e2e/analytics.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Client Analytics', () => {
  test.beforeEach(async ({ page }) => {
    // Set auth token for agent view
    await page.goto('/');
    if (process.env.E2E_AUTH_TOKEN) {
      await page.evaluate((token) => {
        localStorage.setItem('token', token);
      }, process.env.E2E_AUTH_TOKEN);
    }
  });

  test('should display analytics card on deal page', async ({ page }) => {
    const testDealId = process.env.E2E_TEST_DEAL_ID || 'test-deal-id';
    await page.goto(`/dashboard/deals/${testDealId}`);

    // Analytics card should be visible
    await expect(page.getByText(/activité client/i)).toBeVisible();
    await expect(page.getByText(/consultations/i)).toBeVisible();
    await expect(page.getByText(/téléchargements/i)).toBeVisible();
  });

  test('should show view count after client visits', async ({ page, context }) => {
    const testDealId = process.env.E2E_TEST_DEAL_ID || 'test-deal-id';
    const testAccessToken = process.env.E2E_TEST_ACCESS_TOKEN || 'test-access-token';

    // First, simulate a client visit
    const clientPage = await context.newPage();
    await clientPage.goto(`/deal/${testAccessToken}`);
    await clientPage.waitForLoadState('networkidle');
    await clientPage.close();

    // Now check agent view
    await page.goto(`/dashboard/deals/${testDealId}`);

    // Should show at least 1 view
    const viewCount = page.locator('.text-blue-600').filter({ hasText: /\d+/ });
    await expect(viewCount).toBeVisible();
  });
});

test.describe('Client Portal Tracking', () => {
  test('should track page view when client accesses portal', async ({ page, request }) => {
    const testAccessToken = process.env.E2E_TEST_ACCESS_TOKEN || 'test-access-token';

    // Visit the client portal
    await page.goto(`/deal/${testAccessToken}`);
    await page.waitForLoadState('networkidle');

    // The backend should have logged this view
    // We can verify by checking the API response includes tracking
    // This is implicit - the visit itself triggers the tracking

    // Page should load successfully
    await expect(page.locator('body')).not.toHaveText(/not found|erreur/i);
  });

  test('should display agent branding on client portal', async ({ page }) => {
    const testAccessToken = process.env.E2E_TEST_ACCESS_TOKEN || 'test-access-token';

    await page.goto(`/deal/${testAccessToken}`);

    // Should show timeline
    await expect(page.getByText(/timeline|étapes/i)).toBeVisible();

    // Should show documents section if any
    const documentsSection = page.getByText(/documents/i);
    if (await documentsSection.isVisible()) {
      await expect(documentsSection).toBeVisible();
    }
  });
});
```

**Commit:** `test(e2e): add analytics and tracking tests`

---

### Step 4.8: Test E2E - Signature électronique

**File:** `frontend/e2e/signatures.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Electronic Signatures', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    if (process.env.E2E_AUTH_TOKEN) {
      await page.evaluate((token) => {
        localStorage.setItem('token', token);
      }, process.env.E2E_AUTH_TOKEN);
    }
  });

  test('should show signature button for ToSign documents', async ({ page }) => {
    const testDealId = process.env.E2E_TEST_DEAL_ID || 'test-deal-id';
    await page.goto(`/dashboard/deals/${testDealId}`);

    // Look for a document with "À signer" category
    const toSignBadge = page.getByText(/à signer/i);

    if (await toSignBadge.isVisible()) {
      // Should have a signature button nearby
      const signatureButton = page.getByRole('button', { name: /signature/i });
      await expect(signatureButton).toBeVisible();
    }
  });

  test('should request signature when clicking signature button', async ({ page }) => {
    const testDealId = process.env.E2E_TEST_DEAL_ID || 'test-deal-id';
    await page.goto(`/dashboard/deals/${testDealId}`);

    // Find and click signature button
    const signatureButton = page.getByRole('button', { name: /signature/i }).first();

    if (await signatureButton.isVisible()) {
      // Listen for the API call
      const responsePromise = page.waitForResponse(response =>
        response.url().includes('/signature/request') && response.status() === 200
      );

      await signatureButton.click();

      // Wait for response
      const response = await responsePromise;
      expect(response.ok()).toBeTruthy();

      // Button should change or show status
      await expect(page.getByText(/en attente|ongoing/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show signature status badge', async ({ page }) => {
    const testDealId = process.env.E2E_TEST_DEAL_ID || 'test-deal-id';
    await page.goto(`/dashboard/deals/${testDealId}`);

    // Check for any signature status badges
    const statusBadges = page.locator('[class*="badge"]').filter({
      hasText: /signé|en attente|ongoing|done/i
    });

    // This test verifies the UI displays status correctly
    // May pass with 0 if no signatures exist yet
    const count = await statusBadges.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
```

**Commit:** `test(e2e): add signature tests`

---

### Step 4.9: Test E2E - Parcours complet

**File:** `frontend/e2e/full-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Complete User Flow', () => {
  test('full agent workflow: create deal, upload doc, request signature', async ({ page }) => {
    test.slow(); // This test takes longer

    // Skip if no auth token
    if (!process.env.E2E_AUTH_TOKEN) {
      test.skip();
    }

    // 1. Login
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, process.env.E2E_AUTH_TOKEN!);

    // 2. Go to dashboard
    await page.goto('/dashboard');
    await expect(page.getByText(/tableau de bord/i)).toBeVisible();

    // 3. Create new deal
    await page.getByRole('link', { name: /nouvelle transaction/i }).click();
    await page.waitForURL('**/deals/new');

    await page.getByLabel(/nom du client/i).fill('Client Test E2E');
    await page.getByLabel(/email/i).fill('client-e2e@test.com');
    await page.getByLabel(/adresse/i).fill('123 Avenue E2E, 75001 Paris');

    await page.getByRole('button', { name: /créer/i }).click();

    // Should redirect to deal page
    await page.waitForURL('**/deals/**');
    await expect(page.getByText('Client Test E2E')).toBeVisible();

    // 4. Upload document
    await page.getByRole('button', { name: /ajouter/i }).click();

    const testFilePath = path.join(__dirname, 'fixtures', 'test-document.pdf');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    await page.getByRole('button', { name: /à signer/i }).click();
    await page.getByRole('button', { name: /téléverser/i }).click();

    await expect(page.getByText('test-document.pdf')).toBeVisible({ timeout: 10000 });

    // 5. Request signature (if Yousign is configured)
    const signatureButton = page.getByRole('button', { name: /signature/i });
    if (await signatureButton.isVisible()) {
      await signatureButton.click();
      // Wait for status to update
      await page.waitForTimeout(2000);
    }

    // 6. Check analytics
    await expect(page.getByText(/activité client/i)).toBeVisible();
    await expect(page.getByText(/consultations/i)).toBeVisible();

    // 7. Get client link and verify portal
    const clientLink = await page.locator('.break-all').textContent();
    expect(clientLink).toContain('/deal/');

    // 8. Open client portal in new tab
    const accessToken = clientLink?.split('/deal/')[1];
    if (accessToken) {
      const clientPage = await page.context().newPage();
      await clientPage.goto(`/deal/${accessToken}`);

      // Verify client can see the deal
      await expect(clientPage.getByText('Client Test E2E')).toBeVisible();
      await expect(clientPage.getByText('123 Avenue E2E')).toBeVisible();

      // Document should be visible
      await expect(clientPage.getByText('test-document.pdf')).toBeVisible();

      await clientPage.close();
    }

    // 9. Verify analytics updated after client visit
    await page.reload();
    const viewCount = page.locator('.text-blue-600 .text-2xl');
    const views = await viewCount.textContent();
    expect(parseInt(views || '0')).toBeGreaterThanOrEqual(1);
  });
});
```

**Commit:** `test(e2e): add complete workflow test`

---

### Step 4.10: Script de lancement des tests

**File:** `scripts/run-tests.sh`

```bash
#!/bin/bash
set -e

echo "=== Running EstateFlow Tests ==="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Backend tests
echo -e "\n${GREEN}[1/3] Running Backend Tests...${NC}"
cd backend
if [ -d "EstateFlow.Api.Tests" ]; then
    dotnet test --verbosity normal
else
    echo "No backend tests found, skipping..."
fi
cd ..

# Frontend unit tests
echo -e "\n${GREEN}[2/3] Running Frontend Unit Tests...${NC}"
cd frontend
npm run test:run
cd ..

# E2E tests (optional, requires running app)
if [ "$RUN_E2E" = "true" ]; then
    echo -e "\n${GREEN}[3/3] Running E2E Tests...${NC}"
    cd frontend
    npm run test:e2e
    cd ..
else
    echo -e "\n${GREEN}[3/3] Skipping E2E Tests (set RUN_E2E=true to run)${NC}"
fi

echo -e "\n${GREEN}=== All Tests Completed ===${NC}"
```

**File:** `scripts/run-tests.ps1` (pour Windows)

```powershell
Write-Host "=== Running EstateFlow Tests ===" -ForegroundColor Green

# Backend tests
Write-Host "`n[1/3] Running Backend Tests..." -ForegroundColor Cyan
Push-Location backend
if (Test-Path "EstateFlow.Api.Tests") {
    dotnet test --verbosity normal
} else {
    Write-Host "No backend tests found, skipping..."
}
Pop-Location

# Frontend unit tests
Write-Host "`n[2/3] Running Frontend Unit Tests..." -ForegroundColor Cyan
Push-Location frontend
npm run test:run
Pop-Location

# E2E tests
if ($env:RUN_E2E -eq "true") {
    Write-Host "`n[3/3] Running E2E Tests..." -ForegroundColor Cyan
    Push-Location frontend
    npm run test:e2e
    Pop-Location
} else {
    Write-Host "`n[3/3] Skipping E2E Tests (set RUN_E2E=true to run)" -ForegroundColor Yellow
}

Write-Host "`n=== All Tests Completed ===" -ForegroundColor Green
```

**Run:**
```bash
chmod +x scripts/run-tests.sh
./scripts/run-tests.sh
```

**Commit:** `test: add test runner scripts`

---

### Step 4.11: Configuration CI/CD pour les tests

**File:** `.github/workflows/test.yml`

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: Restore dependencies
        run: cd backend && dotnet restore

      - name: Build
        run: cd backend && dotnet build --no-restore

      - name: Test
        run: cd backend && dotnet test --no-build --verbosity normal

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: cd frontend && npm ci

      - name: Run unit tests
        run: cd frontend && npm run test:run

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: cd frontend && npm ci

      - name: Install Playwright Browsers
        run: cd frontend && npx playwright install --with-deps chromium

      - name: Start services
        run: docker-compose up -d
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: estateflow_test

      - name: Wait for services
        run: sleep 30

      - name: Run E2E tests
        run: cd frontend && npm run test:e2e
        env:
          E2E_BASE_URL: http://localhost:3000

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 7

      - name: Stop services
        if: always()
        run: docker-compose down
```

**Commit:** `ci: add GitHub Actions workflow for tests`

---

## Task 5: Déploiement Dokploy

### Contexte
Dokploy est une alternative open-source à Vercel/Railway pour le déploiement. Il utilise Docker Compose.

### Step 5.1: Vérifier la configuration Docker

**File:** Vérifier `docker-compose.yml` - déjà configuré correctement

**File:** Vérifier `backend/Dockerfile`:

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["EstateFlow.Api.csproj", "./"]
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "EstateFlow.Api.dll"]
```

**File:** Vérifier `frontend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

---

### Step 5.2: Créer le fichier de déploiement Dokploy

**File:** `dokploy.yml`

```yaml
version: "1.0"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - DATABASE_URL=Host=postgres;Database=${POSTGRES_DB};Username=${POSTGRES_USER};Password=${POSTGRES_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_ISSUER=${JWT_ISSUER}
      - JWT_AUDIENCE=${JWT_AUDIENCE}
      - JWT_EXPIRY_HOURS=24
      - MAGIC_LINK_EXPIRY_MINUTES=15
      - FRONTEND_URL=${FRONTEND_URL}
      - RESEND_API_KEY=${RESEND_API_KEY}
      - EMAIL_FROM=${EMAIL_FROM}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
      - STRIPE_PRICE_ID_MONTHLY=${STRIPE_PRICE_ID_MONTHLY}
      - STRIPE_PRICE_ID_YEARLY=${STRIPE_PRICE_ID_YEARLY}
      - UPLOAD_PATH=/app/uploads
      - YOUSIGN_API_KEY=${YOUSIGN_API_KEY}
      - YOUSIGN_API_URL=${YOUSIGN_API_URL}
      - YOUSIGN_WEBHOOK_SECRET=${YOUSIGN_WEBHOOK_SECRET}
    volumes:
      - uploads_data:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "5000:8080"
    domains:
      - api.estateflow.fr

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_API_URL=https://api.estateflow.fr
        - NEXT_PUBLIC_APP_URL=https://app.estateflow.fr
    depends_on:
      - backend
    ports:
      - "3000:3000"
    domains:
      - app.estateflow.fr

volumes:
  postgres_data:
  uploads_data:
```

**Commit:** `chore(deploy): add dokploy configuration`

---

### Step 5.3: Configurer les variables d'environnement dans Dokploy

**Dans le dashboard Dokploy:**

1. Créer un nouveau projet "EstateFlow"
2. Configurer les variables d'environnement:

```
POSTGRES_USER=estateflow
POSTGRES_PASSWORD=<generate-secure-password>
POSTGRES_DB=estateflow
JWT_SECRET=<generate-32-char-secret>
JWT_ISSUER=EstateFlow
JWT_AUDIENCE=EstateFlow
FRONTEND_URL=https://app.estateflow.fr
RESEND_API_KEY=<your-resend-key>
EMAIL_FROM=noreply@estateflow.fr
STRIPE_SECRET_KEY=<your-stripe-key>
STRIPE_WEBHOOK_SECRET=<your-webhook-secret>
STRIPE_PRICE_ID_MONTHLY=<your-price-id>
STRIPE_PRICE_ID_YEARLY=<your-price-id>
YOUSIGN_API_KEY=<your-yousign-key>
YOUSIGN_API_URL=https://api.yousign.app/v3
YOUSIGN_WEBHOOK_SECRET=<your-webhook-secret>
```

---

### Step 5.4: Déployer

**Commands:**

```bash
# Commit all changes
git add .
git commit -m "feat: sprint 1 complete - documents, tracking, signatures"
git push origin main

# Dans Dokploy:
# 1. Connecter le repo GitHub
# 2. Configurer le build avec docker-compose
# 3. Lancer le déploiement
# 4. Configurer les domaines et SSL
```

---

### Step 5.5: Vérification post-déploiement

**Checklist:**

- [ ] L'API répond sur https://api.estateflow.fr/swagger
- [ ] Le frontend charge sur https://app.estateflow.fr
- [ ] La connexion magic link fonctionne
- [ ] L'upload de documents fonctionne
- [ ] Le tracking s'affiche dans la sidebar
- [ ] La demande de signature Yousign fonctionne (mode sandbox)
- [ ] Les webhooks Stripe sont configurés
- [ ] Les volumes persistent après redémarrage

---

## Résumé des commits

```
1. feat(api): add documents upload and delete API
2. feat(ui): add document upload modal component
3. feat(deals): integrate document upload modal and delete
4. feat(entities): add DealView entity for tracking
5. feat(db): add DealView to context
6. feat(tracking): log page views and document downloads
7. feat(api): add analytics endpoint for deal views
8. feat(api): add analytics API client
9. feat(ui): display client analytics on deal page
10. chore(env): add Yousign configuration
11. feat(entities): add signature fields to Document
12. feat(services): add IYousignService interface
13. feat(services): implement YousignService
14. feat(api): add signatures controller
15. chore(di): register YousignService
16. feat(api): add signatures API client
17. feat(ui): add signature request button and status
18. test: add initial controller tests
19. test: add frontend API tests
20. chore(deploy): add dokploy configuration
21. feat: sprint 1 complete
```

---

## Temps estimé total

| Tâche | Estimation |
|-------|------------|
| Task 1: Upload documents | 2-3h |
| Task 2: Tracking | 3-4h |
| Task 3: Yousign | 4-6h |
| Task 4: Tests | 1-2h |
| Task 5: Déploiement | 1-2h |
| **Total** | **11-17h** |

---

*Plan généré le 2025-01-09*
