import { Component, useCallback, useState, type ErrorInfo, type ReactNode } from 'react';
import { ServiceProvider, useServices } from '../application/ServiceContext';
import { useAuthSession } from '../application/useAuthSession';
import { useFamilyRealtime } from '../application/useFamilyRealtime';
import { useSynchronizedResource } from '../application/useSynchronizedResource';
import type { GiftItem, PickedGiftSummary } from '../domain/models';
import type { AppServices } from '../domain/ports';
import { SignInScreen } from '../features/auth/SignInScreen';
import { FamilyScreen } from '../features/family/FamilyScreen';
import { ManageFamilyScreen } from '../features/family/ManageFamilyScreen';
import { GiftFormScreen } from '../features/my-wishlist/GiftFormScreen';
import { MyWishlistScreen } from '../features/my-wishlist/MyWishlistScreen';
import { GiftsPickedScreen } from '../features/picks/GiftsPickedScreen';
import { RelativeWishlistScreen } from '../features/relative-wishlist/RelativeWishlistScreen';
import { AppShell, type MainTab } from '../features/shell/AppShell';
import { Button } from '../ui/components/Button';
import { NoticeBanner } from '../ui/components/NoticeBanner';
import { SkeletonList } from '../ui/components/SkeletonList';
import { HollyEmblem } from '../ui/icons/HollyEmblem';
import { useAppRouter } from './router';

interface AuthenticatedWorkspaceProps {
  onSignOut: () => Promise<void>;
}

