import { Suspense } from 'react';
import { AnalyticsProvider } from '@/components/analytics/AnalyticsProvider';
import './lp.css';

/**
 * (lp)/layout.tsx — scoped layout for ad-destination landing pages.
 *
 * Route group `(lp)` is folder-syntax only — it does NOT affect URLs.
 * Final URLs are still /lightning-backup and /before-the-generator.
 *
 * This layout mounts AnalyticsProvider so PostHog + Nextdoor pixel +
 * analytics-runtime.js initialize ONLY when an LP route renders. The prod
 * team's existing pages (/, /blog, /get-started, /residential-c, etc.)
 * never trigger this layout, so those trackers don't load on them.
 *
 * If/when the prod team merges PR2, AnalyticsProvider gets lifted into
 * the root layout for sitewide coverage. This LP-scoped mount becomes
 * harmless (Next.js de-dupes the Script tags by id).
 *
 * Nav/footer hidden via the LPs themselves (full-bleed components) and
 * defensively via AppShell.tsx's NO_NAV_FOOTER array.
 */
export default function LPLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lp-scope">
      <Suspense fallback={null}><AnalyticsProvider /></Suspense>
      {children}
    </div>
  );
}
