'use client';

import { useLanguage, Language } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface LanguageSwitcherProps {
  variant?: 'light' | 'dark';
  className?: string;
}

export function LanguageSwitcher({ variant = 'dark', className }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  const languages: { code: Language; label: string }[] = [
    { code: 'fr', label: 'FR' },
    { code: 'en', label: 'EN' },
  ];

  return (
    <div
      className={cn(
        'relative flex items-center gap-1 p-1 rounded-full',
        variant === 'light'
          ? 'bg-white/10 backdrop-blur-sm'
          : 'bg-charcoal/5',
        className
      )}
    >
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={cn(
            'relative px-3 py-1.5 text-sm font-medium rounded-full transition-colors duration-200 z-10',
            language === lang.code
              ? variant === 'light'
                ? 'text-charcoal'
                : 'text-charcoal'
              : variant === 'light'
                ? 'text-cream/70 hover:text-cream'
                : 'text-taupe hover:text-charcoal'
          )}
        >
          {language === lang.code && (
            <motion.div
              layoutId="language-indicator"
              className={cn(
                'absolute inset-0 rounded-full -z-10',
                variant === 'light' ? 'bg-cream' : 'bg-white shadow-sm'
              )}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          {lang.label}
        </button>
      ))}
    </div>
  );
}
