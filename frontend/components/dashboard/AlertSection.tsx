'use client';

import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertItem } from './AlertItem';
import { AlertItemDto, AlertItemWithAgentDto } from '@/lib/api';

interface AlertSectionProps {
  alerts: (AlertItemDto | AlertItemWithAgentDto)[];
  showAgent?: boolean;
}

export function AlertSection({ alerts, showAgent = false }: AlertSectionProps) {
  const criticalAlerts = alerts.filter(a => a.alertLevel === 'critical');
  const warningAlerts = alerts.filter(a => a.alertLevel === 'warning');

  if (alerts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-emerald-100">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-emerald-800">Aucune urgence aujourd&apos;hui</p>
                <p className="text-sm text-emerald-600">Tous les deals sont dans les temps</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-white/80 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-serif">Aujourd&apos;hui</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {criticalAlerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-red-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Critiques ({criticalAlerts.length})
              </h4>
              <div className="space-y-2">
                {criticalAlerts.map((alert, index) => (
                  <AlertItem key={`${alert.dealId}-${index}`} alert={alert} showAgent={showAgent} />
                ))}
              </div>
            </div>
          )}

          {warningAlerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-orange-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                A surveiller ({warningAlerts.length})
              </h4>
              <div className="space-y-2">
                {warningAlerts.map((alert, index) => (
                  <AlertItem key={`${alert.dealId}-${index}`} alert={alert} showAgent={showAgent} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
