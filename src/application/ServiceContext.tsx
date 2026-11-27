import { createContext, useContext } from 'react';
import type { AppServices } from '../domain/ports';

const ServiceContext = createContext<AppServices | null>(null);

export const ServiceProvider = ServiceContext.Provider;

export function useServices(): AppServices {
  const ctx = useContext(ServiceContext);
  if (!ctx) {
    throw new Error('useServices must be used inside a ServiceProvider.');
  }
  return ctx;
}
