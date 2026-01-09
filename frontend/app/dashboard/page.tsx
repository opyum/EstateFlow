'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { SerifHeading } from '@/components/ui/serif-heading';
import { ShimmerProgress } from '@/components/ui/shimmer-progress';
import { AnimatedSection } from '@/components/ui/animated-section';
import { agentApi, dealsApi, stripeApi, AgentStats, Deal } from '@/lib/api';
import { Plus, FileText, CheckCircle, Clock, Sparkles, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  const { token, agent, refreshAgent } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [recentDeals, setRecentDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Handle return from Stripe checkout
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId && token && !isSyncing) {
      setIsSyncing(true);
      // Sync subscription status from Stripe and refresh agent data
      stripeApi.syncSubscription(token)
        .then(() => refreshAgent())
        .catch(console.error)
        .finally(() => {
          setIsSyncing(false);
          // Remove session_id from URL to prevent re-syncing on refresh
          router.replace('/dashboard', { scroll: false });
        });
    }
  }, [searchParams, token, refreshAgent, router, isSyncing]);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      const [statsData, dealsData] = await Promise.all([
        agentApi.getStats(token!),
        dealsApi.list(token!),
      ]);
      setStats(statsData);
      setRecentDeals(dealsData.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'completed':
        return <Badge variant="secondary">Terminee</Badge>;
      case 'archived':
        return <Badge variant="outline">Archivee</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <AnimatedSection>
        <div className="flex justify-between items-center">
          <div>
            <SerifHeading as="h1">
              Bonjour{agent?.fullName ? `, ${agent.fullName}` : ''} !
            </SerifHeading>
            <p className="text-taupe mt-1">
              Voici un apercu de vos transactions
            </p>
          </div>
          <Link href="/dashboard/deals/new">
            <Button variant="gold" size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle transaction
            </Button>
          </Link>
        </div>
      </AnimatedSection>

      {/* Upgrade Banner - show for trial users with at least 1 deal */}
      {agent?.subscriptionStatus?.toLowerCase() !== 'active' && stats && stats.totalDeals >= 1 && (
        <AnimatedSection delay={0.1}>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-yellow-500/30 p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-yellow-500/20 p-3">
                  <Sparkles className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal">Passez a Pro pour des transactions illimitees</h3>
                  <p className="text-sm text-taupe">
                    Vous avez utilise votre transaction d'essai gratuite. Debloquez tout le potentiel d'EstateFlow.
                  </p>
                </div>
              </div>
              <Link href="/dashboard/subscription">
                <Button variant="gold" className="gap-2 shrink-0">
                  Voir les offres
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </AnimatedSection>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total transactions"
          value={stats?.totalDeals || 0}
          icon={FileText}
        />
        <StatCard
          title="En cours"
          value={stats?.activeDeals || 0}
          icon={Clock}
        />
        <StatCard
          title="Terminees"
          value={stats?.completedDeals || 0}
          icon={CheckCircle}
        />
      </div>

      {/* Recent deals */}
      <AnimatedSection delay={0.2}>
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transactions recentes</CardTitle>
            <Link href="/dashboard/deals">
              <Button variant="outline" size="sm">Voir tout</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentDeals.length === 0 ? (
              <p className="text-center text-taupe py-8">
                Aucune transaction pour le moment.{' '}
                <Link href="/dashboard/deals/new" className="text-gold hover:underline">
                  Creer votre premiere transaction
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {recentDeals.map((deal, index) => {
                  const progress = deal.timelineSteps.length > 0
                    ? Math.round((deal.timelineSteps.filter(s => s.status === 'Completed').length / deal.timelineSteps.length) * 100)
                    : 0;

                  return (
                    <motion.div
                      key={deal.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={`/dashboard/deals/${deal.id}`}
                        className="flex items-center justify-between p-4 rounded-xl bg-white/50 border border-transparent hover:border-gold/30 hover:bg-white/70 transition-all duration-300"
                      >
                        <div className="flex-1 min-w-0 mr-4">
                          <p className="font-medium text-charcoal truncate">{deal.clientName}</p>
                          <p className="text-sm text-taupe truncate">{deal.propertyAddress}</p>
                          <div className="mt-2 max-w-[200px]">
                            <ShimmerProgress value={progress} />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-sm text-taupe">
                            {deal.timelineSteps.filter(s => s.status === 'Completed').length}/{deal.timelineSteps.length}
                          </span>
                          {getStatusBadge(deal.status)}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </AnimatedSection>
    </div>
  );
}
