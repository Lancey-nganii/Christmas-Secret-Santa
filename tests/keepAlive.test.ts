import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../api/keep-alive';

describe('GET /api/keep-alive', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('queries public.app_heartbeat without caching and returns 200', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify([{ status: 'awake' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET();
    const body = (await response.json()) as { ok: boolean; status: string; checkedAt: string };

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(response.headers.get('CDN-Cache-Control')).toBe('no-store');
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe('no-store');
    expect(body.ok).toBe(true);
    expect(body.status).toBe('awake');
    expect(body.checkedAt).toBeTruthy();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/rest\/v1\/app_heartbeat\?select=status&limit=1$/);
    expect(init.method).toBe('GET');
    expect(init.cache).toBe('no-store');
    expect((init.headers as Record<string, string>).apikey).toBeTruthy();
  });

  it('returns 502 with no-store headers when Supabase fails', async () => {
    const fetchMock = vi.fn(async () => new Response('Upstream error', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET();
    const body = (await response.json()) as { ok: boolean; upstreamStatus: number };

    expect(response.status).toBe(502);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(body.ok).toBe(false);
    expect(body.upstreamStatus).toBe(500);
  });
});
