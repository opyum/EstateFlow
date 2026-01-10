'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { stripeApi, SubscriptionInfo } from '@/lib/api';
import { CreditCard, Check, Sparkles, Users, Diamond, ExternalLink, Info } from 'lucide-react';
import Link from 'next/link';

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Abonnement</h1>
        <p className="text-muted-foreground">
          Gerez votre abonnement EstateFlow
        </p>
      </div>

      {/* Billing Summary - only show for active subscribers */}
      {isActive && subscription && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle>Recapitulatif de facturation</CardTitle>
              </div>
              {agent && getStatusBadge(agent.subscriptionStatus)}
            </div>
            <CardDescription>
              Votre facturation mensuelle detaillee
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Line Items */}
            <div className="space-y-4">
              {/* Base Plan */}
              <div className="flex items-start justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Diamond className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">EstateFlow Pro</p>
                    <p className="text-sm text-muted-foreground">
                      Abonnement {subscription.plan === 'yearly' ? 'annuel' : 'mensuel'} de base
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(subscription.basePrice)}</p>
                  <p className="text-xs text-muted-foreground">/ mois</p>
                </div>
              </div>

              {/* Team Seats - only show if there are seats */}
              {subscription.seatCount > 0 && (
                <div className="flex items-start justify-between py-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-blue-500/10 p-2">
                      <Users className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">Sieges equipe</p>
                      <p className="text-sm text-muted-foreground">
                        {subscription.seatCount} {subscription.seatCount === 1 ? 'membre' : 'membres'} x {formatCurrency(subscription.seatUnitPrice)} / mois
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(subscription.seatCount * subscription.seatUnitPrice)}</p>
                    <p className="text-xs text-muted-foreground">/ mois</p>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-lg font-bold">Total mensuel</p>
                  {subscription?.currentPeriodEnd && (
                    <p className="text-sm text-muted-foreground">
                      {subscription.cancelAtPeriodEnd
                        ? `Expire le ${formatDate(subscription.currentPeriodEnd)}`
                        : `Prochain renouvellement le ${formatDate(subscription.currentPeriodEnd)}`
                      }
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{formatCurrency(subscription.totalMonthlyAmount)}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button onClick={handleManage} disabled={isLoading} className="flex-1">
                {isLoading ? 'Chargement...' : 'Gerer mon abonnement'}
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link href="/dashboard/team/members">
                  <Users className="h-4 w-4 mr-2" />
                  Gerer l'equipe
                </Link>
              </Button>
            </div>

            {/* Info Box */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Comment fonctionne la facturation ?</p>
                <p>
                  Votre abonnement EstateFlow Pro est de {formatCurrency(subscription.basePrice)}/mois.
                  Chaque membre invite a votre equipe ajoute {formatCurrency(subscription.seatUnitPrice)}/mois.
                  Les ajouts et suppressions de sieges sont calcules au prorata.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current status - simplified for active users */}
      {isActive && !subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Statut actuel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">EstateFlow Pro</p>
                  <p className="text-sm text-muted-foreground">Chargement...</p>
                </div>
              </div>
              {agent && getStatusBadge(agent.subscriptionStatus)}
            </div>
          </CardContent>
        </Card>
      )}

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

            {/* Seat pricing info */}
            <div className="text-center mb-6 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <Users className="h-4 w-4 inline mr-1" />
                Sieges supplementaires : <span className="font-medium text-foreground">10 EUR / mois</span> par membre
              </p>
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
              'Gestion d\'equipe multi-membres',
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
            <p className="font-medium">Comment fonctionne la facturation des sieges ?</p>
            <p className="text-sm text-muted-foreground">
              Chaque membre invite a votre equipe ajoute 10 EUR/mois. Les ajouts/suppressions sont calcules au prorata de votre cycle de facturation.
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
