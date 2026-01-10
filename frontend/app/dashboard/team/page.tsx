'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { organizationApi, TeamDeal, TeamStats, OrganizationMember } from '@/lib/api';

export default function TeamDashboardPage() {
  const { token, isTeamLeadOrAbove, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<TeamStats | null>(null);
  const [deals, setDeals] = useState<TeamDeal[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [filterAssigned, setFilterAssigned] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isTeamLeadOrAbove()) {
      router.push('/dashboard');
      return;
    }
    if (token && !authLoading) {
      loadData();
    }
  }, [token, authLoading]);

  const loadData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [statsData, dealsData, membersData] = await Promise.all([
        organizationApi.getTeamStats(token),
        organizationApi.getTeamDeals(token),
        organizationApi.getMembers(token),
      ]);
      setStats(statsData);
      setDeals(dealsData);
      setMembers(membersData);
    } catch (error) {
      console.error('Failed to load team data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = async () => {
    if (!token) return;
    const dealsData = await organizationApi.getTeamDeals(token, filterAssigned || undefined, filterStatus || undefined);
    setDeals(dealsData);
  };

  const handleAssign = async (dealId: string, assignToAgentId: string) => {
    if (!token || !assignToAgentId) return;
    await organizationApi.assignDeal(token, dealId, assignToAgentId);
    loadData();
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard Equipe</h1>
        {isAdmin() && (
          <Link href="/dashboard/team/members" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Gerer l'equipe
          </Link>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl shadow-sm border">
            <div className="text-3xl font-bold text-gray-900">{stats.totalDeals}</div>
            <div className="text-sm text-gray-500">Total transactions</div>
          </div>
          <div className="p-4 bg-white rounded-xl shadow-sm border">
            <div className="text-3xl font-bold text-green-600">{stats.activeDeals}</div>
            <div className="text-sm text-gray-500">En cours</div>
          </div>
          <div className="p-4 bg-white rounded-xl shadow-sm border">
            <div className="text-3xl font-bold text-blue-600">{stats.completedThisMonth}</div>
            <div className="text-sm text-gray-500">Terminees ce mois</div>
          </div>
          <div className="p-4 bg-white rounded-xl shadow-sm border">
            <div className="text-3xl font-bold text-purple-600">{stats.memberCount}</div>
            <div className="text-sm text-gray-500">Membres</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center p-4 bg-white rounded-xl shadow-sm border">
        <select value={filterAssigned} onChange={(e) => setFilterAssigned(e.target.value)} className="px-3 py-2 border rounded-lg">
          <option value="">Tous les agents</option>
          {members.map((m) => (
            <option key={m.agentId} value={m.agentId}>{m.fullName || m.email}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg">
          <option value="">Tous les statuts</option>
          <option value="Active">En cours</option>
          <option value="Completed">Termine</option>
          <option value="Archived">Archive</option>
        </select>
        <button onClick={applyFilters} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
          Filtrer
        </button>
      </div>

      {/* Deals Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Client</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Propriete</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Assigne a</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Statut</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Mise a jour</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {deals.map((deal) => (
              <tr key={deal.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{deal.clientName}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{deal.propertyAddress}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {deal.assignedToPhotoUrl && <img src={deal.assignedToPhotoUrl} alt="" className="w-6 h-6 rounded-full" />}
                    <span className="text-sm">{deal.assignedToName || 'Non assigne'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${deal.status === 'Active' ? 'bg-green-100 text-green-800' : deal.status === 'Completed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                    {deal.status === 'Active' ? 'En cours' : deal.status === 'Completed' ? 'Termine' : 'Archive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{new Date(deal.updatedAt).toLocaleDateString('fr-FR')}</td>
                <td className="px-4 py-3">
                  <select value="" onChange={(e) => handleAssign(deal.id, e.target.value)} className="px-2 py-1 text-sm border rounded">
                    <option value="">Reassigner...</option>
                    {members.map((m) => (
                      <option key={m.agentId} value={m.agentId}>{m.fullName || m.email}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {deals.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Aucune transaction trouvee</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
