const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An error occurred' }));
    throw new Error(error.error || 'An error occurred');
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Auth
export const authApi = {
  login: (email: string) =>
    apiFetch<{ message: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  callback: (token: string) =>
    apiFetch<{ token: string; isNewUser: boolean }>('/api/auth/callback', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
};

// Agent
export const agentApi = {
  getMe: (token: string) =>
    apiFetch<Agent>('/api/agents/me', { token }),

  updateMe: (token: string, data: Partial<Agent>) =>
    apiFetch<Agent>('/api/agents/me', {
      token,
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getStats: (token: string) =>
    apiFetch<AgentStats>('/api/agents/me/stats', { token }),
};

// Deals
export const dealsApi = {
  list: (token: string, status?: string) =>
    apiFetch<Deal[]>(`/api/deals${status ? `?status=${status}` : ''}`, { token }),

  get: (token: string, id: string) =>
    apiFetch<Deal>(`/api/deals/${id}`, { token }),

  create: (token: string, data: CreateDealRequest) =>
    apiFetch<Deal>('/api/deals', {
      token,
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: Partial<Deal>) =>
    apiFetch<Deal>(`/api/deals/${id}`, {
      token,
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    apiFetch<void>(`/api/deals/${id}`, { token, method: 'DELETE' }),
};

// Timeline Steps
export const stepsApi = {
  create: (token: string, dealId: string, data: CreateStepRequest) =>
    apiFetch<TimelineStep>(`/api/deals/${dealId}/steps`, {
      token,
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (token: string, dealId: string, stepId: string, data: Partial<TimelineStep>) =>
    apiFetch<TimelineStep>(`/api/deals/${dealId}/steps/${stepId}`, {
      token,
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (token: string, dealId: string, stepId: string) =>
    apiFetch<void>(`/api/deals/${dealId}/steps/${stepId}`, { token, method: 'DELETE' }),
};

// Templates
export const templatesApi = {
  list: (token: string) =>
    apiFetch<Template[]>('/api/templates', { token }),
};

// Documents
export const documentsApi = {
  upload: async (token: string, dealId: string, file: File, category: 'ToSign' | 'Reference' = 'Reference') => {
    const API_URL_LOCAL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const response = await fetch(`${API_URL_LOCAL}/api/deals/${dealId}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json() as Promise<Document>;
  },

  delete: (token: string, dealId: string, documentId: string) =>
    apiFetch<void>(`/api/deals/${dealId}/documents/${documentId}`, {
      token,
      method: 'DELETE'
    }),
};

// Analytics
export interface DealAnalytics {
  totalViews: number;
  totalDownloads: number;
  lastViewedAt: string | null;
  recentViews: {
    type: string;
    documentName: string | null;
    viewedAt: string;
  }[];
}

export const analyticsApi = {
  getDealAnalytics: (token: string, dealId: string) =>
    apiFetch<DealAnalytics>(`/api/deals/${dealId}/analytics`, { token }),
};

// Signatures
export interface SignatureRequest {
  signatureRequestId: string;
  signerUrl: string;
  status: string;
}

export interface SignatureStatusResponse {
  status: string;
  signedAt: string | null;
}

export const signaturesApi = {
  requestSignature: (token: string, dealId: string, documentId: string) =>
    apiFetch<SignatureRequest>(`/api/deals/${dealId}/documents/${documentId}/signature/request`, {
      token,
      method: 'POST',
    }),

  getStatus: (token: string, dealId: string, documentId: string) =>
    apiFetch<SignatureStatusResponse>(`/api/deals/${dealId}/documents/${documentId}/signature/status`, {
      token,
    }),
};

// Public Deal
export const publicApi = {
  getDeal: (accessToken: string) =>
    apiFetch<PublicDeal>(`/api/public/deals/${accessToken}`),
};

// Stripe
export const stripeApi = {
  createCheckout: (token: string, plan: 'monthly' | 'yearly' = 'monthly') =>
    apiFetch<{ url: string }>('/api/stripe/checkout', {
      token,
      method: 'POST',
      body: JSON.stringify({ plan }),
    }),

  createPortal: (token: string) =>
    apiFetch<{ url: string }>('/api/stripe/portal', { token, method: 'POST' }),

  getSubscription: (token: string) =>
    apiFetch<SubscriptionInfo>('/api/stripe/subscription', { token }),

  syncSubscription: (token: string) =>
    apiFetch<{ message: string; status: string }>('/api/stripe/sync', {
      token,
      method: 'POST',
    }),
};

// Deals - additional endpoint
export const dealsApiExtended = {
  canCreate: (token: string) =>
    apiFetch<CanCreateDealResponse>('/api/deals/can-create', { token }),
};

// Types
export interface Agent {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  photoUrl?: string;
  brandColor: string;
  logoUrl?: string;
  socialLinks?: string;
  subscriptionStatus: string;
  createdAt: string;
}

export interface AgentStats {
  totalDeals: number;
  activeDeals: number;
  completedDeals: number;
}

export interface Deal {
  id: string;
  clientName: string;
  clientEmail: string;
  propertyAddress: string;
  propertyPhotoUrl?: string;
  welcomeMessage?: string;
  status: string;
  accessToken: string;
  createdAt: string;
  timelineSteps: TimelineStep[];
  documents: Document[];
}

export interface TimelineStep {
  id: string;
  title: string;
  description?: string;
  status: string;
  dueDate?: string;
  completedAt?: string;
  order: number;
}

export interface Document {
  id: string;
  filename: string;
  category: string;
  uploadedAt: string;
  signatureRequestId?: string;
  signatureStatus?: string;
  signedAt?: string;
}

export interface Template {
  id: string;
  name: string;
  steps: string;
}

export interface PublicDeal {
  clientName: string;
  propertyAddress: string;
  propertyPhotoUrl?: string;
  welcomeMessage?: string;
  status: string;
  agent: {
    fullName?: string;
    email: string;
    phone?: string;
    photoUrl?: string;
    brandColor: string;
    logoUrl?: string;
    socialLinks?: string;
  };
  timelineSteps: TimelineStep[];
  documents: Document[];
}

export interface CreateDealRequest {
  clientName: string;
  clientEmail: string;
  propertyAddress: string;
  propertyPhotoUrl?: string;
  welcomeMessage?: string;
  templateId?: string;
}

export interface CreateStepRequest {
  title: string;
  description?: string;
  dueDate?: string;
  order?: number;
}

export interface SubscriptionInfo {
  status: string;
  plan: 'monthly' | 'yearly' | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface CanCreateDealResponse {
  canCreate: boolean;
  currentDeals: number;
  reason: string | null;
}
