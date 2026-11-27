import { ArrowLeft, Check, ExternalLink, Gift, RefreshCw, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { useServices } from '../../application/ServiceContext';
import { AppError, isNetworkError } from '../../domain/errors';
import type { GiftItem, WishlistView } from '../../domain/models';
import { Button } from '../../ui/components/Button';
import { NoticeBanner } from '../../ui/components/NoticeBanner';
import { SkeletonList } from '../../ui/components/SkeletonList';
import { StatusBadge } from '../../ui/components/StatusBadge';

interface RelativeWishlistScreenProps {
  wishlist: WishlistView | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: AppError | null;
  isStaleOffline: boolean;
  onRefresh: () => Promise<void>;
  onBackToFamily: () => void;
  onGiftPicked?: (gift: GiftItem, pickId: string) => void;
  onGiftUndone?: (gift: GiftItem) => void;
}

export function RelativeWishlistScreen({
  wishlist,
  isLoading,
  isRefreshing,
  error,
  isStaleOffline,
  onRefresh,
  onBackToFamily,
  onGiftPicked,
  onGiftUndone,
}: RelativeWishlistScreenProps) {
  const { wishlist: wishlistGateway, externalLinks } = useServices();
  const [busyGiftId, setBusyGiftId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

  async function handlePick(gift: GiftItem) {
    setBusyGiftId(gift.id);
    setFeedback(null);
    try {
      const result = await wishlistGateway.pickGift(gift.id);
      if (result.outcome === 'picked') {
        setFeedback({
          tone: 'success',
          message: `You picked "${gift.name}". Nobody else in the family can see that it was you.`,
        });
        onGiftPicked?.(gift, result.pickId);
        void onRefresh();
      } else if (result.outcome === 'already_picked') {
        setFeedback({
          tone: 'error',
          message: `"${gift.name}" was just picked by another relative.`,
        });
        await onRefresh();
      } else if (result.outcome === 'recipient_limit') {
        setFeedback({
          tone: 'info',
          message: `You already picked a gift for ${wishlist?.displayName ?? 'this relative'}. Undo that pick first if you want to switch.`,
        });
        await onRefresh();
      }
    } catch (err) {
      if (isNetworkError(err)) {
        setFeedback({
          tone: 'error',
          message:
            'Your connection dropped before the pick was confirmed. Refresh once you are back online to see what saved.',
        });
      } else {
        setFeedback({
          tone: 'error',
          message:
            err instanceof AppError
              ? err.message
              : 'Could not save your pick right now. Refresh and try again.',
        });
      }
      await onRefresh();
    } finally {
      setBusyGiftId(null);
    }
  }

  async function handleUndo(gift: GiftItem) {
    if (!gift.pickId) return;
    setBusyGiftId(gift.id);
    setFeedback(null);
    try {
      const result = await wishlistGateway.undoPick(gift.pickId);
      onGiftUndone?.(gift);
      if (result.outcome === 'undone') {
        setFeedback({
          tone: 'info',
          message: `"${gift.name}" is available again. You can now pick a different gift for ${wishlist?.displayName ?? 'them'}.`,
        });
      } else {
        setFeedback({
          tone: 'info',
          message: 'That pick was already released. Showing the latest list.',
        });
      }
      void onRefresh();
    } catch (err) {
      if (isNetworkError(err)) {
        setFeedback({
          tone: 'error',
          message:
            'Your connection dropped before Undo was confirmed. Refresh once online to check the latest status.',
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
      setBusyGiftId(null);
    }
  }

  const hasPickedForRelative = Boolean(wishlist?.viewerPickedGiftId);
  let assignedPrimaryCta = false;

  return (
    <section className="section-stack" aria-labelledby="relative-wishlist-heading">
      <div className="section-header-row">
        <Button
          variant="secondary"
          compact
          onClick={onBackToFamily}
          data-primary-action={!wishlist || hasPickedForRelative || wishlist.gifts.every((g) => !g.canPick) ? true : undefined}
        >
          <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
          <span>Back to Family</span>
        </Button>

        <Button
          variant="secondary"
          compact
          onClick={() => void onRefresh()}
          disabled={isLoading || isRefreshing}
        >
          <RefreshCw size={16} strokeWidth={2} aria-hidden="true" />
          <span>{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
        </Button>
      </div>

      {wishlist ? (
        <div className="section-intro">
          <h2 id="relative-wishlist-heading" className="section-heading">
            {wishlist.displayName}&rsquo;s Wishlist
          </h2>
          <p className="section-lead">
            You can pick one gift for {wishlist.displayName}. Your name stays hidden from everyone
            else.
          </p>
        </div>
      ) : (
        <div className="section-intro">
          <h2 id="relative-wishlist-heading" className="section-heading">
            Relative&rsquo;s Wishlist
          </h2>
        </div>
      )}

      {feedback ? <NoticeBanner tone={feedback.tone} message={feedback.message} /> : null}

      {hasPickedForRelative && wishlist ? (
        <NoticeBanner
          tone="info"
          message={`You already picked a gift for ${wishlist.displayName}. Undo your current pick below if you want to choose a different gift.`}
        />
      ) : null}

      {isStaleOffline ? (
        <NoticeBanner
          tone="error"
          message="Showing the last loaded list while offline. Reconnect before picking or undoing a gift."
        />
      ) : null}

      {error && !wishlist ? (
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

      {isLoading && !wishlist ? <SkeletonList rows={3} label="Loading wishlist" /> : null}

      {wishlist && wishlist.gifts.length === 0 ? (
        <div className="empty-state-card">
          <p className="empty-state-title">Wishlist coming soon</p>
          <p className="empty-state-copy">
            {wishlist.displayName} hasn&rsquo;t added any gift ideas yet. Check back soon!
          </p>
        </div>
      ) : null}

      {wishlist && wishlist.gifts.length > 0 ? (
        <ul className="card-list">
          {wishlist.gifts.map((gift) => {
            const isAlreadyPicked = gift.status === 'already_picked';
            const isPickedByYou = gift.status === 'picked_by_you';
            const isBusy = busyGiftId === gift.id;
            const shouldMarkPrimary = gift.canPick && !assignedPrimaryCta;
            if (shouldMarkPrimary) assignedPrimaryCta = true;

            return (
              <li
                key={gift.id}
                className={`gift-card ${isAlreadyPicked ? 'gift-card--taken' : ''}`.trim()}
              >
                <div className="gift-card-top">
                  <h3
                    className={`gift-title ${isAlreadyPicked ? 'gift-title--taken' : ''}`.trim()}
                  >
                    {gift.name}
                  </h3>

                  {isPickedByYou ? (
                    <StatusBadge
                      tone="pine"
                      icon={<Check size={14} strokeWidth={2} aria-hidden="true" />}
                    >
                      You picked this
                    </StatusBadge>
                  ) : null}

                  {isAlreadyPicked ? (
                    <StatusBadge
                      tone="cranberry"
                      icon={<Gift size={14} strokeWidth={2} aria-hidden="true" />}
                    >
                      Already picked
                    </StatusBadge>
                  ) : null}
                </div>

                {gift.note ? <p className="gift-note">{gift.note}</p> : null}

                {gift.storeUrl ? (
                  <button
                    type="button"
                    className="gift-store-link"
                    onClick={() => externalLinks.openUrl(gift.storeUrl!)}
                  >
                    <ExternalLink size={15} strokeWidth={2} aria-hidden="true" />
                    <span>Open store link</span>
                  </button>
                ) : null}

                {gift.canPick ? (
                  <div className="gift-actions-row">
                    <Button
                      onClick={() => void handlePick(gift)}
                      disabled={busyGiftId !== null}
                      data-primary-action={shouldMarkPrimary ? true : undefined}
                    >
                      <Check size={17} strokeWidth={2} aria-hidden="true" />
                      <span>{isBusy ? 'Saving pick…' : 'I’ll buy this'}</span>
                    </Button>
                  </div>
                ) : null}

                {isPickedByYou && gift.pickId ? (
                  <div className="gift-actions-row">
                    <Button
                      variant="secondary"
                      compact
                      onClick={() => void handleUndo(gift)}
                      disabled={busyGiftId !== null}
                    >
                      <Undo2 size={16} strokeWidth={2} aria-hidden="true" />
                      <span>{isBusy ? 'Undoing…' : 'Undo'}</span>
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
