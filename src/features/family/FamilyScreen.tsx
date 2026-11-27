import { Check, ChevronRight, Clock, Gift, RefreshCw, UserPlus } from 'lucide-react';
import type { AppError } from '../../domain/errors';
import type { RelativeSummary } from '../../domain/models';
import { Button } from '../../ui/components/Button';
import { NoticeBanner } from '../../ui/components/NoticeBanner';
import { SkeletonList } from '../../ui/components/SkeletonList';
import { StatusBadge } from '../../ui/components/StatusBadge';

interface FamilyScreenProps {
  relatives: readonly RelativeSummary[] | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: AppError | null;
  isStaleOffline: boolean;
  isOrganizer?: boolean;
  onRefresh: () => void;
  onManageFamily?: () => void;
  onSelectRelative: (memberId: string) => void;
  onGoToMyWishlist: () => void;
}

export function FamilyScreen({
  relatives,
  isLoading,
  isRefreshing,
  error,
  isStaleOffline,
  isOrganizer = false,
  onRefresh,
  onManageFamily,
  onSelectRelative,
  onGoToMyWishlist,
}: FamilyScreenProps) {
  return (
    <section className="section-stack" aria-labelledby="family-heading">
      <div className="section-intro">
        <div className="section-header-row">
          <h2 id="family-heading" className="section-heading">
            Family
          </h2>

          <div className="gift-button-group">
            {isOrganizer && onManageFamily ? (
              <Button variant="secondary" compact onClick={onManageFamily}>
                <UserPlus size={16} strokeWidth={2} aria-hidden="true" />
                <span>Manage family</span>
              </Button>
            ) : null}

            <Button
              variant="secondary"
              compact
              onClick={onRefresh}
              disabled={isLoading || isRefreshing}
              aria-label="Refresh family list"
            >
              <RefreshCw size={16} strokeWidth={2} aria-hidden="true" />
              <span>{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
            </Button>
          </div>
        </div>
        <p className="section-lead">
          Choose a relative to browse their wishlist and pick a gift to buy.
        </p>
      </div>

      {isStaleOffline ? (
        <NoticeBanner
          tone="error"
          message="Showing your last loaded family list while offline. Reconnect and refresh for the latest updates."
        />
      ) : null}

      {error && !relatives ? (
        <NoticeBanner
          tone="error"
          message={error.message}
          action={
            <Button variant="secondary" compact onClick={onRefresh}>
              Try again
            </Button>
          }
        />
      ) : null}

      {isLoading && !relatives ? <SkeletonList rows={4} label="Loading family members" /> : null}

      {relatives && relatives.length === 0 ? (
        <div className="empty-state-card">
          <p className="empty-state-title">No relatives on the roster yet</p>
          <p className="empty-state-copy">
            Once other family members are added to your group, their names and wishlists will
            appear here. Meanwhile, you can start adding ideas to your own list.
          </p>
          <Button onClick={onGoToMyWishlist} data-primary-action>
            Go to My Wishlist
          </Button>
        </div>
      ) : null}

      {relatives && relatives.length > 0 ? (
        <ul className="card-list">
          {relatives.map((relative, index) => (
            <li key={relative.memberId}>
              <button
                type="button"
                className="relative-row-button"
                onClick={() => onSelectRelative(relative.memberId)}
                data-primary-action={index === 0 ? true : undefined}
              >
                <div className="relative-row-meta">
                  <span className="relative-row-name">{relative.displayName}</span>
                  <div className="relative-row-sub">
                    {relative.hasWishlist ? (
                      <span className="tabular-count">
                        {relative.giftCount} {relative.giftCount === 1 ? 'gift' : 'gifts'}
                      </span>
                    ) : (
                      <StatusBadge
                        tone="neutral"
                        icon={<Clock size={14} strokeWidth={2} aria-hidden="true" />}
                      >
                        Wishlist coming soon
                      </StatusBadge>
                    )}

                    {relative.pickedByViewer ? (
                      <StatusBadge
                        tone="pine"
                        icon={<Check size={14} strokeWidth={2} aria-hidden="true" />}
                      >
                        You picked a gift
                      </StatusBadge>
                    ) : null}
                  </div>
                </div>

                <span className="relative-row-trailing" aria-hidden="true">
                  {relative.hasWishlist ? <Gift size={18} strokeWidth={2} /> : null}
                  <ChevronRight size={20} strokeWidth={2} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
