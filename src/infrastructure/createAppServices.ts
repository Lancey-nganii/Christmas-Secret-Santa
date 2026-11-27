import { Capacitor } from '@capacitor/core';
import type { AppServices } from '../domain/ports';
import { createPreviewServices } from './devPreview/previewServices';
import {
  BrowserExternalLinkAdapter,
  CapacitorExternalLinkAdapter,
} from './platform/externalLinks';
import {
  BrowserLifecycleAdapter,
  CapacitorLifecycleAdapter,
} from './platform/lifecycle';
import { SupabaseAuthGateway } from './supabase/authGateway';
import { SupabaseMemberManagementGateway } from './supabase/memberManagementGateway';
import { SupabaseRealtimeGateway } from './supabase/realtimeGateway';
import { SupabaseWishlistGateway } from './supabase/wishlistGateway';

export function createAppServices(): AppServices {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const previewMode = new URLSearchParams(window.location.search).get('preview');
    if (previewMode !== null) {
      return createPreviewServices(previewMode);
    }
  }

  const isNative = Capacitor.isNativePlatform();

  return {
    auth: new SupabaseAuthGateway(),
    wishlist: new SupabaseWishlistGateway(),
    members: new SupabaseMemberManagementGateway(),
    realtime: new SupabaseRealtimeGateway(),
    lifecycle: isNative ? new CapacitorLifecycleAdapter() : new BrowserLifecycleAdapter(),
    externalLinks: isNative
      ? new CapacitorExternalLinkAdapter()
      : new BrowserExternalLinkAdapter(),
    isPreviewMode: false,
  };
}
