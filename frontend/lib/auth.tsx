'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Agent, Organization, agentApi, organizationApi } from './api';

interface AuthContextType {
  token: string | null;
  agent: Agent | null;
  organization: Organization | null;
  role: 'Admin' | 'TeamLead' | 'Employee' | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  refreshAgent: () => Promise<void>;
  isAdmin: () => boolean;
  isTeamLeadOrAbove: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<'Admin' | 'TeamLead' | 'Employee' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      fetchAgentAndOrg(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchAgentAndOrg = async (authToken: string) => {
    try {
      const [agentData, orgData] = await Promise.all([
        agentApi.getMe(authToken),
        organizationApi.get(authToken).catch(() => null),
      ]);
      setAgent(agentData);
      setOrganization(orgData);

      // Decode role from token
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        setRole(payload.role || null);
      } catch {
        setRole(null);
      }
    } catch (error) {
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    fetchAgentAndOrg(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setAgent(null);
    setOrganization(null);
    setRole(null);
  };

  const refreshAgent = async () => {
    if (token) {
      await fetchAgentAndOrg(token);
    }
  };

  const isAdmin = () => role === 'Admin';
  const isTeamLeadOrAbove = () => role === 'Admin' || role === 'TeamLead';

  return (
    <AuthContext.Provider value={{
      token,
      agent,
      organization,
      role,
      isLoading,
      login,
      logout,
      refreshAgent,
      isAdmin,
      isTeamLeadOrAbove,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
