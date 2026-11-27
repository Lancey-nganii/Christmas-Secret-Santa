import type { RealtimeChannel } from '@supabase/supabase-js';
import type { FamilySyncEvent } from '../../domain/models';
import type { RealtimeGateway } from '../../domain/ports';
import { getSupabaseClient } from './client';

interface RawBroadcastMessage {
  payload?: {
    scope?: string;
    member_id?: string | null;
  };
}

const RETRY_DELAY_MS = 3_000;

export class SupabaseRealtimeGateway implements RealtimeGateway {
  subscribeToFamily(
    familyId: string,
    handlers: {
      readonly onSync: (event: FamilySyncEvent) => void;
      readonly onReconnect?: () => void;
    }
  ): () => void {
    const supabase = getSupabaseClient();
    let disposed = false;
    let channel: RealtimeChannel | null = null;
    let retryTimerId: number | null = null;
    let hadDisconnect = false;
    let hasSubscribedOnce = false;

    const cleanupChannel = () => {
      if (channel) {
        const current = channel;
        channel = null;
        void supabase.removeChannel(current);
      }
    };

    const scheduleRetry = () => {
      if (disposed || retryTimerId !== null) return;
      retryTimerId = window.setTimeout(() => {
        retryTimerId = null;
        if (!disposed) {
          cleanupChannel();
          void connect();
        }
      }, RETRY_DELAY_MS);
    };

    const connect = async () => {
      try {
        await supabase.realtime.setAuth();
      } catch {
        // Proceed; channel subscribe handles retry if auth wasn't ready yet.
      }
      if (disposed) return;

      const nextChannel = supabase.channel(`family:${familyId}`, {
        config: { private: true },
      });
      channel = nextChannel;

      nextChannel
        .on('broadcast', { event: 'family_sync' }, (message: RawBroadcastMessage) => {
          if (disposed) return;
          const payload = message?.payload;
          handlers.onSync({
            scope: payload?.scope === 'family' ? 'family' : 'wishlist',
            memberId: payload?.member_id ?? null,
          });
        })
        .subscribe((status) => {
          if (disposed || channel !== nextChannel) return;
          if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            hadDisconnect = true;
            scheduleRetry();
            return;
          }
          if (status === 'CLOSED') {
            hadDisconnect = true;
            return;
          }
          if (status === 'SUBSCRIBED') {
            if (hasSubscribedOnce && hadDisconnect) {
              hadDisconnect = false;
              handlers.onReconnect?.();
            } else {
              hasSubscribedOnce = true;
              hadDisconnect = false;
            }
          }
        });
    };

    void connect();

    return () => {
      disposed = true;
      if (retryTimerId !== null) {
        window.clearTimeout(retryTimerId);
        retryTimerId = null;
      }
      cleanupChannel();
    };
  }
}
