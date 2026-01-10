'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { organizationApi, OrgDashboardDto, TeamMemberStatsDto } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { KpiCards, AlertSection, WeekSection, TeamOverview, AgentDrilldown } from '@/components/dashboard';

export default function TeamDashboardPage() {
  const router = useRouter();
  const { token, isTeamLeadOrAbove, isAdmin, isLoading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<OrgDashboardDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<TeamMemberStatsDto | null>(null);

  useEffect(() => {
    if (!authLoading && !isTeamLeadOrAbove()) {
      router.push('/dashboard');
      return;
    }

    if (token && !authLoading) {
      loadData();
    }
  }, [token, authLoading, isTeamLeadOrAbove, router]);

  const loadData = async () => {
    try {
      const data = await organizationApi.getDashboard(token!);
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load team dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMemberClick = (agentId: string) => {
    const member = dashboard?.team.find(m => m.agentId === agentId);
    if (member) {
      setSelectedAgent(member);
    }
  };

  if (authLoading || isLoading) {
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
          <h1 className="text-3xl font-serif text-charcoal">Tableau de bord equipe</h1>
          <p className="text-muted-foreground mt-1">
            Vue d&apos;ensemble de l&apos;activite de votre equipe
          </p>
        </div>
        {isAdmin() && (
          <Link href="/dashboard/team/members">
            <Button variant="outline">
              Gerer l&apos;equipe
            </Button>
          </Link>
        )}
      </div>

      {/* KPIs */}
      {dashboard && <KpiCards kpis={dashboard.kpis} />}

      {/* Today's alerts */}
      {dashboard && <AlertSection alerts={dashboard.today} showAgent />}

      {/* This week */}
      {dashboard && <WeekSection days={dashboard.thisWeek} showAgent />}

      {/* Team overview */}
      {dashboard && (
        <TeamOverview
          members={dashboard.team}
          onMemberClick={handleMemberClick}
        />
      )}

      {/* Agent drilldown drawer */}
      {token && (
        <AgentDrilldown
          agent={selectedAgent}
          token={token}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}
