import type { User } from '@supabase/supabase-js';
import { isNetworkError } from '../../domain/errors';
import type { AuthGateway, AuthSessionUser } from '../../domain/ports';
import { usernameToAuthEmail } from '../../domain/validation';
import { AUTH_STORAGE_KEY, getSupabaseClient } from './client';
import { mapAuthError } from './errorMapper';

function toSessionUser(user: User | null): AuthSessionUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
  };
}

function readPersistedSessionUser(): AuthSessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { user?: { id?: string; email?: string | null } };
    if (parsed?.user?.id) {
      return {
        id: parsed.user.id,
        email: parsed.user.email ?? null,
      };
    }
  } catch {
    // Ignore storage read or parse issues.
  }
  return null;
}

export class SupabaseAuthGateway implements AuthGateway {
  async getCurrentUser(): Promise<AuthSessionUser | null> {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        const mapped = mapAuthError(error, 'session');
        if (isNetworkError(mapped)) {
          const cached = readPersistedSessionUser();
          if (cached) return cached;
        }
        throw mapped;
      }
      return toSessionUser(data.session?.user ?? null) ?? readPersistedSessionUser();
    } catch (err) {
      const mapped = mapAuthError(err, 'session');
      if (isNetworkError(mapped)) {
        const cached = readPersistedSessionUser();
        if (cached) return cached;
      }
      throw mapped;
    }
  }

  onAuthChange(listener: (user: AuthSessionUser | null) => void): () => void {
    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        void supabase.realtime.setAuth(session.access_token);
      }
      listener(toSessionUser(session?.user ?? null));
    });
    return () => subscription.unsubscribe();
  }

  async signInWithUsername(username: string, password: string): Promise<AuthSessionUser> {
    const supabase = getSupabaseClient();
    const email = usernameToAuthEmail(username);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user) {
      throw mapAuthError(error ?? new Error('Invalid login credentials'), 'sign_in');
    }

    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      void navigator.storage.persist().catch(() => undefined);
    }

    return toSessionUser(data.user)!;
  }

  resumeAutoRefresh(): void {
    const supabase = getSupabaseClient();
    void supabase.auth.startAutoRefresh();
  }

  async signOut(): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      throw mapAuthError(error, 'session');
    }
  }
}