function AuthenticatedWorkspace({ onSignOut }: AuthenticatedWorkspaceProps) {
  const { wishlist, isPreviewMode, previewRouteHint } = useServices();
  const { route, navigate } = useAppRouter(previewRouteHint);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  const familyQuery = useSynchronizedResource(
    useCallback(() => wishlist.getFamily(), [wishlist]),
    'family',
    { enabled: true }
  );

  const familyData = familyQuery.data;
  const familyId = familyData?.family.id ?? null;
  const viewerId = familyData?.viewer.memberId ?? null;
  const isOrganizer = Boolean(familyData?.viewer.isOrganizer);
  const relativeMemberId = route.screen === 'relative' ? route.memberId : null;

  const myPicksQuery = useSynchronizedResource(
    useCallback(() => wishlist.getMyPicks(), [wishlist]),
    `my-picks:${viewerId ?? 'none'}`,
    { enabled: viewerId !== null }
  );

  const myWishlistQuery = useSynchronizedResource(
    useCallback(async () => {
      if (!viewerId) {
        throw new Error('Missing viewer member ID');
      }
      return wishlist.getWishlist(viewerId);
    }, [viewerId, wishlist]),
    `my-wishlist:${viewerId ?? 'none'}`,
    { enabled: viewerId !== null }
  );

  const relativeWishlistQuery = useSynchronizedResource(
    useCallback(async () => {
      if (!relativeMemberId) {
        throw new Error('Missing relative member ID');
      }
      return wishlist.getWishlist(relativeMemberId);
    }, [relativeMemberId, wishlist]),
    `relative-wishlist:${relativeMemberId ?? 'none'}`,
    { enabled: relativeMemberId !== null }
  );

  useFamilyRealtime(familyId, {
    onSync: (batch) => {
      void familyQuery.refreshNow();
      if (viewerId !== null) {
        if (batch.hasWishlistEvent || batch.wildcard) {
          void myPicksQuery.refreshNow();
        }
        if (batch.wildcard || batch.memberIds.has(viewerId)) {
          void myWishlistQuery.refreshNow();
        }
      }
      if (relativeMemberId !== null && (batch.wildcard || batch.memberIds.has(relativeMemberId))) {
        void relativeWishlistQuery.refreshNow();
      }
    },
    onReconnect: () => {
      void familyQuery.refreshNow();
      if (viewerId !== null) {
        void Promise.all([myPicksQuery.refreshNow(), myWishlistQuery.refreshNow()]);
      }
      if (relativeMemberId !== null) {
        void relativeWishlistQuery.refreshNow();
      }
    },
  });

  const handleSignOut = async () => {
    navigate({ screen: 'family' });
    await onSignOut();
  };

  if (familyQuery.error?.code === 'ACCESS_DENIED') {
    return (
      <main className="app-page">
        <div className="app-column">
          <div className="surface-card section-stack">
            <HollyEmblem size={42} backdrop="peach" />
            <h1 className="section-heading">Account not found on family roster</h1>
            <NoticeBanner tone="error" message={familyQuery.error.message} />
            <div>
              <Button onClick={() => void handleSignOut()} data-primary-action>
                Sign out and try another username
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const activeTab: MainTab =
    route.screen === 'picks'
      ? 'picks'
      : route.screen === 'my-wishlist' ||
          route.screen === 'add-gift' ||
          route.screen === 'edit-gift'
        ? 'my-wishlist'
        : 'family';

  const handleTabSelect = (tab: MainTab) => {
    setFlashMessage(null);
    if (tab === 'family') {
      navigate({ screen: 'family' });
    } else if (tab === 'picks') {
      navigate({ screen: 'picks' });
    } else {
      navigate({ screen: 'my-wishlist' });
    }
  };

  if (familyQuery.isLoading && !familyData) {
    return (
      <main className="app-page">
        <div className="app-column">
          <SkeletonList rows={4} label="Loading your family wishlist" />
        </div>
      </main>
    );
  }

  const familyName = familyData?.family.name ?? 'Family Christmas Wishlist';
  const viewerName = familyData?.viewer.displayName ?? 'Family member';
  const pickCount = myPicksQuery.data
    ? myPicksQuery.data.length
    : (familyData?.viewer.pickCount ?? 0);

  const editingGift =
    route.screen === 'edit-gift'
      ? myWishlistQuery.data?.gifts.find((g) => g.id === route.giftId) ?? null
      : null;

  const reconcileGiftPicked = (gift: GiftItem, pickId: string) => {
    const recipientId = relativeWishlistQuery.data?.memberId ?? relativeMemberId;
    if (!recipientId) return;

    const recipientName =
      relativeWishlistQuery.data?.displayName ??
      familyData?.relatives.find((r) => r.memberId === recipientId)?.displayName ??
      'Relative';

    relativeWishlistQuery.mutateData((prev) => {
      if (!prev || prev.memberId !== recipientId) return prev;
      return {
        ...prev,
        viewerPickedGiftId: gift.id,
        gifts: prev.gifts.map((item) =>
          item.id === gift.id
            ? { ...item, status: 'picked_by_you', canPick: false, pickId }
            : { ...item, canPick: false }
        ),
      };
    });

    familyQuery.mutateData((prev) => {
      if (!prev) return prev;
      const alreadyMarked = prev.relatives.some(
        (r) => r.memberId === recipientId && r.pickedByViewer
      );
      return {
        ...prev,
        viewer: {
          ...prev.viewer,
          pickCount: alreadyMarked ? prev.viewer.pickCount : prev.viewer.pickCount + 1,
        },
        relatives: prev.relatives.map((r) =>
          r.memberId === recipientId ? { ...r, pickedByViewer: true } : r
        ),
      };
    });

    myPicksQuery.mutateData((prev) => {
      if (!prev) return prev;
      const nextItem: PickedGiftSummary = {
        pickId,
        pickedAt: new Date().toISOString(),
        recipientMemberId: recipientId,
        recipientDisplayName: recipientName,
        giftId: gift.id,
        giftName: gift.name,
        giftNote: gift.note,
        storeUrl: gift.storeUrl,
      };
      const filtered = prev.filter(
        (p) => p.pickId !== pickId && p.recipientMemberId !== recipientId
      );
      return [...filtered, nextItem].sort((a, b) =>
        a.recipientDisplayName.localeCompare(b.recipientDisplayName)
      );
    });
  };

  const reconcileGiftUndone = (recipientId: string, giftId: string, pickId?: string) => {
    relativeWishlistQuery.mutateData((prev) => {
      if (!prev || prev.memberId !== recipientId) return prev;
      return {
        ...prev,
        viewerPickedGiftId: null,
        gifts: prev.gifts.map((item) =>
          item.id === giftId
            ? { ...item, status: 'available', canPick: !prev.isOwnWishlist, pickId: null }
            : { ...item, canPick: !prev.isOwnWishlist && item.status === 'available' }
        ),
      };
    });

    familyQuery.mutateData((prev) => {
      if (!prev) return prev;
      const wasMarked = prev.relatives.some(
        (r) => r.memberId === recipientId && r.pickedByViewer
      );
      return {
        ...prev,
        viewer: {
          ...prev.viewer,
          pickCount: wasMarked ? Math.max(0, prev.viewer.pickCount - 1) : prev.viewer.pickCount,
        },
        relatives: prev.relatives.map((r) =>
          r.memberId === recipientId ? { ...r, pickedByViewer: false } : r
        ),
      };
    });

    myPicksQuery.mutateData((prev) => {
      if (!prev) return prev;
      return prev.filter(
        (p) =>
          (pickId ? p.pickId !== pickId : true) &&
          p.giftId !== giftId &&
          p.recipientMemberId !== recipientId
      );
    });
  };

  const reconcileOwnGiftSaved = (savedGift: GiftItem, isEditing: boolean) => {
    myWishlistQuery.mutateData((prev) => {
      if (!prev) return prev;
      const exists = prev.gifts.some((g) => g.id === savedGift.id);
      const nextGifts =
        isEditing || exists
          ? prev.gifts.map((g) => (g.id === savedGift.id ? savedGift : g))
          : [...prev.gifts, savedGift];
      return {
        ...prev,
        gifts: nextGifts,
      };
    });

    if (!isEditing) {
      familyQuery.mutateData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          viewer: {
            ...prev.viewer,
            giftCount: prev.viewer.giftCount + 1,
          },
        };
      });
    }
  };

  const reconcileOwnGiftRemoved = (giftId: string) => {
    myWishlistQuery.mutateData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        gifts: prev.gifts.filter((g) => g.id !== giftId),
      };
    });

    familyQuery.mutateData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        viewer: {
          ...prev.viewer,
          giftCount: Math.max(0, prev.viewer.giftCount - 1),
        },
      };
    });
  };

  return (
    <AppShell
      familyName={familyName}
      viewerName={viewerName}
      pickCount={pickCount}
      activeTab={activeTab}
      onSelectTab={handleTabSelect}
      onSignOut={() => void handleSignOut()}
      isPreviewMode={isPreviewMode}
    >
      {route.screen === 'family' ? (
        <FamilyScreen
          relatives={familyData?.relatives ?? null}
          isLoading={familyQuery.isLoading}
          isRefreshing={familyQuery.isRefreshing}
          error={familyQuery.error}
          isStaleOffline={familyQuery.isStaleOffline}
          isOrganizer={isOrganizer}
          onRefresh={() => void familyQuery.refreshNow()}
          onManageFamily={() => navigate({ screen: 'manage-family' })}
          onSelectRelative={(memberId) => navigate({ screen: 'relative', memberId })}
          onGoToMyWishlist={() => navigate({ screen: 'my-wishlist' })}
        />
      ) : null}

      {route.screen === 'picks' ? (
        <GiftsPickedScreen
          picks={myPicksQuery.data}
          isLoading={myPicksQuery.isLoading}
          isRefreshing={myPicksQuery.isRefreshing}
          error={myPicksQuery.error}
          isStaleOffline={myPicksQuery.isStaleOffline}
          onRefresh={async () => {
            await Promise.all([myPicksQuery.refreshNow(), familyQuery.refreshNow()]);
          }}
          onBrowseFamily={() => navigate({ screen: 'family' })}
          onOpenRelative={(memberId) => navigate({ screen: 'relative', memberId })}
          onPickUndone={(pick) => {
            reconcileGiftUndone(pick.recipientMemberId, pick.giftId, pick.pickId);
          }}
        />
      ) : null}

      {route.screen === 'manage-family' ? (
        isOrganizer ? (
          <ManageFamilyScreen
            onBack={() => navigate({ screen: 'family' })}
            onMembersChanged={() => familyQuery.refreshNow()}
          />
        ) : (
          <NoticeBanner
            tone="error"
            message="Only the family organizer can manage family accounts."
            action={
              <Button variant="secondary" compact onClick={() => navigate({ screen: 'family' })}>
                Back to Family
              </Button>
            }
          />
        )
      ) : null}

      {route.screen === 'relative' ? (
        <RelativeWishlistScreen
          wishlist={relativeWishlistQuery.data}
          isLoading={relativeWishlistQuery.isLoading}
          isRefreshing={relativeWishlistQuery.isRefreshing}
          error={relativeWishlistQuery.error}
          isStaleOffline={relativeWishlistQuery.isStaleOffline}
          onRefresh={async () => {
            await Promise.all([
              relativeWishlistQuery.refreshNow(),
              myPicksQuery.refreshNow(),
              familyQuery.refreshNow(),
            ]);
          }}
          onBackToFamily={() => navigate({ screen: 'family' })}
          onGiftPicked={reconcileGiftPicked}
          onGiftUndone={(gift) => {
            if (relativeMemberId) {
              reconcileGiftUndone(relativeMemberId, gift.id, gift.pickId ?? undefined);
            }
          }}
        />
      ) : null}

      {route.screen === 'my-wishlist' ? (
        <MyWishlistScreen
          wishlist={myWishlistQuery.data}
          isLoading={myWishlistQuery.isLoading}
          error={myWishlistQuery.error}
          isStaleOffline={myWishlistQuery.isStaleOffline}
          flashMessage={flashMessage}
          onDismissFlash={() => setFlashMessage(null)}
          onRefresh={async () => {
            await Promise.all([myWishlistQuery.refreshNow(), familyQuery.refreshNow()]);
          }}
          onAddGift={() => {
            setFlashMessage(null);
            navigate({ screen: 'add-gift' });
          }}
          onEditGift={(gift) => {
            setFlashMessage(null);
            navigate({ screen: 'edit-gift', giftId: gift.id });
          }}
          onGiftRemoved={reconcileOwnGiftRemoved}
        />
      ) : null}

      {route.screen === 'add-gift' || route.screen === 'edit-gift' ? (
        route.screen === 'edit-gift' && !editingGift ? (
          myWishlistQuery.isLoading ? (
            <SkeletonList rows={2} label="Loading gift details" />
          ) : (
            <NoticeBanner
              tone="error"
              message="That gift could not be edited—it may have been picked or removed."
              action={
                <Button
                  variant="secondary"
                  compact
                  onClick={() => navigate({ screen: 'my-wishlist' })}
                >
                  Back to My Wishlist
                </Button>
              }
            />
          )
        ) : (
          <GiftFormScreen
            existingGift={editingGift}
            onSaved={(message, savedGift) => {
              reconcileOwnGiftSaved(savedGift, route.screen === 'edit-gift');
              setFlashMessage(message);
              navigate({ screen: 'my-wishlist' });
              void Promise.all([myWishlistQuery.refreshNow(), familyQuery.refreshNow()]);
            }}
            onCancel={() => navigate({ screen: 'my-wishlist' })}
          />
        )
      ) : null}
    </AppShell>
  );
}

