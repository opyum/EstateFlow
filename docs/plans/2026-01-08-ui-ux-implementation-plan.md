# EstateFlow UI/UX Glassmorphism Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform EstateFlow into a luxury glassmorphism design with warm tones, elegant typography, and subtle animations.

**Architecture:** Extend existing Tailwind/shadcn setup with new CSS variables, custom components, and Framer Motion for animations. Mobile-first approach with performance optimizations for blur effects.

**Tech Stack:** Next.js 14, Tailwind CSS 3.3, Framer Motion, Google Fonts (Cormorant Garamond)

---

## Task 1: Install Dependencies

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install framer-motion**

```bash
cd frontend && npm install framer-motion
```

**Step 2: Verify installation**

Run: `npm ls framer-motion`
Expected: `framer-motion@11.x.x` (or latest 10.x/11.x)

---

## Task 2: Update Tailwind Config with New Colors and Animations

**Files:**
- Modify: `frontend/tailwind.config.js`

**Step 1: Add new color palette and animations**

Replace entire file content with:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        serif: ['var(--font-cormorant)', 'Cormorant Garamond', 'serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        cream: "hsl(var(--cream))",
        beige: "hsl(var(--beige))",
        charcoal: "hsl(var(--charcoal))",
        taupe: "hsl(var(--taupe))",
        gold: {
          DEFAULT: "hsl(var(--gold))",
          light: "hsl(var(--gold-light))",
        },
        sage: "hsl(var(--sage))",
        amber: "hsl(var(--amber))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsla(43, 45%, 59%, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px hsla(43, 45%, 59%, 0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "shimmer": "shimmer 2s infinite",
        "pulse-gold": "pulse-gold 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
```

**Step 2: Verify config syntax**

Run: `cd frontend && npm run build`
Expected: Build starts without config errors (can cancel after config is validated)

---

## Task 3: Update Global CSS with New Variables and Utility Classes

**Files:**
- Modify: `frontend/app/globals.css`

**Step 1: Replace with new luxury theme**

Replace entire file content with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Luxury warm palette */
    --cream: 40 33% 97%;
    --beige: 35 26% 94%;
    --charcoal: 30 6% 16%;
    --taupe: 30 8% 38%;

    /* Gold accents */
    --gold: 43 45% 59%;
    --gold-light: 43 55% 77%;

    /* Status colors */
    --sage: 108 15% 53%;
    --amber: 36 62% 58%;

    /* Semantic colors - updated for warm theme */
    --background: 40 33% 97%;
    --foreground: 30 6% 16%;

    --card: 0 0% 100%;
    --card-foreground: 30 6% 16%;

    --popover: 0 0% 100%;
    --popover-foreground: 30 6% 16%;

    --primary: 43 45% 59%;
    --primary-foreground: 0 0% 100%;

    --secondary: 35 26% 94%;
    --secondary-foreground: 30 6% 16%;

    --muted: 35 26% 94%;
    --muted-foreground: 30 8% 38%;

    --accent: 43 55% 77%;
    --accent-foreground: 30 6% 16%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    --border: 35 20% 88%;
    --input: 35 20% 88%;
    --ring: 43 45% 59%;

    --radius: 0.75rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground antialiased;
  }
}

@layer components {
  /* Glassmorphism */
  .glass {
    @apply bg-white/70 backdrop-blur-md border border-white/20 shadow-lg;
  }

  .glass-dark {
    @apply bg-white/85 backdrop-blur-xl border border-white/30 shadow-lg;
  }

  .glass-card {
    @apply glass rounded-xl transition-all duration-300 ease-out;
  }

  .glass-card:hover {
    @apply -translate-y-0.5 shadow-xl;
  }

  /* Typography */
  .text-serif {
    font-family: var(--font-cormorant), 'Cormorant Garamond', serif;
  }

  .heading-serif {
    @apply text-serif font-semibold tracking-tight text-charcoal;
  }

  /* Gold button glow */
  .gold-glow {
    @apply relative overflow-hidden;
  }

  .gold-glow::after {
    content: '';
    @apply absolute inset-0 opacity-0 transition-opacity duration-300;
    background: linear-gradient(
      to right,
      transparent,
      hsla(43, 45%, 59%, 0.3),
      transparent
    );
  }

  .gold-glow:hover::after {
    @apply opacity-100;
  }

  /* Shimmer effect for progress bars */
  .shimmer {
    @apply relative overflow-hidden;
  }

  .shimmer::after {
    content: '';
    @apply absolute inset-0 -translate-x-full animate-shimmer;
    background: linear-gradient(
      90deg,
      transparent,
      hsla(0, 0%, 100%, 0.4),
      transparent
    );
  }

  /* Input focus gold */
  .input-gold:focus {
    @apply ring-2 ring-gold/50 border-gold;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .glass-card:hover {
    transform: none;
  }

  .shimmer::after {
    animation: none;
  }

  .animate-pulse-gold {
    animation: none;
  }
}
```

**Step 2: Verify CSS compiles**

Run: `cd frontend && npm run build`
Expected: Build succeeds without CSS errors

---

## Task 4: Update Root Layout with Cormorant Font

**Files:**
- Modify: `frontend/app/layout.tsx`

**Step 1: Add Cormorant Garamond font**

Replace entire file content with:

```tsx
import type { Metadata } from 'next'
import { Inter, Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
})

export const metadata: Metadata = {
  title: 'EstateFlow - Digital Deal Room',
  description: 'Premium transaction tracking for luxury real estate',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${cormorant.variable}`}>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

