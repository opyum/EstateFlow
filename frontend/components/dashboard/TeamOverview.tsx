'use client';

import { motion } from 'framer-motion';
import { Users, AlertTriangle, CheckCircle, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TeamMemberStatsDto } from '@/lib/api';
import { cn } from '@/lib/utils';

interface TeamOverviewProps {
  members: TeamMemberStatsDto[];
  onMemberClick?: (agentId: string) => void;
}

export function TeamOverview({ members, onMemberClick }: TeamOverviewProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAlertBadgeColor = (critical: number, warning: number) => {
    if (critical > 0) return 'bg-red-100 text-red-600';
    if (warning > 0) return 'bg-orange-100 text-orange-600';
    return 'bg-emerald-100 text-emerald-600';
  };

  const getAlertIcon = (critical: number, warning: number) => {
    if (critical > 0 || warning > 0) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <CheckCircle className="h-4 w-4" />;
  };

  const getAlertText = (critical: number, warning: number) => {
    if (critical > 0) return critical;
    if (warning > 0) return warning;
    return '0';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="bg-white/80 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-serif flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            Mon equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member, index) => (
              <motion.button
                key={member.agentId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                onClick={() => onMemberClick?.(member.agentId)}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-white/50 hover:bg-white/80 transition-all hover:shadow-sm text-left"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.photoUrl || undefined} alt={member.agentName} />
                  <AvatarFallback className="bg-taupe/20 text-charcoal">
                    {getInitials(member.agentName)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-charcoal truncate">{member.agentName}</p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Active deals */}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{member.activeDeals}</span>
                  </div>

                  {/* Alerts badge */}
                  <div className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-medium',
                    getAlertBadgeColor(member.alertCritical, member.alertWarning)
                  )}>
                    {getAlertIcon(member.alertCritical, member.alertWarning)}
                    <span>{getAlertText(member.alertCritical, member.alertWarning)}</span>
                  </div>

                  {/* Completed this month */}
                  <div className="flex items-center gap-1.5 text-sm text-emerald-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>{member.completedThisMonth}</span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
