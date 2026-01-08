'use client';

import { cn } from '@/lib/utils';

interface ShimmerProgressProps {
  value: number;
  className?: string;
  showLabel?: boolean;
}

export function ShimmerProgress({
  value,
  className,
  showLabel = false
}: ShimmerProgressProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <div className="flex justify-between text-sm">
          <span className="text-taupe">Progression</span>
          <span className="font-serif text-lg font-semibold text-gold">{value}%</span>
        </div>
      )}
      <div className="h-3 bg-beige rounded-full overflow-hidden">
        <div
          className="h-full rounded-full shimmer transition-all duration-700 ease-out"
          style={{
            width: `${value}%`,
            background: 'linear-gradient(90deg, hsl(43, 45%, 59%), hsl(43, 55%, 67%))'
          }}
        />
      </div>
    </div>
  );
}
