import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { ReactNode } from 'react';

export type NoticeTone = 'info' | 'success' | 'error';

interface NoticeBannerProps {
  tone: NoticeTone;
  title?: string;
  message: string;
  action?: ReactNode;
}

export function NoticeBanner({ tone, title, message, action }: NoticeBannerProps) {
  const Icon = tone === 'error' ? AlertCircle : tone === 'success' ? CheckCircle2 : Info;
  const role = tone === 'error' ? 'alert' : 'status';

  return (
    <div className={`notice-banner notice-banner--${tone}`} role={role}>
      <div className="notice-banner-body">
        <Icon size={18} strokeWidth={2} className="notice-banner-icon" aria-hidden="true" />
        <div className="notice-banner-text">
          {title ? <span className="notice-banner-title">{title}</span> : null}
          <span>{message}</span>
        </div>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
