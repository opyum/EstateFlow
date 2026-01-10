'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Home, FileText, Palette, CreditCard, LogOut, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, agent, isLoading, logout, isTeamLeadOrAbove } = useAuth();
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

  // Add team link for Admin and TeamLead roles
  const teamNavItem = { href: '/dashboard/team', label: 'Equipe', icon: Users };

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
            className="w-64 shrink-0 hidden md:block"
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

              {/* Team link - only visible for Admin and TeamLead */}
              {isTeamLeadOrAbove() && (
                <Link
                  href={teamNavItem.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200',
                    pathname === teamNavItem.href || pathname.startsWith(teamNavItem.href + '/')
                      ? 'bg-gold/10 text-gold border-l-2 border-gold'
                      : 'text-taupe hover:text-charcoal hover:bg-beige/50'
                  )}
                >
                  <teamNavItem.icon className={cn(
                    'h-5 w-5 transition-colors',
                    pathname === teamNavItem.href || pathname.startsWith(teamNavItem.href + '/')
                      ? 'text-gold'
                      : 'text-taupe'
                  )} />
                  {teamNavItem.label}
                </Link>
              )}
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
