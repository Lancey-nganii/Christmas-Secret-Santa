import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceProvider } from '../src/application/ServiceContext';
import { useSynchronizedResource } from '../src/application/useSynchronizedResource';
import type { AppLifecyclePort, AppServices } from '../src/domain/ports';
import { createPreviewServices } from '../src/infrastructure/devPreview/previewServices';

function createControlledLifecycle() {
  let visible = true;
  const foregroundListeners = new Set<() => void>();
  const visibilityListeners = new Set<(v: boolean) => void>();
  const onlineListeners = new Set<() => void>();

  const port: AppLifecyclePort = {
    isVisible: () => visible,
    isOnline: () => true,
    onForeground: (cb) => {
      foregroundListeners.add(cb);
      return () => foregroundListeners.delete(cb);
    },
    onVisibilityChange: (cb) => {
      visibilityListeners.add(cb);
      return () => visibilityListeners.delete(cb);
    },
    onOnline: (cb) => {
      onlineListeners.add(cb);
      return () => onlineListeners.delete(cb);
    },
  };

  return {
    port,
    setVisible(next: boolean) {
      visible = next;
      for (const l of visibilityListeners) l(next);
      if (next) {
        for (const l of foregroundListeners) l();
      }
    },
    triggerOnline() {
      for (const l of onlineListeners) l();
    },
  };
}

describe('useSynchronizedResource', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('discards stale responses when a newer refresh finishes earlier', async () => {
    const lifecycle = createControlledLifecycle();
    const services: AppServices = {
      ...createPreviewServices('family'),
      lifecycle: lifecycle.port,
    };

    let resolveFirst!: (v: string) => void;
    let resolveSecond!: (v: string) => void;

    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockImplementationOnce(
        () =>
          new Promise<string>((r) => {
            resolveFirst = r;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise<string>((r) => {
            resolveSecond = r;
          })
      );

    const wrapper = ({ children }: { children: ReactNode }) => (
      <ServiceProvider value={services}>{children}</ServiceProvider>
    );

    const { result } = renderHook(() => useSynchronizedResource(fetcher, 'k'), { wrapper });

    await act(async () => {
      void result.current.refreshNow();
    });

    await act(async () => {
      resolveSecond('fresh-value');
      await Promise.resolve();
    });

    expect(result.current.data).toBe('fresh-value');

    await act(async () => {
      resolveFirst('stale-value');
      await Promise.resolve();
    });

    expect(result.current.data).toBe('fresh-value');
  });

  it('polls every 15s while visible and suspends polling while backgrounded', async () => {
    const lifecycle = createControlledLifecycle();
    const services: AppServices = {
      ...createPreviewServices('family'),
      lifecycle: lifecycle.port,
    };

    let callCount = 0;
    const fetcher = vi.fn(async () => `count-${++callCount}`);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <ServiceProvider value={services}>{children}</ServiceProvider>
    );

    renderHook(() => useSynchronizedResource(fetcher, 'poll'), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(15_000);
      await Promise.resolve();
    });
    expect(fetcher).toHaveBeenCalledTimes(2);

    // Background the app: polling must pause
    await act(async () => {
      lifecycle.setVisible(false);
    });

    await act(async () => {
      vi.advanceTimersByTime(45_000);
      await Promise.resolve();
    });
    expect(fetcher).toHaveBeenCalledTimes(2);

    // Returning to foreground refreshes immediately and resumes polling
    await act(async () => {
      lifecycle.setVisible(true);
      await Promise.resolve();
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
