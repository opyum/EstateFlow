'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { inviteApi, InviteInfo } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams();
  const { login } = useAuth();
  const inviteToken = params.token as string;

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadInviteInfo();
  }, [inviteToken]);

  const loadInviteInfo = async () => {
    try {
      const info = await inviteApi.getInfo(inviteToken);
      setInviteInfo(info);
    } catch (e: any) {
      setError(e.message || 'Invitation invalide ou expiree');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const result = await inviteApi.accept(inviteToken, fullName || undefined);
      login(result.token);
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Chargement de l'invitation...</div>
      </div>
    );
  }

  if (error && !inviteInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Invitation invalide</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    'Admin': 'Administrateur',
    'TeamLead': 'Chef d\'equipe',
    'Employee': 'Employe'
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Vous etes invite!</h1>
          <p className="text-gray-600">
            Rejoignez <strong>{inviteInfo?.organizationName}</strong> en tant que <strong>{roleLabels[inviteInfo?.role || ''] || inviteInfo?.role}</strong>
          </p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Votre nom</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Entrez votre nom complet"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
            Invitation pour: <strong>{inviteInfo?.email}</strong>
          </div>

          <button
            onClick={handleAccept}
            disabled={isSubmitting}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Connexion en cours...' : 'Accepter l\'invitation'}
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-6 text-center">
          Expire le {inviteInfo && new Date(inviteInfo.expiresAt).toLocaleDateString('fr-FR')}
        </p>
      </div>
    </div>
  );
}
