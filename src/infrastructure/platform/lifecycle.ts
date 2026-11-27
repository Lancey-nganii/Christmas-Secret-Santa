import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import type { AppLifecyclePort } from '../../domain/ports';

export class BrowserLifecycleAdapter implements AppLifecyclePort {
  isVisible(): boolean {
    if (typeof document === 'undefined') return true;
    return document.visibilityState !== 'hidden';
  }

  isOnline(): boolean {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine !== false;
  }

  onForeground(listener: () => void): () => void {
    const handleVisibility = () => {
      if (this.isVisible()) {
        listener();
      }
    };
    const handleFocus = () => {
      if (this.isVisible()) {
        listener();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }

  onVisibilityChange(listener: (visible: boolean) => void): () => void {
    const handleVisibility = () => {
      listener(this.isVisible());
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }

  onOnline(listener: () => void): () => void {
    window.addEventListener('online', listener);
    return () => {
      window.removeEventListener('online', listener);
    };
  }
}

export class CapacitorLifecycleAdapter implements AppLifecyclePort {
  private nativeActive = true;

  isVisible(): boolean {
    if (typeof document === 'undefined') return this.nativeActive;
    return this.nativeActive && document.visibilityState !== 'hidden';
  }

  isOnline(): boolean {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine !== false;
  }

  onForeground(listener: () => void): () => void {
    let disposed = false;
    let handle: PluginListenerHandle | null = null;

    void App.addListener('appStateChange', ({ isActive }) => {
      this.nativeActive = isActive;
      if (isActive && !disposed) {
        listener();
      }
    }).then((registered) => {
      if (disposed) {
        void registered.remove();
      } else {
        handle = registered;
      }
    });

    return () => {
      disposed = true;
      if (handle) {
        void handle.remove();
        handle = null;
      }
    };
  }

  onVisibilityChange(listener: (visible: boolean) => void): () => void {
    let disposed = false;
    let handle: PluginListenerHandle | null = null;

    void App.addListener('appStateChange', ({ isActive }) => {
      this.nativeActive = isActive;
      if (!disposed) {
        listener(isActive);
      }
    }).then((registered) => {
      if (disposed) {
        void registered.remove();
      } else {
        handle = registered;
      }
    });

    const handleDomVisibility = () => {
      if (!disposed) {
        listener(this.isVisible());
      }
    };
    document.addEventListener('visibilitychange', handleDomVisibility);

    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', handleDomVisibility);
      if (handle) {
        void handle.remove();
        handle = null;
      }
    };
  }

  onOnline(listener: () => void): () => void {
    window.addEventListener('online', listener);
    return () => {
      window.removeEventListener('online', listener);
    };
  }
}
