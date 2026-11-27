import { Gift, LogOut, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../../ui/components/Button';
import { HollyEmblem } from '../../ui/icons/HollyEmblem';

export type MainTab = 'family' | 'my-wishlist';

interface AppShellProps {
  familyName: string;
  viewerName: string;
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  onSignOut: () => void;
  isPreviewMode: boolean;
  children: ReactNode;
}

export function AppShell({
  familyName,
  viewerName,
  activeTab,
  onSelectTab,
  onSignOut,
  isPreviewMode,
  children,
}: AppShellProps) {
  return (
    <div className="app-page">
      <div className="app-column" data-surface-thesis>
        {isPreviewMode ? (
          <div className="preview-bar" role="status">
            <span>Sample preview — The Rivera Family (demo data)</span>
          </div>
        ) : null}

        <header className="app-header">
          <div className="app-header-top">
            <div className="brand-lockup">
              <HollyEmblem size={42} />
              <div>
                <h1 className="brand-title">{familyName}</h1>
                <p className="brand-subtitle">Signed in as {viewerName}</p>
              </div>
            </div>

            <div className="header-actions">
              <Button variant="ghost" compact onClick={onSignOut}>
                <LogOut size={16} strokeWidth={2} aria-hidden="true" />
                <span>Sign out</span>
              </Button>
            </div>
          </div>

          <nav className="tab-bar" aria-label="Wishlist sections">
            <button
              type="button"
              aria-current={activeTab === 'family' ? 'page' : undefined}
              className="tab-button"
              onClick={() => onSelectTab('family')}
            >
              <Users size={18} strokeWidth={2} aria-hidden="true" />
              <span>Family</span>
            </button>
            <button
              type="button"
              aria-current={activeTab === 'my-wishlist' ? 'page' : undefined}
              className="tab-button"
              onClick={() => onSelectTab('my-wishlist')}
            >
              <Gift size={18} strokeWidth={2} aria-hidden="true" />
              <span>My Wishlist</span>
            </button>
          </nav>
        </header>

        <main key={activeTab} className="section-stack surface-reveal">
          {children}
        </main>
      </div>
    </div>
  );
}