**Step 2: Verify fonts load**

Run: `cd frontend && npm run dev`
Expected: Dev server starts, fonts download in browser

---

## Task 5: Create AnimatedSection Component

**Files:**
- Create: `frontend/components/ui/animated-section.tsx`

**Step 1: Create the animated wrapper component**

```tsx
'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, ReactNode } from 'react';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function AnimatedSection({
  children,
  className = '',
  delay = 0
}: AnimatedSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-10% 0px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.4, 0.25, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedListProps {
  children: ReactNode[];
  className?: string;
  staggerDelay?: number;
}

export function AnimatedList({
  children,
  className = '',
  staggerDelay = 0.05
}: AnimatedListProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-10% 0px' });

  return (
    <motion.div ref={ref} className={className}>
      {children.map((child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{
            duration: 0.5,
            delay: index * staggerDelay,
            ease: [0.25, 0.4, 0.25, 1]
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
```

**Step 2: Verify component exports**

Run: `cd frontend && npx tsc --noEmit`
Expected: No TypeScript errors

---

## Task 6: Create GlassCard Component

**Files:**
- Create: `frontend/components/ui/glass-card.tsx`

**Step 1: Create the glass card component**

```tsx
'use client';

import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'dark' | 'hover';
  animated?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, variant = 'default', animated = true, ...props }, ref) => {
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
          ref={ref}
          className={baseClasses}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          {...props}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div ref={ref} className={baseClasses} {...props}>
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
```

**Step 2: Verify component**

Run: `cd frontend && npx tsc --noEmit`
Expected: No TypeScript errors

---

## Task 7: Create SerifHeading Component

**Files:**
- Create: `frontend/components/ui/serif-heading.tsx`

**Step 1: Create the serif heading component**

```tsx
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
```

---

## Task 8: Create ShimmerProgress Component

**Files:**
- Create: `frontend/components/ui/shimmer-progress.tsx`

**Step 1: Create the shimmer progress bar component**

```tsx
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
```

---

## Task 9: Create GoldButton Component (Update Button)

**Files:**
- Modify: `frontend/components/ui/button.tsx`

**Step 1: Add gold variant to button**

Replace entire file content with:

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-charcoal text-cream hover:bg-charcoal/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-gold/30 bg-transparent text-charcoal hover:bg-gold/10 hover:border-gold",
        secondary: "bg-beige text-charcoal hover:bg-beige/80",
        ghost: "hover:bg-beige hover:text-charcoal",
        link: "text-gold underline-offset-4 hover:underline",
        gold: "bg-gold text-white hover:bg-gold/90 hover:scale-[1.02] shadow-md hover:shadow-lg gold-glow",
        "gold-outline": "border-2 border-gold text-gold bg-transparent hover:bg-gold hover:text-white",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

