import { useEffect, useRef } from 'react';
import type { FamilySyncEvent } from '../domain/models';
import { useServices } from './ServiceContext';

export interface FamilySyncBatch {
  readonly hasFamilyEvent: boolean;
  readonly hasWishlistEvent: boolean;
  readonly memberIds: ReadonlySet<string>;
  readonly wildcard: boolean;
}

const COALESCE_DELAY_MS = 60;

export function useFamilyRealtime(
  familyId: string | null,
  handlers: {
    readonly onSync: (batch: FamilySyncBatch) => void;
    readonly onReconnect: () => void;
  }
): void {
  const { realtime } = useServices();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!familyId) return;

    let timerId: number | null = null;
    let hasFamilyEvent = false;
    let hasWishlistEvent = false;
    let wildcard = false;
    let memberIds = new Set<string>();

    const flush = () => {
      timerId = null;
      const batch: FamilySyncBatch = {
        hasFamilyEvent,
        hasWishlistEvent,
        memberIds,
        wildcard,
      };
      hasFamilyEvent = false;
      hasWishlistEvent = false;
      wildcard = false;
      memberIds = new Set<string>();
      handlersRef.current.onSync(batch);
    };

    const scheduleSync = (event: FamilySyncEvent) => {
      if (event.scope === 'family') {
        hasFamilyEvent = true;
      } else {
        hasWishlistEvent = true;
      }
      if (event.memberId) {
        memberIds.add(event.memberId);
      } else {
        wildcard = true;
      }

      if (timerId === null) {
        timerId = window.setTimeout(flush, COALESCE_DELAY_MS);
      }
    };

    const unsubscribe = realtime.subscribeToFamily(familyId, {
      onSync: scheduleSync,
      onReconnect: () => {
        handlersRef.current.onReconnect();
      },
    });

    return () => {
      if (timerId !== null) {
        window.clearTimeout(timerId);
        timerId = null;
      }
      unsubscribe();
    };
  }, [familyId, realtime]);
}
