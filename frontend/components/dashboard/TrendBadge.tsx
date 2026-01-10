'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendBadgeProps {
  value: number;
  inverted?: boolean; // Pour les metriques ou moins = mieux (ex: delai moyen)
  className?: string;
}

export function TrendBadge({ value, inverted = false, className }: TrendBadgeProps) {
  if (value === 0) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-sm text-muted-foreground', className)}>
        <Minus className="h-3 w-3" />
        <span>0</span>
      </span>
    );
  }

  const isPositive = inverted ? value < 0 : value > 0;
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  const displayValue = Math.abs(value);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium',
        isPositive ? 'text-emerald-600' : 'text-red-500',
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{value > 0 ? '+' : '-'}{displayValue}</span>
    </span>
  );
}