---

## Task 10: Update Card Component with Glass Variant

**Files:**
- Modify: `frontend/components/ui/card.tsx`

**Step 1: Add glass variant to card**

Replace entire file content with:

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-xl text-card-foreground transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-card border shadow-sm hover:shadow-md",
        glass: "bg-white/70 backdrop-blur-md border border-white/20 shadow-lg hover:-translate-y-0.5 hover:shadow-xl",
        "glass-static": "bg-white/70 backdrop-blur-md border border-white/20 shadow-lg",
        "glass-dark": "bg-white/85 backdrop-blur-xl border border-white/30 shadow-lg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-serif text-2xl font-semibold leading-none tracking-tight text-charcoal",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-taupe", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants }
```

---

## Task 11: Update Badge Component with Sage/Amber Colors

**Files:**
- Modify: `frontend/components/ui/badge.tsx`

**Step 1: Update badge variants**

Replace entire file content with:

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-charcoal text-cream",
        secondary: "border-transparent bg-beige text-charcoal",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-charcoal border-gold/30",
        success: "border-transparent bg-sage/20 text-sage backdrop-blur-sm",
        warning: "border-transparent bg-amber/20 text-amber backdrop-blur-sm",
        gold: "border-transparent bg-gold/20 text-gold backdrop-blur-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
```

---

## Task 12: Update Input Component with Gold Focus

**Files:**
- Modify: `frontend/components/ui/input.tsx`

**Step 1: Update input styling**

Replace entire file content with:

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-beige bg-white/50 px-3 py-2 text-sm text-charcoal ring-offset-background transition-all duration-300",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-taupe/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30 focus-visible:border-gold",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "hover:border-gold/50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
```

---

## Task 13: Create StatCard Component

**Files:**
- Create: `frontend/components/ui/stat-card.tsx`

**Step 1: Create animated stat card**

```tsx
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
```

---

## Task 14: Refactor Dashboard Layout (Sidebar + Header Glass)

**Files:**
- Modify: `frontend/app/dashboard/layout.tsx`

**Step 1: Apply glassmorphism to layout**

Replace entire file content with:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Home, FileText, Palette, CreditCard, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, agent, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !token) {
      router.push('/auth');
    }
  }, [isLoading, token, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/dashboard/deals', label: 'Transactions', icon: FileText },
    { href: '/dashboard/branding', label: 'Branding', icon: Palette },
    { href: '/dashboard/subscription', label: 'Abonnement', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-cream">
      {/* Header Glass */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-dark sticky top-0 z-10 border-b border-white/20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="font-serif text-2xl font-bold text-charcoal">
              EstateFlow
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-taupe">
                {agent?.fullName || agent?.email}
              </span>
              {agent?.photoUrl && (
                <img
                  src={agent.photoUrl}
                  alt=""
                  className="w-8 h-8 rounded-full border-2 border-gold/30 object-cover"
                />
              )}
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Glass */}
          <motion.aside
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-64 shrink-0"
          >
            <nav className="glass-dark rounded-xl p-4 space-y-1 sticky top-24">
              {navItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-gold/10 text-gold border-l-2 border-gold'
                        : 'text-taupe hover:text-charcoal hover:bg-beige/50'
                    )}
                  >
                    <item.icon className={cn(
                      'h-5 w-5 transition-colors',
                      isActive ? 'text-gold' : 'text-taupe'
                    )} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </motion.aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
```

---

## Task 15: Refactor Dashboard Home Page

**Files:**
- Modify: `frontend/app/dashboard/page.tsx`

**Step 1: Apply new design to dashboard**

