import { useCallback, useEffect, useState } from 'react';
import { AppError, isNetworkError } from '../domain/errors';
import type { AuthSessionUser } from '../domain/ports';
import { useServices } from './ServiceContext';

export type SessionPhase = 'initializing' | 'signed_out' | 'signed_in';

export interface AuthSessionState {
  readonly phase: SessionPhase;
  readonly user: AuthSessionUser | null;
  readonly error: AppError | null;
  readonly signOut: () => Promise<void>;
}

export function useAuthSession(): AuthSessionState {
  const { auth, lifecycle } = useServices();
  const [phase, setPhase] = useState<SessionPhase>('initializing');
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    let active = true;

    auth
      .getCurrentUser()
      .then((current) => {
        if (!active) return;
        setUser(current);
        setPhase(current ? 'signed_in' : 'signed_out');
      })
      .catch((err) => {
        if (!active) return;
        setUser((existing) => {
          if (existing && isNetworkError(err)) {
            setPhase('signed_in');
            return existing;
          }
          setError(
            err instanceof AppError
              ? err
              : new AppError('UNKNOWN', 'Could not restore your sign-in session.')
          );
          setPhase('signed_out');
          return null;
        });
      });

    const unsubAuth = auth.onAuthChange((nextUser) => {
      if (!active) return;
      setUser(nextUser);
      setError(null);
      setPhase(nextUser ? 'signed_in' : 'signed_out');
    });

    const handleResume = () => {
      auth.resumeAutoRefresh?.();
    };
    const unsubForeground = lifecycle.onForeground(handleResume);
    const unsubOnline = lifecycle.onOnline(handleResume);

    return () => {
      active = false;
      unsubAuth();
      unsubForeground();
      unsubOnline();
    };
  }, [auth, lifecycle]);

  const signOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
    setPhase('signed_out');
  }, [auth]);

  return {
    phase,
    user,
    error,
    signOut,
  };
}
