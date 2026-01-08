'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Agent, agentApi } from './api';

interface AuthContextType {
  token: string | null;
  agent: Agent | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  refreshAgent: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      fetchAgent(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchAgent = async (authToken: string) => {
    try {
      const agentData = await agentApi.getMe(authToken);
      setAgent(agentData);
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
    fetchAgent(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setAgent(null);
  };

  const refreshAgent = async () => {
    if (token) {
      await fetchAgent(token);
    }
  };

  return (
    <AuthContext.Provider value={{ token, agent, isLoading, login, logout, refreshAgent }}>
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
