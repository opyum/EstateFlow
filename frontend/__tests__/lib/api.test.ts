import { describe, it, expect, vi, beforeEach } from 'vitest';

global.fetch = vi.fn();

describe('documentsApi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should upload document with FormData', async () => {
    const mockResponse = { id: '123', filename: 'test.pdf', category: 'Reference', uploadedAt: new Date().toISOString() };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { documentsApi } = await import('../../lib/api');
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

    const result = await documentsApi.upload('token123', 'deal-id', file, 'Reference');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/deals/deal-id/documents'),
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it('should delete document', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    });

    const { documentsApi } = await import('../../lib/api');
    await documentsApi.delete('token123', 'deal-id', 'doc-id');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/deals/deal-id/documents/doc-id'),
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });
});

describe('analyticsApi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch deal analytics', async () => {
    const mockAnalytics = {
      totalViews: 10,
      totalDownloads: 5,
      lastViewedAt: new Date().toISOString(),
      recentViews: [],
    };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalytics,
    });

    const { analyticsApi } = await import('../../lib/api');
    const result = await analyticsApi.getDealAnalytics('token123', 'deal-id');

    expect(result.totalViews).toBe(10);
    expect(result.totalDownloads).toBe(5);
  });
});

describe('signaturesApi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should request signature', async () => {
    const mockResponse = {
      signatureRequestId: 'sig-123',
      signerUrl: 'https://yousign.com/sign/123',
      status: 'ongoing',
    };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { signaturesApi } = await import('../../lib/api');
    const result = await signaturesApi.requestSignature('token123', 'deal-id', 'doc-id');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/deals/deal-id/documents/doc-id/signature/request'),
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(result.signatureRequestId).toBe('sig-123');
    expect(result.status).toBe('ongoing');
  });

  it('should get signature status', async () => {
    const mockStatus = {
      status: 'done',
      signedAt: new Date().toISOString(),
    };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStatus,
    });

    const { signaturesApi } = await import('../../lib/api');
    const result = await signaturesApi.getStatus('token123', 'deal-id', 'doc-id');

    expect(result.status).toBe('done');
    expect(result.signedAt).toBeTruthy();
  });
});
