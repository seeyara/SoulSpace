// Google Analytics utility for event and pageview tracking
import { clientConfig } from '@/lib/config';

export const GA_TRACKING_ID = clientConfig.analytics.gaTrackingId;

// Track a pageview
export function pageview(url: string, referrer?: string) {
  if (typeof window !== 'undefined' && (window as Window & typeof globalThis & { gtag?: (...args: unknown[]) => void }).gtag) {
    (window as Window & typeof globalThis & { gtag?: (...args: unknown[]) => void }).gtag!('event', 'page_view', {
      page_path: url,
      referrer: referrer || document.referrer || undefined,
    });
  }
}

// Track a custom event
export function event({ action, category, label, value }: {
  action: string;
  category?: string;
  label?: string;
  value?: unknown;
}) {
  if (typeof window !== 'undefined' && (window as Window & typeof globalThis & { gtag?: (...args: unknown[]) => void }).gtag) {
    (window as Window & typeof globalThis & { gtag?: (...args: unknown[]) => void }).gtag!('event', action, {
      event_category: category,
      event_label: label,
      value,
    });
  }
} 