'use client';

import Link from 'next/link';
import { User, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WeekItemDto, WeekItemWithAgentDto } from '@/lib/api';

interface WeekItemProps {
  item: WeekItemDto | WeekItemWithAgentDto;
  showAgent?: boolean;
}

export function WeekItem({ item, showAgent = false }: WeekItemProps) {
  const itemWithAgent = item as WeekItemWithAgentDto;
  const isPending = item.stepStatus === 'Pending';

  return (
    <Link
      href={`/dashboard/deals/${item.dealId}`}
      className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-white/50 hover:bg-white/80 transition-all hover:shadow-sm"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-charcoal truncate">{item.dealName}</span>
          {isPending && (
            <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
              <AlertCircle className="h-3 w-3 mr-1" />
              Non demarre
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{item.stepTitle}</p>
      </div>
      {showAgent && itemWithAgent.agentName && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
          <User className="h-3 w-3" />
          {itemWithAgent.agentName}
        </span>
      )}
    </Link>
  );
}
