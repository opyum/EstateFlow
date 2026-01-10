'use client';

import { motion } from 'framer-motion';
import { Briefcase, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendBadge } from './TrendBadge';
import { KpisDto } from '@/lib/api';
import { cn } from '@/lib/utils';

interface KpiCardsProps {
  kpis: KpisDto;
}

export function KpiCards({ kpis }: KpiCardsProps) {
  const cards = [
    {
      title: 'Deals actifs',
      value: kpis.activeDeals,
      trend: kpis.activeDealsTrend,
      icon: Briefcase,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'En alerte',
      value: kpis.alertDeals,
      trend: null,
      subtitle: kpis.alertCritical > 0 || kpis.alertWarning > 0
        ? `${kpis.alertCritical} critique${kpis.alertCritical > 1 ? 's' : ''}, ${kpis.alertWarning} a surveiller`
        : 'Aucune alerte',
      icon: AlertTriangle,
      color: kpis.alertCritical > 0 ? 'text-red-600' : kpis.alertWarning > 0 ? 'text-orange-500' : 'text-emerald-600',
      bgColor: kpis.alertCritical > 0 ? 'bg-red-50' : kpis.alertWarning > 0 ? 'bg-orange-50' : 'bg-emerald-50',
    },
    {
      title: 'Completes ce mois',
      value: kpis.completedThisMonth,
      trend: kpis.completedTrend,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Delai moyen',
      value: kpis.avgCompletionDays,
      trend: kpis.avgCompletionTrend,
      suffix: ' jours',
      inverted: true,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-bold text-charcoal">
                      {card.value}{card.suffix || ''}
                    </span>
                    {card.trend !== null && (
                      <TrendBadge value={card.trend} inverted={card.inverted} />
                    )}
                  </div>
                  {card.subtitle && (
                    <p className={cn('text-xs mt-1', card.color)}>{card.subtitle}</p>
                  )}
                </div>
                <div className={cn('p-3 rounded-xl', card.bgColor)}>
                  <card.icon className={cn('h-6 w-6', card.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
