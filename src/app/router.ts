import { useCallback, useEffect, useState } from 'react';

export type AppRoute =
  | { readonly screen: 'family' }
  | { readonly screen: 'manage-family' }
  | { readonly screen: 'picks' }
  | { readonly screen: 'relative'; readonly memberId: string }
  | { readonly screen: 'my-wishlist' }
  | { readonly screen: 'add-gift' }
  | { readonly screen: 'edit-gift'; readonly giftId: string };

export function parseRoute(pathname: string): AppRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';

  if (clean === '/picks') {
    return { screen: 'picks' };
  }
  if (clean === '/my-wishlist') {
    return { screen: 'my-wishlist' };
  }
  if (clean === '/my-wishlist/new') {
    return { screen: 'add-gift' };
  }

  const editMatch = /^\/my-wishlist\/([^/]+)\/edit$/.exec(clean);
  if (editMatch?.[1]) {
    return { screen: 'edit-gift', giftId: decodeURIComponent(editMatch[1]) };
  }

  if (clean === '/family/manage') {
    return { screen: 'manage-family' };
  }

  const relativeMatch = /^\/family\/([^/]+)$/.exec(clean);
  if (relativeMatch?.[1]) {
    return { screen: 'relative', memberId: decodeURIComponent(relativeMatch[1]) };
  }

  return { screen: 'family' };
}

export function routeToPath(route: AppRoute): string {
  switch (route.screen) {
    case 'family':
      return '/family';
    case 'manage-family':
      return '/family/manage';
    case 'picks':
      return '/picks';
    case 'relative':
      return `/family/${encodeURIComponent(route.memberId)}`;
    case 'my-wishlist':
      return '/my-wishlist';
    case 'add-gift':
      return '/my-wishlist/new';
    case 'edit-gift':
      return `/my-wishlist/${encodeURIComponent(route.giftId)}/edit`;
  }
}

export function useAppRouter(initialPathOverride?: string | null) {
  const [route, setRoute] = useState<AppRoute>(() => {
    if (initialPathOverride) return parseRoute(initialPathOverride);
    if (typeof window === 'undefined') return { screen: 'family' };
    return parseRoute(window.location.pathname);
  });

  useEffect(() => {
    const handlePop = () => {
      setRoute(parseRoute(window.location.pathname));
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const navigate = useCallback((next: AppRoute) => {
    setRoute(next);
    if (typeof window !== 'undefined') {
      const nextPath = routeToPath(next) + window.location.search;
      if (window.location.pathname + window.location.search !== nextPath) {
        window.history.pushState(null, '', nextPath);
      }
    }
  }, []);

  return { route, navigate };
}
