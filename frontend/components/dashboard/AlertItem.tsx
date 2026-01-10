'use client';

import Link from 'next/link';
import { AlertCircle, Clock, User } from 'lucide-react';
import { AlertItemDto, AlertItemWithAgentDto } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AlertItemProps {
  alert: AlertItemDto | AlertItemWithAgentDto;
  showAgent?: boolean;
}

export function AlertItem({ alert, showAgent = false }: AlertItemProps) {
  const isCritical = alert.alertLevel === 'critical';
  const alertWithAgent = alert as AlertItemWithAgentDto;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getAlertMessage = () => {
    if (alert.alertType === 'overdue') {
      return `${alert.daysOverdue} jour${alert.daysOverdue > 1 ? 's' : ''} de retard`;
    }
    if (alert.alertType === 'inactive') {
      return `Inactif depuis ${alert.daysOverdue} jour${alert.daysOverdue > 1 ? 's' : ''}`;
    }
    if (alert.dueDate) {
      const dueDate = new Date(alert.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (dueDate.toDateString() === today.toDateString()) {
        return "Echeance aujourd'hui";
      }
      if (dueDate.toDateString() === tomorrow.toDateString()) {
        return 'Echeance demain';
      }
      return `Echeance le ${formatDate(alert.dueDate)}`;
    }
    return '';
  };

  return (
    <Link
      href={`/dashboard/deals/${alert.dealId}`}
      className={cn(
        'block p-4 rounded-lg border transition-all hover:shadow-md',
        isCritical
          ? 'bg-red-50 border-red-200 hover:border-red-300'
          : 'bg-orange-50 border-orange-200 hover:border-orange-300'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-full',
          isCritical ? 'bg-red-100' : 'bg-orange-100'
        )}>
          {alert.alertType === 'inactive' ? (
            <Clock className={cn('h-4 w-4', isCritical ? 'text-red-600' : 'text-orange-600')} />
          ) : (
            <AlertCircle className={cn('h-4 w-4', isCritical ? 'text-red-600' : 'text-orange-600')} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-charcoal truncate">{alert.dealName}</span>
            {showAgent && alertWithAgent.agentName && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {alertWithAgent.agentName}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{alert.stepTitle}</p>
          <p className={cn(
            'text-sm font-medium mt-1',
            isCritical ? 'text-red-600' : 'text-orange-600'
          )}>
            {getAlertMessage()}
          </p>
        </div>
      </div>
    </Link>
  );
}
