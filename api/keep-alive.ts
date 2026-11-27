const DEFAULT_SUPABASE_URL = 'https://xjaucojgcuogzsjxtbds.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_BXdsdhhDR-r3fwcKvZjg4g_D8uj60uj';

const NO_CACHE_HEADERS: Readonly<Record<string, string>> = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

function readEnv(): Record<string, string | undefined> {
  return (
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
  );
}

export async function GET(): Promise<Response> {
  const checkedAt = new Date().toISOString();
  const env = readEnv();
  const supabaseUrl = (
    env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL
  ).replace(/\/+$/, '');
  const publishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/app_heartbeat?select=status&limit=1`, {
      method: 'GET',
      headers: {
        apikey: publishableKey,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          upstreamStatus: response.status,
          checkedAt,
        }),
        { status: 502, headers: NO_CACHE_HEADERS }
      );
    }

    const rows = (await response.json()) as Array<{ status?: string }>;
    return new Response(
      JSON.stringify({
        ok: true,
        status: rows[0]?.status ?? 'awake',
        checkedAt,
      }),
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : 'Upstream request failed',
        checkedAt,
      }),
      { status: 502, headers: NO_CACHE_HEADERS }
    );
  }
}
