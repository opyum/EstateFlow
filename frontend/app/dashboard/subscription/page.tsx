'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { stripeApi, SubscriptionInfo } from '@/lib/api';
import { CreditCard, Check, Sparkles } from 'lucide-react';

export default function SubscriptionPage() {
  const { token, agent } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    if (token) {
      stripeApi.getSubscription(token).then(setSubscription).catch(console.error);
    }
  }, [token]);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const { url } = await stripeApi.createCheckout(token!, selectedPlan);
      window.location.href = url;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      alert('Stripe n\'est pas configure. Contactez l\'administrateur.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManage = async () => {
    setIsLoading(true);
    try {
      const { url } = await stripeApi.createPortal(token!);
      window.location.href = url;
    } catch (error) {
      console.error('Failed to create portal session:', error);
      alert('Impossible d\'acceder au portail de gestion.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge variant="success">Actif</Badge>;
      case 'trial':
        return <Badge variant="warning">Essai gratuit</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annule</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expire</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const isActive = agent?.subscriptionStatus?.toLowerCase() === 'active';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Abonnement</h1>
        <p className="text-muted-foreground">
          Gerez votre abonnement EstateFlow
        </p>
      </div>

      {/* Current status */}
      <Card>
        <CardHeader>
          <CardTitle>Statut actuel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  EstateFlow {isActive ? 'Pro' : 'Essai'}
                </p>
                {subscription?.plan && (
                  <p className="text-sm text-muted-foreground">
                    {subscription.plan === 'monthly' ? '49 EUR / mois' : '470 EUR / an'}
                  </p>
                )}
                {subscription?.currentPeriodEnd && (
                  <p className="text-xs text-muted-foreground">
                    {subscription.cancelAtPeriodEnd
                      ? `Expire le ${formatDate(subscription.currentPeriodEnd)}`
                      : `Renouvellement le ${formatDate(subscription.currentPeriodEnd)}`
                    }
                  </p>
                )}
              </div>
            </div>
            {agent && getStatusBadge(agent.subscriptionStatus)}
          </div>

          {isActive && (
            <div className="mt-6">
              <Button onClick={handleManage} disabled={isLoading}>
                {isLoading ? 'Chargement...' : 'Gerer mon abonnement'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing - only show if not active */}
      {!isActive && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Passez a Pro
            </CardTitle>
            <CardDescription>Debloquez toutes les fonctionnalites</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Plan Toggle */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex rounded-lg border p-1 bg-muted">
                <button
                  onClick={() => setSelectedPlan('monthly')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedPlan === 'monthly'
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Mensuel
                </button>
                <button
                  onClick={() => setSelectedPlan('yearly')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedPlan === 'yearly'
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Annuel
                  <Badge variant="success" className="ml-2 text-xs">-20%</Badge>
                </button>
              </div>
            </div>

            {/* Pricing Display */}
            <div className="text-center mb-6">
              {selectedPlan === 'monthly' ? (
                <div>
                  <span className="text-4xl font-bold">49 EUR</span>
                  <span className="text-muted-foreground"> / mois</span>
                </div>
              ) : (
                <div>
                  <span className="text-4xl font-bold">470 EUR</span>
                  <span className="text-muted-foreground"> / an</span>
                  <p className="text-sm text-green-600 mt-1">
                    Soit ~39 EUR/mois - Economisez 118 EUR/an
                  </p>
                </div>
              )}
            </div>

            <Button onClick={handleSubscribe} disabled={isLoading} className="w-full" size="lg">
              {isLoading ? 'Chargement...' : `S'abonner - ${selectedPlan === 'monthly' ? '49 EUR/mois' : '470 EUR/an'}`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Fonctionnalites {isActive ? 'incluses' : 'Pro'}</CardTitle>
          <CardDescription>Tout ce dont vous avez besoin</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {[
              'Transactions illimitees',
              'Branding personnalise',
              'Notifications email automatiques',
              'Coffre-fort documents',
              'Timeline interactive',
              'Acces client securise',
              'Support prioritaire',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Trial info - only show if in trial */}
      {!isActive && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-yellow-500/20 p-2">
                <Sparkles className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium">Version d'essai</p>
                <p className="text-sm text-muted-foreground">
                  Vous pouvez creer 1 transaction gratuitement. Passez a Pro pour des transactions illimitees.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Questions frequentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium">Comment annuler mon abonnement ?</p>
            <p className="text-sm text-muted-foreground">
              Cliquez sur "Gerer mon abonnement" pour acceder au portail Stripe et annuler.
            </p>
          </div>
          <div>
            <p className="font-medium">Puis-je changer de formule ?</p>
            <p className="text-sm text-muted-foreground">
              Oui, vous pouvez passer du mensuel a l'annuel (ou inversement) via le portail de gestion.
            </p>
          </div>
          <div>
            <p className="font-medium">Y a-t-il un engagement ?</p>
            <p className="text-sm text-muted-foreground">
              Non, vous pouvez annuler a tout moment. L'acces reste actif jusqu'a la fin de la periode payee.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
