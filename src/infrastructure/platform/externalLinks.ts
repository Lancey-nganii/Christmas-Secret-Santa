import { Browser } from '@capacitor/browser';
import type { ExternalLinkPort } from '../../domain/ports';

function parseHttpUrl(url: string): URL | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export class BrowserExternalLinkAdapter implements ExternalLinkPort {
  openUrl(url: string): void {
    const parsed = parseHttpUrl(url);
    if (!parsed) return;
    window.open(parsed.toString(), '_blank', 'noopener,noreferrer');
  }
}

export class CapacitorExternalLinkAdapter implements ExternalLinkPort {
  openUrl(url: string): void {
    const parsed = parseHttpUrl(url);
    if (!parsed) return;

    void Browser.open({
      url: parsed.toString(),
      toolbarColor: '#FFDEC3',
    }).catch(() => {
      window.open(parsed.toString(), '_blank', 'noopener,noreferrer');
    });
  }
}
