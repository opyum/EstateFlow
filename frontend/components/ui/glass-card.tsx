'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'dark' | 'hover';
  animated?: boolean;
}

export function GlassCard({
  children,
  className,
  variant = 'default',
  animated = true,
}: GlassCardProps) {
  const baseClasses = cn(
    'rounded-xl transition-all duration-300 ease-out',
    variant === 'default' && 'bg-white/70 backdrop-blur-md border border-white/20 shadow-lg',
    variant === 'dark' && 'bg-white/85 backdrop-blur-xl border border-white/30 shadow-lg',
    variant === 'hover' && 'bg-white/70 backdrop-blur-md border border-white/20 shadow-lg hover:-translate-y-0.5 hover:shadow-xl hover:border-gold/30',
    className
  );

  if (animated) {
    return (
      <motion.div
        className={baseClasses}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={baseClasses}>
      {children}
    </div>
  );
}
