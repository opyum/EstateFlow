'use client';

import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WeekItem } from './WeekItem';
import { WeekDayDto, WeekDayWithAgentDto } from '@/lib/api';

interface WeekSectionProps {
  days: (WeekDayDto | WeekDayWithAgentDto)[];
  showAgent?: boolean;
}

export function WeekSection({ days, showAgent = false }: WeekSectionProps) {
  const formatDayHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Demain';
    }
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  if (days.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-white/80 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-serif flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              Cette semaine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Aucune echeance prevue cette semaine
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="bg-white/80 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-serif flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Cette semaine
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {days.map((day) => (
            <div key={day.date}>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 capitalize">
                {formatDayHeader(day.date)}
              </h4>
              <div className="space-y-2">
                {day.items.map((item, index) => (
                  <WeekItem
                    key={`${item.dealId}-${index}`}
                    item={item}
                    showAgent={showAgent}
                  />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
