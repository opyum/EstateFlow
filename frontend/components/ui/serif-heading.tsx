import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SerifHeadingProps {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4';
  className?: string;
  gold?: boolean;
}

export function SerifHeading({
  children,
  as: Component = 'h2',
  className,
  gold = false
}: SerifHeadingProps) {
  const sizeClasses = {
    h1: 'text-4xl md:text-5xl lg:text-6xl',
    h2: 'text-3xl md:text-4xl',
    h3: 'text-2xl md:text-3xl',
    h4: 'text-xl md:text-2xl',
  };

  return (
    <Component
      className={cn(
        'font-serif font-semibold tracking-tight',
        sizeClasses[Component],
        gold ? 'text-gold' : 'text-charcoal',
        className
      )}
    >
      {children}
    </Component>
  );
}