Replace entire file content with:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { SerifHeading } from '@/components/ui/serif-heading';
import { ShimmerProgress } from '@/components/ui/shimmer-progress';
import { AnimatedSection, AnimatedList } from '@/components/ui/animated-section';
import { agentApi, dealsApi, AgentStats, Deal } from '@/lib/api';
import { Plus, FileText, CheckCircle, Clock } from 'lucide-react';

export default function DashboardPage() {
  const { token, agent } = useAuth();
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [recentDeals, setRecentDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      const [statsData, dealsData] = await Promise.all([
        agentApi.getStats(token!),
        dealsApi.list(token!),
      ]);
      setStats(statsData);
      setRecentDeals(dealsData.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'completed':
        return <Badge variant="secondary">Terminee</Badge>;
      case 'archived':
        return <Badge variant="outline">Archivee</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <AnimatedSection>
        <div className="flex justify-between items-center">
          <div>
            <SerifHeading as="h1">
              Bonjour{agent?.fullName ? `, ${agent.fullName}` : ''} !
            </SerifHeading>
            <p className="text-taupe mt-1">
              Voici un apercu de vos transactions
            </p>
          </div>
          <Link href="/dashboard/deals/new">
            <Button variant="gold" size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle transaction
            </Button>
          </Link>
        </div>
      </AnimatedSection>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total transactions"
          value={stats?.totalDeals || 0}
          icon={FileText}
        />
        <StatCard
          title="En cours"
          value={stats?.activeDeals || 0}
          icon={Clock}
        />
        <StatCard
          title="Terminees"
          value={stats?.completedDeals || 0}
          icon={CheckCircle}
        />
      </div>

      {/* Recent deals */}
      <AnimatedSection delay={0.2}>
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transactions recentes</CardTitle>
            <Link href="/dashboard/deals">
              <Button variant="outline" size="sm">Voir tout</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentDeals.length === 0 ? (
              <p className="text-center text-taupe py-8">
                Aucune transaction pour le moment.{' '}
                <Link href="/dashboard/deals/new" className="text-gold hover:underline">
                  Creer votre premiere transaction
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {recentDeals.map((deal, index) => {
                  const progress = deal.timelineSteps.length > 0
                    ? Math.round((deal.timelineSteps.filter(s => s.status === 'Completed').length / deal.timelineSteps.length) * 100)
                    : 0;

                  return (
                    <motion.div
                      key={deal.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={`/dashboard/deals/${deal.id}`}
                        className="flex items-center justify-between p-4 rounded-xl bg-white/50 border border-transparent hover:border-gold/30 hover:bg-white/70 transition-all duration-300"
                      >
                        <div className="flex-1 min-w-0 mr-4">
                          <p className="font-medium text-charcoal truncate">{deal.clientName}</p>
                          <p className="text-sm text-taupe truncate">{deal.propertyAddress}</p>
                          <div className="mt-2 max-w-[200px]">
                            <ShimmerProgress value={progress} />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-sm text-taupe">
                            {deal.timelineSteps.filter(s => s.status === 'Completed').length}/{deal.timelineSteps.length}
                          </span>
                          {getStatusBadge(deal.status)}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </AnimatedSection>
    </div>
  );
}
```

---

## Task 16: Refactor Landing Page

**Files:**
- Modify: `frontend/app/page.tsx`

**Step 1: Apply luxury design to landing page**

Replace entire file content with:

```tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SerifHeading } from '@/components/ui/serif-heading';
import { AnimatedSection } from '@/components/ui/animated-section';
import { Check, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const features = [
    'Timeline interactive pour chaque transaction',
    'Branding personnalise a vos couleurs',
    'Coffre-fort documents securise',
    'Notifications email automatiques',
    'Acces client via lien unique',
    'Interface mobile-first',
  ];

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-charcoal/95 to-charcoal/90" />

        {/* Glass overlay pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-72 h-72 bg-gold/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-serif text-5xl md:text-7xl font-bold text-cream mb-6">
              EstateFlow
            </h1>
            <p className="text-xl md:text-2xl text-gold-light mb-4">
              Digital Deal Room pour l'Immobilier de Luxe
            </p>
            <p className="text-lg text-cream/70 mb-10 max-w-2xl mx-auto">
              Arretez de gerer vos millions par SMS. Offrez a vos clients l'experience de closing qu'ils meritent.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <Link href="/auth">
                <Button variant="gold" size="xl">
                  Commencer gratuitement
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-beige">
        <div className="max-w-6xl mx-auto px-4">
          <AnimatedSection>
            <SerifHeading as="h2" className="text-center mb-16">
              Tout ce dont vous avez besoin
            </SerifHeading>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card variant="glass" className="h-full">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="bg-gold/10 p-2 rounded-full shrink-0">
                      <Check className="h-4 w-4 text-gold" />
                    </div>
                    <p className="font-medium text-charcoal">{feature}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-cream">
        <div className="max-w-xl mx-auto px-4 text-center">
          <AnimatedSection>
            <SerifHeading as="h2" className="mb-4">
              Prix simple
            </SerifHeading>
            <p className="text-taupe mb-12">
              Un seul forfait, toutes les fonctionnalites
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <Card variant="glass" className="border-2 border-gold/30">
              <CardContent className="p-10">
                <p className="font-serif text-6xl font-bold text-charcoal mb-2">49 EUR</p>
                <p className="text-taupe mb-8">par mois</p>
                <ul className="text-left space-y-4 mb-10">
                  {[
                    'Transactions illimitees',
                    'Stockage documents illimite',
                    'Branding personnalise',
                    'Support prioritaire',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <div className="bg-gold/10 p-1 rounded-full">
                        <Check className="h-4 w-4 text-gold" />
                      </div>
                      <span className="text-charcoal">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/auth">
                  <Button variant="gold" size="xl" className="w-full">
                    Demarrer l'essai gratuit
                  </Button>
                </Link>
                <p className="text-sm text-taupe mt-4">
                  14 jours d'essai gratuit. Sans engagement.
                </p>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-charcoal py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="w-16 h-px bg-gold mx-auto mb-8" />
          <p className="font-serif text-2xl text-cream mb-2">EstateFlow</p>
          <p className="text-cream/60 text-sm">
            L'experience de suivi de transaction que vos clients meritent.
          </p>
          <p className="text-cream/40 text-sm mt-6">
            © {new Date().getFullYear()} EstateFlow. Tous droits reserves.
          </p>
        </div>
      </footer>
    </div>
  );
}
```

---

## Task 17: Refactor Client Portal Page

**Files:**
- Modify: `frontend/app/deal/[token]/page.tsx`

**Step 1: Apply luxury design to client portal**

Replace entire file content with:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { publicApi, PublicDeal } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SerifHeading } from '@/components/ui/serif-heading';
import { ShimmerProgress } from '@/components/ui/shimmer-progress';
import { AnimatedSection } from '@/components/ui/animated-section';
import { Check, Clock, Circle, Phone, Mail, MapPin, Download, FileText, Instagram, Linkedin } from 'lucide-react';

export default function ClientDealPage() {
  const params = useParams();
  const [deal, setDeal] = useState<PublicDeal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const accessToken = params.token as string;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (accessToken) {
      loadDeal();
    }
  }, [accessToken]);

  const loadDeal = async () => {
    try {
      const data = await publicApi.getDeal(accessToken);
      setDeal(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dossier introuvable');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <Card variant="glass" className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="font-serif text-xl font-bold text-destructive mb-2">Dossier introuvable</p>
            <p className="text-taupe">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const brandColor = deal.agent.brandColor || '#C9A962';
  const completedSteps = deal.timelineSteps.filter(s => s.status === 'Completed').length;
  const totalSteps = deal.timelineSteps.length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const toSignDocs = deal.documents.filter(d => d.category === 'ToSign');
  const refDocs = deal.documents.filter(d => d.category === 'Reference');
  const socialLinks = deal.agent.socialLinks ? JSON.parse(deal.agent.socialLinks) : {};

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero with parallax effect */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-[70vh] overflow-hidden"
      >
        {deal.propertyPhotoUrl ? (
          <motion.div
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${deal.propertyPhotoUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-charcoal/80" />
        )}

        {/* Glass overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/40 to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex items-end">
          <div className="w-full p-8 pb-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="max-w-3xl mx-auto"
            >
              {deal.agent.logoUrl && (
                <img
                  src={deal.agent.logoUrl}
                  alt="Logo"
                  className="h-12 mb-6"
                />
              )}
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-cream mb-3">
                Bienvenue, {deal.clientName}
              </h1>
              <p className="text-cream/80 text-lg">{deal.propertyAddress}</p>
            </motion.div>
          </div>
        </div>

        {/* Agent card floating */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-8 left-8 hidden lg:block"
        >
          <Card variant="glass-dark" className="p-4">
            <div className="flex items-center gap-4">
              {deal.agent.photoUrl ? (
                <img
                  src={deal.agent.photoUrl}
                  alt={deal.agent.fullName || 'Agent'}
                  className="w-14 h-14 rounded-full object-cover border-2"
                  style={{ borderColor: brandColor }}
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
                  style={{ backgroundColor: brandColor }}
                >
                  {(deal.agent.fullName || deal.agent.email).charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-serif font-semibold text-charcoal">{deal.agent.fullName || 'Votre agent'}</p>
                <p className="text-sm text-taupe">{deal.agent.email}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 -mt-16 relative z-10">
        {/* Mobile agent card */}
        <AnimatedSection className="lg:hidden">
          <Card variant="glass">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {deal.agent.photoUrl ? (
                  <img
                    src={deal.agent.photoUrl}
                    alt={deal.agent.fullName || 'Agent'}
                    className="w-16 h-16 rounded-full object-cover border-2"
                    style={{ borderColor: brandColor }}
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                    style={{ backgroundColor: brandColor }}
                  >
                    {(deal.agent.fullName || deal.agent.email).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-serif font-bold text-lg text-charcoal">{deal.agent.fullName || 'Votre agent'}</p>
                  <p className="text-taupe">{deal.agent.email}</p>
                </div>
                <div className="flex gap-2">
                  {socialLinks.instagram && (
                    <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="icon">
                        <Instagram className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  {socialLinks.linkedin && (
                    <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="icon">
                        <Linkedin className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Welcome message */}
        {deal.welcomeMessage && (
          <AnimatedSection delay={0.1}>
            <Card variant="glass">
              <CardContent className="p-6">
                <p className="font-serif text-xl italic text-center text-charcoal">
                  "{deal.welcomeMessage}"
                </p>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}

        {/* Progress */}
        <AnimatedSection delay={0.2}>
          <Card variant="glass">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="font-serif text-xl font-semibold text-charcoal">Progression</p>
                <p className="font-serif text-3xl font-bold" style={{ color: brandColor }}>{progress}%</p>
              </div>
              <ShimmerProgress value={progress} />
              <p className="text-sm text-taupe mt-2 text-center">{completedSteps} sur {totalSteps} etapes completees</p>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Timeline */}
        <AnimatedSection delay={0.3}>
          <Card variant="glass">
            <CardContent className="p-6">
              <SerifHeading as="h2" className="mb-8">Timeline</SerifHeading>
              <div className="space-y-0">
                {deal.timelineSteps.map((step, index) => {
                  const isCompleted = step.status === 'Completed';
                  const isInProgress = step.status === 'InProgress';
                  const isLast = index === deal.timelineSteps.length - 1;

                  return (
                    <motion.div
                      key={step.id}
                      className="flex gap-4"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {/* Line and dot */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300 ${
                            isCompleted
                              ? 'border-transparent'
                              : isInProgress
                              ? 'animate-pulse-gold border-transparent'
                              : 'border-beige bg-white'
                          }`}
                          style={{
                            backgroundColor: isCompleted ? brandColor : isInProgress ? brandColor : undefined,
                          }}
                        >
                          {isCompleted && <Check className="h-5 w-5 text-white" />}
                          {isInProgress && <Clock className="h-5 w-5 text-white" />}
                          {!isCompleted && !isInProgress && <Circle className="h-5 w-5 text-beige" />}
                        </div>
                        {!isLast && (
                          <div
                            className="w-0.5 flex-1 min-h-[40px] transition-colors"
                            style={{
                              background: isCompleted
                                ? `linear-gradient(to bottom, ${brandColor}, ${brandColor}80)`
                                : 'hsl(35, 26%, 94%)',
                            }}
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className="pb-8 flex-1">
                        <p className={`font-medium ${isCompleted ? 'text-taupe' : 'text-charcoal'}`}>
                          {step.title}
                        </p>
                        {step.description && (
                          <p className="text-sm text-taupe mt-1">{step.description}</p>
                        )}
                        {step.dueDate && !isCompleted && (
                          <p className="font-serif text-sm italic text-taupe mt-1">
                            Prevu le: {new Date(step.dueDate).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                        {isInProgress && (
                          <Badge variant="warning" className="mt-2">En cours</Badge>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Documents */}
        {deal.documents.length > 0 && (
          <AnimatedSection delay={0.4}>
            <Card variant="glass">
              <CardContent className="p-6">
                <SerifHeading as="h2" className="mb-6">Documents</SerifHeading>

                {toSignDocs.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-medium mb-3 text-amber">A signer</h3>
                    <div className="space-y-2">
                      {toSignDocs.map((doc) => (
                        <a
                          key={doc.id}
                          href={`${apiUrl}/api/public/deals/${accessToken}/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-lg bg-white/50 border border-transparent hover:border-gold/30 hover:bg-white/70 transition-all duration-300"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-taupe" />
                            <span className="text-charcoal">{doc.filename}</span>
                          </div>
                          <Download className="h-4 w-4 text-gold" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {refDocs.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3 text-charcoal">Documents de reference</h3>
                    <div className="space-y-2">
                      {refDocs.map((doc) => (
                        <a
                          key={doc.id}
                          href={`${apiUrl}/api/public/deals/${accessToken}/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-lg bg-white/50 border border-transparent hover:border-gold/30 hover:bg-white/70 transition-all duration-300"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-taupe" />
                            <span className="text-charcoal">{doc.filename}</span>
                          </div>
                          <Download className="h-4 w-4 text-gold" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </AnimatedSection>
        )}
      </div>

      {/* Fixed footer */}
      <div className="fixed bottom-0 left-0 right-0 glass-dark border-t border-white/20 p-4">
        <div className="max-w-3xl mx-auto flex justify-center gap-3">
          {deal.agent.phone && (
            <a href={`tel:${deal.agent.phone}`}>
              <Button variant="gold">
                <Phone className="h-4 w-4 mr-2" />
                Appeler
              </Button>
            </a>
          )}
          <a href={`mailto:${deal.agent.email}`}>
            <Button variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deal.propertyAddress)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline">
              <MapPin className="h-4 w-4 mr-2" />
              Voir le bien
            </Button>
          </a>
        </div>
      </div>

      {/* Bottom padding for fixed footer */}
      <div className="h-24" />
    </div>
  );
}
```

---

## Task 18: Build and Test

**Step 1: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors

**Step 2: Run build**

```bash
cd frontend && npm run build
```

Expected: Build succeeds

**Step 3: Start dev server and test**

```bash
cd frontend && npm run dev
```

Expected: App loads with new design, no console errors

---

## Summary

This plan transforms EstateFlow from a standard shadcn/ui app into a luxury glassmorphism experience with:

1. **New color palette**: Warm creams, beiges, and gold accents
2. **Serif typography**: Cormorant Garamond for headings
3. **Glassmorphism**: Backdrop blur, transparency, subtle borders
4. **Micro-animations**: Fade-in on scroll, hover effects, shimmer progress
5. **Consistent components**: GlassCard, GoldButton, StatCard, ShimmerProgress

All changes maintain responsiveness and include reduced-motion support for accessibility.
