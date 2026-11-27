import { ExternalLink, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useServices } from '../../application/ServiceContext';
import { AppError } from '../../domain/errors';
import type { GiftItem, WishlistView } from '../../domain/models';
import { Button } from '../../ui/components/Button';
import { NoticeBanner } from '../../ui/components/NoticeBanner';
import { SkeletonList } from '../../ui/components/SkeletonList';
import { StatusBadge } from '../../ui/components/StatusBadge';

interface MyWishlistScreenProps {
  wishlist: WishlistView | null;
  isLoading: boolean;
  error: AppError | null;
  isStaleOffline: boolean;
  flashMessage: string | null;
  onDismissFlash: () => void;
  onRefresh: () => Promise<void>;
  onAddGift: () => void;
  onEditGift: (gift: GiftItem) => void;
}

export function MyWishlistScreen({
  wishlist,
  isLoading,
  error,
  isStaleOffline,
  flashMessage,
  onDismissFlash,
  onRefresh,
  onAddGift,
  onEditGift,
}: MyWishlistScreenProps) {
  const { wishlist: wishlistGateway, externalLinks } = useServices();
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [busyGiftId, setBusyGiftId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleConfirmRemove(gift: GiftItem) {
    setBusyGiftId(gift.id);
    setActionError(null);
    onDismissFlash();
    try {
      await wishlistGateway.removeGift(gift.id);
      setConfirmRemoveId(null);
      await onRefresh();
    } catch (err) {
      setConfirmRemoveId(null);
      setActionError(
        err instanceof AppError
          ? err.message
          : 'Could not remove that gift right now. Refresh the list and try again.'
      );
      await onRefresh();
    } finally {
      setBusyGiftId(null);
    }
  }

  return (
    <section className="section-stack" aria-labelledby="my-wishlist-heading">
      <div className="section-intro">
        <div className="section-header-row">
          <h2 id="my-wishlist-heading" className="section-heading">
            My Wishlist
          </h2>

          <Button onClick={onAddGift} compact data-primary-action>
            <Plus size={18} strokeWidth={2} aria-hidden="true" />
            <span>Add a gift</span>
          </Button>
        </div>
        <p className="section-lead">
          Add ideas for your family. Once someone claims a gift, it locks so their surprise stays
          protected.
        </p>
      </div>

      {flashMessage ? (
        <NoticeBanner tone="success" message={flashMessage} />
      ) : null}

      {actionError ? <NoticeBanner tone="error" message={actionError} /> : null}

      {isStaleOffline ? (
        <NoticeBanner
          tone="error"
          message="Showing your last saved wishlist while offline. Reconnect before editing or removing gifts."
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

      {isLoading && !wishlist ? (
        <SkeletonList rows={3} label="Loading your wishlist" />
      ) : null}

      {wishlist && wishlist.gifts.length === 0 ? (
        <div className="empty-state-card">
          <p className="empty-state-title">Your wishlist is empty</p>
          <p className="empty-state-copy">
            Add your first gift idea—even a short note or store link helps your family pick the
            right size or style.
          </p>
          <Button onClick={onAddGift}>
            <Plus size={18} strokeWidth={2} aria-hidden="true" />
            <span>Add a gift</span>
          </Button>
        </div>
      ) : null}

      {wishlist && wishlist.gifts.length > 0 ? (
        <ul className="card-list">
          {wishlist.gifts.map((gift) => {
            const isPicked = gift.status !== 'available' || !gift.canEdit;
            const isConfirming = confirmRemoveId === gift.id;
            const isBusy = busyGiftId === gift.id;

            return (
              <li
                key={gift.id}
                className={`gift-card ${isPicked ? 'gift-card--taken' : ''}`.trim()}
              >
                <div className="gift-card-top">
                  <h3 className={`gift-title ${isPicked ? 'gift-title--taken' : ''}`.trim()}>
                    {gift.name}
                  </h3>

                  {isPicked ? (
                    <StatusBadge
                      tone="cranberry"
                      icon={<Lock size={14} strokeWidth={2} aria-hidden="true" />}
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

                {isPicked ? (
                  <p className="sync-meta">
                    Locked while a family member has this gift picked.
                  </p>
                ) : isConfirming ? (
                  <div className="inline-confirm-box">
                    <span className="inline-confirm-text">
                      Remove &ldquo;{gift.name}&rdquo; from your list?
                    </span>
                    <div className="gift-button-group">
                      <Button
                        variant="cranberry"
                        compact
                        disabled={isBusy}
                        onClick={() => void handleConfirmRemove(gift)}
                      >
                        {isBusy ? 'Removing…' : 'Confirm remove'}
                      </Button>
                      <Button
                        variant="secondary"
                        compact
                        disabled={isBusy}
                        onClick={() => setConfirmRemoveId(null)}
                      >
                        Keep
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="gift-actions-row">
                    <div className="gift-button-group">
                      <Button
                        variant="secondary"
                        compact
                        disabled={isBusy}
                        onClick={() => onEditGift(gift)}
                      >
                        <Pencil size={15} strokeWidth={2} aria-hidden="true" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        variant="secondary"
                        compact
                        disabled={isBusy}
                        onClick={() => {
                          setActionError(null);
                          setConfirmRemoveId(gift.id);
                        }}
                      >
                        <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
                        <span>Remove</span>
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
