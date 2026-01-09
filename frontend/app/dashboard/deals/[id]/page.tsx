'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { dealsApi, stepsApi, documentsApi, Deal, TimelineStep } from '@/lib/api';
import { DocumentUploadModal } from '@/components/ui/document-upload-modal';
import { ArrowLeft, Plus, Check, Clock, Circle, ExternalLink, Trash2, Upload } from 'lucide-react';

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const dealId = params.id as string;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (token && dealId) {
      loadDeal();
    }
  }, [token, dealId]);

  const loadDeal = async () => {
    try {
      const data = await dealsApi.get(token!, dealId);
      setDeal(data);
    } catch (error) {
      console.error('Failed to load deal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStepStatus = async (step: TimelineStep, newStatus: string) => {
    try {
      await stepsApi.update(token!, dealId, step.id, { status: newStatus });
      loadDeal();
    } catch (error) {
      console.error('Failed to update step:', error);
    }
  };

  const addStep = async () => {
    if (!newStepTitle.trim()) return;

    setIsAddingStep(true);
    try {
      await stepsApi.create(token!, dealId, { title: newStepTitle });
      setNewStepTitle('');
      loadDeal();
    } catch (error) {
      console.error('Failed to add step:', error);
    } finally {
      setIsAddingStep(false);
    }
  };

  const deleteStep = async (stepId: string) => {
    if (!confirm('Supprimer cette etape ?')) return;

    try {
      await stepsApi.delete(token!, dealId, stepId);
      loadDeal();
    } catch (error) {
      console.error('Failed to delete step:', error);
    }
  };

  const updateDealStatus = async (status: string) => {
    try {
      await dealsApi.update(token!, dealId, { status });
      loadDeal();
    } catch (error) {
      console.error('Failed to update deal status:', error);
    }
  };

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

  const getStepIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'inprogress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-300" />;
    }
  };

  const getNextStatus = (current: string): string => {
    switch (current.toLowerCase()) {
      case 'pending':
        return 'InProgress';
      case 'inprogress':
        return 'Completed';
      default:
        return 'Pending';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Transaction non trouvee</p>
        <Link href="/dashboard/deals">
          <Button variant="link">Retour aux transactions</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/deals">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{deal.clientName}</h1>
            <p className="text-muted-foreground">{deal.propertyAddress}</p>
          </div>
        </div>
        <a
          href={`${appUrl}/deal/${deal.accessToken}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            Voir la page client
          </Button>
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {deal.timelineSteps.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Aucune etape dans la timeline
                </p>
              ) : (
                <div className="space-y-3">
                  {deal.timelineSteps.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateStepStatus(step, getNextStatus(step.status))}
                          className="hover:scale-110 transition-transform"
                        >
                          {getStepIcon(step.status)}
                        </button>
                        <div>
                          <p className={step.status === 'Completed' ? 'line-through text-muted-foreground' : ''}>
                            {step.title}
                          </p>
                          {step.description && (
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={step.status === 'Completed' ? 'secondary' : step.status === 'InProgress' ? 'warning' : 'outline'}>
                          {step.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteStep(step.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add step */}
              <div className="flex gap-2 pt-4 border-t">
                <Input
                  placeholder="Nouvelle etape..."
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addStep()}
                />
                <Button onClick={addStep} disabled={isAddingStep || !newStepTitle.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Documents</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setIsUploadModalOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {deal.documents.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Aucun document
                </p>
              ) : (
                <div className="space-y-2">
                  {deal.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{doc.filename}</p>
                        <Badge variant={doc.category === 'ToSign' ? 'default' : 'secondary'}>
                          {doc.category === 'ToSign' ? 'A signer' : 'Reference'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`${apiUrl}/api/deals/${dealId}/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm">
                            Telecharger
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
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Deal info */}
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-medium">{deal.clientName}</p>
                <p className="text-sm">{deal.clientEmail}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bien</p>
                <p className="font-medium">{deal.propertyAddress}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <select
                  value={deal.status}
                  onChange={(e) => updateDealStatus(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="Active">Active</option>
                  <option value="Completed">Terminee</option>
                  <option value="Archived">Archivee</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Client link */}
          <Card>
            <CardHeader>
              <CardTitle>Lien client</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-gray-50 rounded-lg break-all text-sm">
                {appUrl}/deal/{deal.accessToken}
              </div>
              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={() => {
                  navigator.clipboard.writeText(`${appUrl}/deal/${deal.accessToken}`);
                }}
              >
                Copier le lien
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleDocumentUpload}
      />
    </div>
  );
}
