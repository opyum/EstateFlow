'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { organizationApi, OrganizationMember, Invitation } from '@/lib/api';

export default function MembersPage() {
  const { token, isAdmin, agent, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Employee');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && !isAdmin()) {
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
      const [membersData, invitationsData] = await Promise.all([
        organizationApi.getMembers(token),
        organizationApi.getInvitations(token),
      ]);
      setMembers(membersData);
      setInvitations(invitationsData);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!token || !inviteEmail) return;
    setError('');
    setSuccess('');
    try {
      await organizationApi.invite(token, inviteEmail, inviteRole);
      setInviteEmail('');
      setSuccess('Invitation envoyee!');
      loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue');
    }
  };

  const handleCancelInvite = async (id: string) => {
    if (!token) return;
    await organizationApi.cancelInvitation(token, id);
    loadData();
  };

  const handleChangeRole = async (agentId: string, role: string) => {
    if (!token) return;
    await organizationApi.changeMemberRole(token, agentId, role);
    loadData();
  };

  const handleRemoveMember = async (agentId: string) => {
    if (!token) return;
    if (!confirm('Etes-vous sur? Les transactions seront reassignees a l\'admin.')) return;
    await organizationApi.removeMember(token, agentId);
    loadData();
  };

  const handleTransferAdmin = async (agentId: string) => {
    if (!token) return;
    if (!confirm('Transferer le role admin? Vous deviendrez Chef d\'equipe.')) return;
    await organizationApi.transferAdmin(token, agentId);
    router.push('/dashboard');
  };

  if (authLoading || isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="text-gray-500">Chargement...</div></div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Gestion de l'equipe</h1>

      {/* Invite Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">Inviter un membre</h2>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg">{success}</div>}
        <div className="flex flex-wrap gap-4">
          <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email" className="flex-1 min-w-[200px] px-4 py-2 border rounded-lg" />
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="px-4 py-2 border rounded-lg">
            <option value="Employee">Employe</option>
            <option value="TeamLead">Chef d'equipe</option>
          </select>
          <button onClick={handleInvite} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Inviter (+10 EUR/mois)
          </button>
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Invitations en attente</h2>
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{inv.email}</div>
                  <div className="text-sm text-gray-500">{inv.role} - Expire le {new Date(inv.expiresAt).toLocaleDateString('fr-FR')}</div>
                </div>
                <button onClick={() => handleCancelInvite(inv.id)} className="text-red-600 hover:text-red-800">Annuler</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">Membres actuels</h2>
        <div className="space-y-4">
          {members.map((m) => (
            <div key={m.agentId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                {m.photoUrl ? <img src={m.photoUrl} alt="" className="w-12 h-12 rounded-full" /> : <div className="w-12 h-12 rounded-full bg-gray-300" />}
                <div>
                  <div className="font-medium">{m.fullName || 'Sans nom'}</div>
                  <div className="text-sm text-gray-500">{m.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-500">{m.activeDeals} transactions</div>
                {m.role === 'Admin' ? (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">Admin</span>
                ) : (
                  <select value={m.role} onChange={(e) => handleChangeRole(m.agentId, e.target.value)} className="px-3 py-1 border rounded-lg text-sm">
                    <option value="TeamLead">Chef d'equipe</option>
                    <option value="Employee">Employe</option>
                  </select>
                )}
                {m.agentId !== agent?.id && m.role !== 'Admin' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleTransferAdmin(m.agentId)} className="text-sm text-blue-600 hover:text-blue-800">Rendre admin</button>
                    <button onClick={() => handleRemoveMember(m.agentId)} className="text-sm text-red-600 hover:text-red-800">Retirer</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
