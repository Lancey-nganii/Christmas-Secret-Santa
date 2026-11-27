import { Check, ExternalLink, RefreshCw, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { useServices } from '../../application/ServiceContext';
import { AppError, isNetworkError } from '../../domain/errors';
import type { PickedGiftSummary } from '../../domain/models';
import { Button } from '../../ui/components/Button';
import { NoticeBanner } from '../../ui/components/NoticeBanner';
import { SkeletonList } from '../../ui/components/SkeletonList';
import { StatusBadge } from '../../ui/components/StatusBadge';

interface GiftsPickedScreenProps {
  picks: readonly PickedGiftSummary[] | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: AppError | null;
  isStaleOffline: boolean;
  onRefresh: () => Promise<void>;
  onBrowseFamily: () => void;
  onOpenRelative: (memberId: string) => void;
  onPickUndone: (pick: PickedGiftSummary) => void;
}

export function GiftsPickedScreen({
  picks,
  isLoading,
  isRefreshing,
  error,
  isStaleOffline,
  onRefresh,
  onBrowseFamily,
  onOpenRelative,
  onPickUndone,
}: GiftsPickedScreenProps) {
  const { wishlist: wishlistGateway, externalLinks } = useServices();
  const [busyPickId, setBusyPickId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: 'info' | 'error';
    message: string;
  } | null>(null);

  async function handleUndo(pick: PickedGiftSummary) {
    setBusyPickId(pick.pickId);
    setFeedback(null);
    try {
      const result = await wishlistGateway.undoPick(pick.pickId);
      onPickUndone(pick);
      if (result.outcome === 'undone') {
        setFeedback({
          tone: 'info',
          message: `Released "${pick.giftName}" for ${pick.recipientDisplayName}.`,
        });
      } else {
        setFeedback({
          tone: 'info',
          message: 'That pick was already released. Showing your latest shopping list.',
        });
      }
      void onRefresh();
    } catch (err) {
      if (isNetworkError(err)) {
        setFeedback({
          tone: 'error',
          message:
            'Your connection dropped before Undo was confirmed. Refresh once online to check your picks.',
        });
      } else {
        setFeedback({
          tone: 'error',
          message:
            err instanceof AppError
              ? err.message
              : 'Could not undo that pick right now. Refresh and try again.',
        });
      }
      await onRefresh();
    } finally {
      setBusyPickId(null);
    }
  }

  return (
    <section className="section-stack" aria-labelledby="gifts-picked-heading">
      <div className="section-intro">
        <div className="section-header-row">
          <h2 id="gifts-picked-heading" className="section-heading">
            Gifts Picked
          </h2>

          <Button
            variant="secondary"
            compact
            onClick={() => void onRefresh()}
            disabled={isLoading || isRefreshing}
            aria-label="Refresh picked gifts"
          >
            <RefreshCw size={16} strokeWidth={2} aria-hidden="true" />
            <span>{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
          </Button>
        </div>
        <p className="section-lead">
          Every gift you&rsquo;ve secretly claimed across your family. Only you can see this
          shopping list.
        </p>
      </div>

      {feedback ? <NoticeBanner tone={feedback.tone} message={feedback.message} /> : null}

      {isStaleOffline ? (
        <NoticeBanner
          tone="error"
          message="Showing your last loaded picks while offline. Reconnect before undoing a pick."
        />
      ) : null}

      {error && !picks ? (
        <NoticeBanner
          tone="error"
          message={error.message}
          action={
            <Button variant="secondary" compact onClick={() => void onRefresh()}>
              Try again
            </Button>
          }
        />
      ) : null}

      {isLoading && !picks ? <SkeletonList rows={3} label="Loading gifts you picked" /> : null}

      {picks && picks.length === 0 ? (
        <div className="empty-state-card">
          <p className="empty-state-title">No gifts picked yet</p>
          <p className="empty-state-copy">
            Browse your family&rsquo;s wishlists and tap I&rsquo;ll buy this on a gift to keep
            track of what you&rsquo;re buying here.
          </p>
          <Button onClick={onBrowseFamily} data-primary-action>
            Browse Family
          </Button>
        </div>
      ) : null}

      {picks && picks.length > 0 ? (
        <ul className="card-list">
          {picks.map((pick) => {
            const isBusy = busyPickId === pick.pickId;

            return (
              <li key={pick.pickId} className="gift-card">
                <div className="picked-card-badges">
                  <StatusBadge tone="peach">For {pick.recipientDisplayName}</StatusBadge>
                  <StatusBadge
                    tone="pine"
                    icon={<Check size={14} strokeWidth={2} aria-hidden="true" />}
                  >
                    You picked this
                  </StatusBadge>
                </div>

                <h3 className="gift-title">{pick.giftName}</h3>

                {pick.giftNote ? <p className="gift-note">{pick.giftNote}</p> : null}

                {pick.storeUrl ? (
                  <button
                    type="button"
                    className="gift-store-link"
                    onClick={() => externalLinks.openUrl(pick.storeUrl!)}
                  >
                    <ExternalLink size={15} strokeWidth={2} aria-hidden="true" />
                    <span>Open store link</span>
                  </button>
                ) : null}

                <div className="gift-actions-row">
                  <div className="gift-button-group">
                    <Button
                      variant="secondary"
                      compact
                      onClick={() => onOpenRelative(pick.recipientMemberId)}
                      disabled={isBusy}
                    >
                      <span>View list</span>
                    </Button>
                    <Button
                      variant="secondary"
                      compact
                      onClick={() => void handleUndo(pick)}
                      disabled={busyPickId !== null}
                      aria-label={`Undo pick for ${pick.recipientDisplayName}: ${pick.giftName}`}
                    >
                      <Undo2 size={16} strokeWidth={2} aria-hidden="true" />
                      <span>{isBusy ? 'Undoing…' : 'Undo'}</span>
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
