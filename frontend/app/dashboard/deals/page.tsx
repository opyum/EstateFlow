'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { dealsApi, Deal } from '@/lib/api';
import { Plus, Search, ExternalLink } from 'lucide-react';

export default function DealsPage() {
  const { token } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    if (token) {
      loadDeals();
    }
  }, [token]);

  useEffect(() => {
    let result = deals;

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (deal) =>
          deal.clientName.toLowerCase().includes(searchLower) ||
          deal.propertyAddress.toLowerCase().includes(searchLower) ||
          deal.clientEmail.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter) {
      result = result.filter((deal) => deal.status.toLowerCase() === statusFilter.toLowerCase());
    }

    setFilteredDeals(result);
  }, [deals, search, statusFilter]);

  const loadDeals = async () => {
    try {
      const data = await dealsApi.list(token!);
      setDeals(data);
      setFilteredDeals(data);
    } catch (error) {
      console.error('Failed to load deals:', error);
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

  const getProgress = (deal: Deal) => {
    const completed = deal.timelineSteps.filter((s) => s.status === 'Completed').length;
    const total = deal.timelineSteps.length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Link href="/dashboard/deals/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle transaction
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par client ou adresse..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">Tous les statuts</option>
              <option value="active">Active</option>
              <option value="completed">Terminee</option>
              <option value="archived">Archivee</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Deals list */}
      {filteredDeals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {deals.length === 0
                ? 'Aucune transaction pour le moment.'
                : 'Aucune transaction ne correspond a vos criteres.'}
            </p>
            {deals.length === 0 && (
              <Link href="/dashboard/deals/new">
                <Button>Creer votre premiere transaction</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDeals.map((deal) => (
            <Card key={deal.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{deal.clientName}</h3>
                      {getStatusBadge(deal.status)}
                    </div>
                    <p className="text-muted-foreground">{deal.propertyAddress}</p>
                    <p className="text-sm text-muted-foreground">{deal.clientEmail}</p>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Progression: {getProgress(deal)}%
                    </div>
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${getProgress(deal)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      {deal.timelineSteps.filter((s) => s.status === 'Completed').length}/
                      {deal.timelineSteps.length} etapes
                    </span>
                    <span>-</span>
                    <span>{deal.documents.length} documents</span>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`${appUrl}/deal/${deal.accessToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Vue client
                      </Button>
                    </a>
                    <Link href={`/dashboard/deals/${deal.id}`}>
                      <Button size="sm">Gerer</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
