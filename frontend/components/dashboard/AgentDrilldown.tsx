'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KpiCards } from './KpiCards';
import { AlertSection } from './AlertSection';
import { WeekSection } from './WeekSection';
import { AgentDashboardDto, organizationApi, TeamMemberStatsDto } from '@/lib/api';

interface AgentDrilldownProps {
  agent: TeamMemberStatsDto | null;
  token: string;
  onClose: () => void;
}

export function AgentDrilldown({ agent, token, onClose }: AgentDrilldownProps) {
  const [dashboard, setDashboard] = useState<AgentDashboardDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (agent) {
      loadDashboard();
    }
  }, [agent]);

  const loadDashboard = async () => {
    if (!agent) return;

    setIsLoading(true);
    try {
      const data = await organizationApi.getAgentDashboard(token, agent.agentId);
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load agent dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {agent && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-cream z-50 shadow-2xl overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-cream/95 backdrop-blur-sm border-b border-border/50 p-6 flex items-center justify-between z-10">
              <h2 className="text-xl font-serif text-charcoal">{agent.agentName}</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : dashboard ? (
                <>
                  <KpiCards kpis={dashboard.kpis} />
                  <AlertSection alerts={dashboard.today} />
                  <WeekSection days={dashboard.thisWeek} />
                </>
              ) : (
                <p className="text-center text-muted-foreground py-12">
                  Impossible de charger les donnees
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