function AppRoot() {
  const session = useAuthSession();

  if (session.phase === 'initializing') {
    return (
      <main className="app-page">
        <div className="app-column">
          <SkeletonList rows={3} label="Checking sign-in status" />
        </div>
      </main>
    );
  }

  if (session.phase === 'signed_out') {
    return <SignInScreen initialError={session.error?.message ?? null} />;
  }

  return <AuthenticatedWorkspace onSignOut={session.signOut} />;
}

interface AppErrorBoundaryState {
  readonly error: Error | null;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Error is rendered cleanly in the fallback UI below.
  }

  override render() {
    if (this.state.error) {
      return (
        <main className="app-page">
          <div className="app-column">
            <div className="surface-card section-stack">
              <HollyEmblem size={42} backdrop="peach" />
              <h1 className="section-heading">Unable to start Family Christmas Wishlist</h1>
              <NoticeBanner tone="error" message={this.state.error.message} />
              <div>
                <Button onClick={() => window.location.reload()} data-primary-action>
                  Reload page
                </Button>
              </div>
            </div>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

interface AppProps {
  services: AppServices;
}

export function App({ services }: AppProps) {
  return (
    <AppErrorBoundary>
      <ServiceProvider value={services}>
        <AppRoot />
      </ServiceProvider>
    </AppErrorBoundary>
  );
}
