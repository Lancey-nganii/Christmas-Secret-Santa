import { Component, useCallback, useState, type ErrorInfo, type ReactNode } from 'react';
import { ServiceProvider, useServices } from '../application/ServiceContext';
import { useAuthSession } from '../application/useAuthSession';
import { useSynchronizedResource } from '../application/useSynchronizedResource';
import type { AppServices } from '../domain/ports';
import { SignInScreen } from '../features/auth/SignInScreen';
import { FamilyScreen } from '../features/family/FamilyScreen';
import { ManageFamilyScreen } from '../features/family/ManageFamilyScreen';
import { GiftFormScreen } from '../features/my-wishlist/GiftFormScreen';
import { MyWishlistScreen } from '../features/my-wishlist/MyWishlistScreen';
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
  const viewerId = familyData?.viewer.memberId ?? null;
  const isOrganizer = Boolean(familyData?.viewer.isOrganizer);

  const targetWishlistMemberId =
    route.screen === 'relative'
      ? route.memberId
      : route.screen === 'my-wishlist' ||
          route.screen === 'add-gift' ||
          route.screen === 'edit-gift'
        ? viewerId
        : null;

  const wishlistQuery = useSynchronizedResource(
    useCallback(async () => {
      if (!targetWishlistMemberId) {
        throw new Error('Missing wishlist member ID');
      }
      return wishlist.getWishlist(targetWishlistMemberId);
    }, [targetWishlistMemberId, wishlist]),
    `wishlist:${targetWishlistMemberId ?? 'none'}`,
    { enabled: targetWishlistMemberId !== null }
  );

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
    route.screen === 'family' ||
    route.screen === 'relative' ||
    route.screen === 'manage-family'
      ? 'family'
      : 'my-wishlist';

  const handleTabSelect = (tab: MainTab) => {
    setFlashMessage(null);
    if (tab === 'family') {
      navigate({ screen: 'family' });
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

  const editingGift =
    route.screen === 'edit-gift'
      ? wishlistQuery.data?.gifts.find((g) => g.id === route.giftId) ?? null
      : null;

  return (
    <AppShell
      familyName={familyName}
      viewerName={viewerName}
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
          wishlist={wishlistQuery.data}
          isLoading={wishlistQuery.isLoading}
          isRefreshing={wishlistQuery.isRefreshing}
          error={wishlistQuery.error}
          isStaleOffline={wishlistQuery.isStaleOffline}
          onRefresh={async () => {
            await Promise.all([wishlistQuery.refreshNow(), familyQuery.refreshNow()]);
          }}
          onBackToFamily={() => navigate({ screen: 'family' })}
        />
      ) : null}

      {route.screen === 'my-wishlist' ? (
        <MyWishlistScreen
          wishlist={wishlistQuery.data}
          isLoading={wishlistQuery.isLoading}
          error={wishlistQuery.error}
          isStaleOffline={wishlistQuery.isStaleOffline}
          flashMessage={flashMessage}
          onDismissFlash={() => setFlashMessage(null)}
          onRefresh={async () => {
            await Promise.all([wishlistQuery.refreshNow(), familyQuery.refreshNow()]);
          }}
          onAddGift={() => {
            setFlashMessage(null);
            navigate({ screen: 'add-gift' });
          }}
          onEditGift={(gift) => {
            setFlashMessage(null);
            navigate({ screen: 'edit-gift', giftId: gift.id });
          }}
        />
      ) : null}

      {route.screen === 'add-gift' || route.screen === 'edit-gift' ? (
        route.screen === 'edit-gift' && !editingGift ? (
          wishlistQuery.isLoading ? (
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
            onSaved={async (message) => {
              setFlashMessage(message);
              navigate({ screen: 'my-wishlist' });
              await Promise.all([wishlistQuery.refreshNow(), familyQuery.refreshNow()]);
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
