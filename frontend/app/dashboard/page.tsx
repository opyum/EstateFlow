'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { useAuth } from '@/lib/auth';
import { agentApi, stripeApi, AgentDashboardDto } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { KpiCards, AlertSection, WeekSection } from '@/components/dashboard';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, agent, refreshAgent } = useAuth();
  const [dashboard, setDashboard] = useState<AgentDashboardDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  // Handle Stripe checkout return
  useEffect(() => {
    const checkoutSuccess = searchParams.get('checkout');
    if (checkoutSuccess === 'success' && token) {
      stripeApi.syncSubscription(token)
        .then(() => refreshAgent())
        .catch(console.error);
    }
  }, [searchParams, token, refreshAgent]);

  const loadData = async () => {
    try {
      const dashboardData = await agentApi.getDashboard(token!);
      setDashboard(dashboardData);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-charcoal">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">
            Bienvenue, {agent?.fullName || agent?.email}
          </p>
        </div>
        <Link href="/dashboard/deals/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau deal
          </Button>
        </Link>
      </div>

      {/* Upgrade banner for trial users */}
      {agent?.subscriptionStatus === 'Trial' && dashboard && dashboard.kpis.activeDeals >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-r from-gold/10 to-gold/5 border-gold/20">
            <CardContent className="p-4 flex items-center justify-between">
              <p className="text-sm text-charcoal">
                Vous utilisez la version d&apos;essai. Passez a la version Pro pour gerer plus de deals.
              </p>
              <Link href="/dashboard/subscription">
                <Button size="sm" variant="outline" className="border-gold text-gold hover:bg-gold/10">
                  Voir les offres
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* KPIs */}
      {dashboard && <KpiCards kpis={dashboard.kpis} />}

      {/* Today's alerts */}
      {dashboard && <AlertSection alerts={dashboard.today} />}

      {/* This week */}
      {dashboard && <WeekSection days={dashboard.thisWeek} />}
    </div>
  );
}
