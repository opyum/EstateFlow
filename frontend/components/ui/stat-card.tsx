'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, className }: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView && value > 0) {
      const duration = 1000;
      const steps = 30;
      const increment = value / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className={cn(
        'bg-white/70 backdrop-blur-md border border-white/20 shadow-lg rounded-xl p-6',
        'hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300',
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-taupe">{title}</p>
        <div className="p-2 rounded-full bg-gold/10">
          <Icon className="h-4 w-4 text-gold" />
        </div>
      </div>
      <p className="font-serif text-3xl font-bold text-charcoal">
        {displayValue}
      </p>
    </motion.div>
  );
}
