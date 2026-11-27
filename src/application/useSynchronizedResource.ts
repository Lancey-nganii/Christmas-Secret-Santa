import { useCallback, useEffect, useRef, useState } from 'react';
import { AppError, isNetworkError } from '../domain/errors';
import { useServices } from './ServiceContext';

export const SYNC_POLL_INTERVAL_MS = 15_000;

export interface SynchronizedResourceState<T> {
  readonly data: T | null;
  readonly isLoading: boolean;
  readonly isRefreshing: boolean;
  readonly error: AppError | null;
  readonly isStaleOffline: boolean;
  readonly refreshNow: () => Promise<void>;
}

export function useSynchronizedResource<T>(
  fetcher: () => Promise<T>,
  depsKey: string,
  options?: { enabled?: boolean; pollIntervalMs?: number }
): SynchronizedResourceState<T> {
  const { lifecycle } = useServices();
  const enabled = options?.enabled ?? true;
  const pollIntervalMs = options?.pollIntervalMs ?? SYNC_POLL_INTERVAL_MS;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);
  const [isStaleOffline, setIsStaleOffline] = useState<boolean>(false);

  const requestIdRef = useRef(0);
  const fetcherRef = useRef(fetcher);
  const dataRef = useRef<T | null>(data);

  fetcherRef.current = fetcher;
  dataRef.current = data;

  const runFetch = useCallback(
    async (mode: 'initial' | 'background') => {
      if (!enabled) return;

      const reqId = ++requestIdRef.current;
      if (mode === 'initial' && dataRef.current === null) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const result = await fetcherRef.current();
        if (reqId !== requestIdRef.current) return;

        setData(result);
        setError(null);
        setIsStaleOffline(false);
      } catch (err) {
        if (reqId !== requestIdRef.current) return;

        const mapped =
          err instanceof AppError
            ? err
            : new AppError('UNKNOWN', 'Could not refresh the latest data right now.');
        setError(mapped);
        if (isNetworkError(mapped) && dataRef.current !== null) {
          setIsStaleOffline(true);
        }
      } finally {
        if (reqId === requestIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [enabled]
  );

  useEffect(() => {
    setData(null);
    setError(null);
    setIsStaleOffline(false);

    if (!enabled) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    void runFetch('initial');
  }, [depsKey, enabled, runFetch]);

  useEffect(() => {
    if (!enabled) return;

    let timerId: number | null = null;

    const stopPolling = () => {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
    };

    const startPolling = () => {
      stopPolling();
      if (!lifecycle.isVisible()) return;
      timerId = window.setInterval(() => {
        if (lifecycle.isVisible()) {
          void runFetch('background');
        }
      }, pollIntervalMs);
    };

    startPolling();

    const unsubForeground = lifecycle.onForeground(() => {
      void runFetch('background');
      startPolling();
    });

    const unsubVisibility = lifecycle.onVisibilityChange((visible) => {
      if (visible) {
        startPolling();
      } else {
        stopPolling();
      }
    });

    const unsubOnline = lifecycle.onOnline(() => {
      void runFetch('background');
    });

    return () => {
      stopPolling();
      unsubForeground();
      unsubVisibility();
      unsubOnline();
    };
  }, [enabled, lifecycle, pollIntervalMs, runFetch]);

  const refreshNow = useCallback(async () => {
    await runFetch('background');
  }, [runFetch]);

  return {
    data,
    isLoading: isLoading || (enabled && data === null && error === null),
    isRefreshing,
    error,
    isStaleOffline,
    refreshNow,
  };
}
