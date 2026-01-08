'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { templatesApi, dealsApi, dealsApiExtended, Template, CreateDealRequest, CanCreateDealResponse } from '@/lib/api';
import { ArrowLeft, Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function NewDealPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [canCreateInfo, setCanCreateInfo] = useState<CanCreateDealResponse | null>(null);
  const [checkingLimit, setCheckingLimit] = useState(true);

  const [formData, setFormData] = useState<CreateDealRequest>({
    clientName: '',
    clientEmail: '',
    propertyAddress: '',
    propertyPhotoUrl: '',
    welcomeMessage: '',
    templateId: undefined,
  });

  useEffect(() => {
    if (token) {
      loadTemplates();
      checkCanCreate();
    }
  }, [token]);

  const checkCanCreate = async () => {
    try {
      const info = await dealsApiExtended.canCreate(token!);
      setCanCreateInfo(info);
    } catch (error) {
      console.error('Failed to check deal limit:', error);
    } finally {
      setCheckingLimit(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await templatesApi.list(token!);
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const deal = await dealsApi.create(token!, formData);
      router.push(`/dashboard/deals/${deal.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof CreateDealRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value || undefined }));
  };

  // Show loading while checking limit
  if (checkingLimit) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  // Show upgrade prompt if limit reached
  if (canCreateInfo && !canCreateInfo.canCreate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/deals">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Nouvelle transaction</h1>
        </div>

        <Card className="border-yellow-500/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center py-8">
              <div className="rounded-full bg-yellow-500/20 p-4 mb-4">
                <Lock className="h-8 w-8 text-yellow-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Limite atteinte</h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Vous avez atteint la limite de {canCreateInfo.currentDeals} transaction gratuite.
                Passez a Pro pour creer des transactions illimitees.
              </p>
              <Link href="/dashboard/subscription">
                <Button size="lg" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Passer a Pro
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Features preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Avantages Pro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 md:grid-cols-2">
              {[
                'Transactions illimitees',
                'Branding personnalise',
                'Support prioritaire',
                'Documents securises',
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/deals">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Nouvelle transaction</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client info */}
        <Card>
          <CardHeader>
            <CardTitle>Informations client</CardTitle>
            <CardDescription>Les coordonnees de votre client</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom du client *</label>
              <Input
                placeholder="M. et Mme Dupont"
                value={formData.clientName}
                onChange={(e) => handleChange('clientName', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email du client *</label>
              <Input
                type="email"
                placeholder="client@email.com"
                value={formData.clientEmail}
                onChange={(e) => handleChange('clientEmail', e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Property info */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du bien</CardTitle>
            <CardDescription>Details sur la propriete</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Adresse du bien *</label>
              <Input
                placeholder="123 Avenue des Champs-Elysees, 75008 Paris"
                value={formData.propertyAddress}
                onChange={(e) => handleChange('propertyAddress', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">URL de la photo du bien</label>
              <Input
                type="url"
                placeholder="https://..."
                value={formData.propertyPhotoUrl}
                onChange={(e) => handleChange('propertyPhotoUrl', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Template selection */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Choisissez un modele de timeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleChange('templateId', template.id)}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    formData.templateId === template.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary'
                      : 'hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium">{template.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {JSON.parse(template.steps).length} etapes
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Welcome message */}
        <Card>
          <CardHeader>
            <CardTitle>Message de bienvenue</CardTitle>
            <CardDescription>Message personnalise affiche au client</CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full min-h-[100px] px-3 py-2 border rounded-md text-sm"
              placeholder="Bienvenue dans le suivi de votre acquisition..."
              value={formData.welcomeMessage}
              onChange={(e) => handleChange('welcomeMessage', e.target.value)}
            />
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <div className="flex justify-end gap-4">
          <Link href="/dashboard/deals">
            <Button type="button" variant="outline">Annuler</Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creation en cours...' : 'Creer la transaction'}
          </Button>
        </div>
      </form>
    </div>
  );
}
