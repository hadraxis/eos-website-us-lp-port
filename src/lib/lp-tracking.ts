'use client';

import { useEffect, useRef } from 'react';
import { track } from '@/lib/track';
import { isInAppWebView } from '@/lib/ua';

const UTM_KEYS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'gclid', 'fbclid', 'rdt_cid', 'eos_cid', 'ttclid', 'li_fat_id',
] as const;

// Click-ID keys whose presence on landing is sufficient to identify the user.
// Priority order: explicit eos_cid wins, then ad-network IDs.
const CLICK_ID_KEYS = ['eos_cid', 'gclid', 'fbclid', 'rdt_cid', 'ttclid', 'li_fat_id'] as const;

function persistUTMParams() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  UTM_KEYS.forEach((key) => {
    const val = params.get(key);
    if (val) sessionStorage.setItem(key, val);
  });
}

export function getUTMProps(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const props: Record<string, string> = {};
  UTM_KEYS.forEach((key) => {
    const val = params.get(key) || sessionStorage.getItem(key) || '';
    if (val) props[key] = val;
  });
  return props;
}

function getLandingClickId(): { id: string; source: string } | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  for (const key of CLICK_ID_KEYS) {
    const val = params.get(key) || sessionStorage.getItem(key) || '';
    if (val) return { id: val, source: key };
  }
  return null;
}

// JS-set fallback for local dev and the static Hostinger build (BUILD_TARGET=static),
// where edge middleware doesn't run. On Vercel, middleware sets __Host-eos_sid first.
function setSessionCookie(id: string) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  const prefix = secure ? '__Host-' : '';
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${prefix}eos_sid=${encodeURIComponent(id)}; Path=/; Max-Age=${oneYear}; SameSite=Lax${secure}`;
}

interface FiredFlags {
  view: boolean;
  scroll25: boolean;
  scroll50: boolean;
  scroll75: boolean;
  scroll90: boolean;
  scroll100: boolean;
  engaged30: boolean;
  engaged45: boolean;
  engaged60: boolean;
  engaged120: boolean;
  engaged180: boolean;
}

// PostHog feature flag name for LP section-order variant testing. Value
// rides every LP event as `section_order_variant`, so cohort-compare across
// orderings is a flag-filtered query, not a code change. Default 'control'
// if the flag isn't loaded yet or PostHog isn't initialized.
const LP_VARIANT_FLAG = 'lp_section_order';

export function getLPSectionOrderVariant(): string {
  if (typeof window === 'undefined') return 'control';
  const ph = (window as { posthog?: { getFeatureFlag?: (k: string) => string | boolean | undefined } }).posthog;
  if (!ph?.getFeatureFlag) return 'control';
  const v = ph.getFeatureFlag(LP_VARIANT_FLAG);
  return typeof v === 'string' ? v : 'control';
}

// Per-section dwell accumulator. IntersectionObserver fires enter / exit on
// the same data-section element; we accumulate visible time and view count
// per section, then dump the whole map into `lp_journey` on lp_exit.
type SectionDwell = {
  sectionId: string;
  viewCount: number;     // how many times the section came into view
  dwellMs: number;       // total visible time across all entries
  firstSeenAt: number;   // ms timestamp, useful for sequence reconstruction
};
type SectionDwellMap = Record<string, SectionDwell>;

export function useLPTracking(angle: string) {
  const firedRef = useRef<FiredFlags>({
    view: false,
    scroll25: false,
    scroll50: false,
    scroll75: false,
    scroll90: false,
    scroll100: false,
    engaged30: false,
    engaged45: false,
    engaged60: false,
    engaged120: false,
    engaged180: false,
  });

  // Section dwell accumulator — populated by useSectionDwellTracking, read
  // here on lp_exit to emit the lp_journey summary event.
  const dwellMapRef = useRef<SectionDwellMap>({});

  // lp_view + UTM persistence + click-ID identity
  useEffect(() => {
    if (firedRef.current.view) return;
    firedRef.current.view = true;
    persistUTMParams();
    const utm = getUTMProps();
    const click = getLandingClickId();
    const inApp = isInAppWebView();
    const variant = getLPSectionOrderVariant();

    track('lp_view', {
      angle,
      section_order_variant: variant,
      ...utm,
      ...(click ? { click_id: click.id, click_id_source: click.source } : {}),
      in_app_webview: inApp,
    });

    // Identity passthrough — alias the anonymous PostHog ID to the click_id
    // so server-side ad conversions can be reconciled across the Safari hop.
    if (click) {
      sessionStorage.setItem('eos_sid', click.id);
      setSessionCookie(click.id);
    }

    if (typeof window !== 'undefined' && (window as any).posthog) {
      const ph = (window as any).posthog;
      ph.setPersonPropertiesForFlags({
        landing_page_angle: angle,
        first_utm_source: utm.utm_source || '',
        first_utm_campaign: utm.utm_campaign || '',
        in_app_webview: inApp,
      });
      if (click) {
        ph.identify(click.id, { click_id_source: click.source, first_angle: angle });
      }
      ph.people?.set?.({ in_app_webview: inApp });
    }
  }, [angle]);

  // Time-on-page milestones — 30s, 45s, 60s, 120s, 180s
  useEffect(() => {
    const timers: number[] = [];
    const fire = (key: keyof FiredFlags, event: string) => () => {
      if (firedRef.current[key]) return;
      firedRef.current[key] = true;
      track(event, { angle });
    };
    timers.push(window.setTimeout(fire('engaged30', 'lp_engaged_30s'), 30000));
    timers.push(window.setTimeout(fire('engaged45', 'lp_engaged_45s'), 45000));
    timers.push(window.setTimeout(fire('engaged60', 'lp_engaged_60s'), 60000));
    timers.push(window.setTimeout(fire('engaged120', 'lp_engaged_120s'), 120000));
    timers.push(window.setTimeout(fire('engaged180', 'lp_engaged_180s'), 180000));
    return () => timers.forEach((t) => clearTimeout(t));
  }, [angle]);

  // Scroll depth — 25, 50, 75, 90, 100
  useEffect(() => {
    function onScroll() {
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return;
      const scrollPct = window.scrollY / maxScroll;
      const fire = (key: keyof FiredFlags, event: string) => {
        if (firedRef.current[key]) return;
        firedRef.current[key] = true;
        track(event, { angle, scroll_pct: Math.round(scrollPct * 100) });
      };
      if (scrollPct >= 0.25) fire('scroll25', 'lp_scroll_25');
      if (scrollPct >= 0.5) fire('scroll50', 'lp_scroll_50');
      if (scrollPct >= 0.75) fire('scroll75', 'lp_scroll_75');
      if (scrollPct >= 0.9) fire('scroll90', 'lp_scroll_90');
      if (scrollPct >= 0.99) fire('scroll100', 'lp_scroll_100');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [angle]);

  // Page-exit beacon — captures partial sessions. Uses sendBeacon transport
  // because Safari can suspend the tab on visibility=hidden before the
  // default XHR queue flushes; pagehide is the harder backstop because iOS
  // sometimes skips visibilitychange when the back-swipe completes.
  useEffect(() => {
    let exited = false;
    const fireExit = () => {
      if (exited) return;
      exited = true;
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      const scrollPct = maxScroll > 0 ? Math.round((window.scrollY / maxScroll) * 100) : 0;
      const variant = getLPSectionOrderVariant();
      track('lp_exit', { angle, section_order_variant: variant, max_scroll_pct: scrollPct }, { transport: 'sendBeacon' });
      // lp_journey — full per-section dwell summary. Lets PostHog cohort
      // queries compare section orderings (variant A vs B) on total time
      // spent per section, view counts, and first-touch sequence. Sections
      // never seen are absent from the array (vs zero-dwell entries) so
      // ordering experiments can detect "section never reached" as a signal.
      const sections = Object.values(dwellMapRef.current)
        .sort((a, b) => a.firstSeenAt - b.firstSeenAt)
        .map((d) => ({
          section_id: d.sectionId,
          view_count: d.viewCount,
          dwell_ms: Math.round(d.dwellMs),
        }));
      if (sections.length > 0) {
        track(
          'lp_journey',
          {
            angle,
            section_order_variant: variant,
            sections,
            sections_viewed: sections.length,
            total_dwell_ms: sections.reduce((sum, s) => sum + s.dwell_ms, 0),
            max_scroll_pct: scrollPct,
          },
          { transport: 'sendBeacon' },
        );
      }
      // Also nudge the global scroll summary flush in analytics-runtime.js
      // so the two beacons piggy-back on the same hidden-cycle.
      (window as any).eosAnalytics?.flushScrollSummary?.();
    };
    const onHidden = () => { if (document.visibilityState === 'hidden') fireExit(); };
    const onPageHide = () => fireExit();
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [angle]);

  // Expose the dwell ref so a sibling hook can populate it. Returning it
  // (vs adding another hook param) keeps the existing useLPTracking(angle)
  // call sites unchanged — the LP component decides whether to wire dwell.
  return { dwellMapRef };
}

// Section dwell tracker — pairs IntersectionObserver enter/exit on
// data-section elements with the dwell accumulator in useLPTracking.
// Call AFTER useLPTracking so the ref exists, passing its dwellMapRef
// back in. Fires `lp_section_view` on each enter (matching previous
// behavior) plus accumulates visible time per section for lp_journey.
export function useSectionDwellTracking(
  angle: string,
  dwellMapRef: { current: SectionDwellMap },
) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const enteredAt = new Map<string, number>();
    const variant = getLPSectionOrderVariant();

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.section;
          if (!id) return;
          if (entry.isIntersecting) {
            // Enter — fire lp_section_view on first view, start dwell timer
            if (!dwellMapRef.current[id]) {
              dwellMapRef.current[id] = {
                sectionId: id,
                viewCount: 0,
                dwellMs: 0,
                firstSeenAt: Date.now(),
              };
              track('lp_section_view', { angle, section_id: id, section_order_variant: variant });
            }
            if (!enteredAt.has(id)) {
              enteredAt.set(id, Date.now());
              dwellMapRef.current[id].viewCount += 1;
            }
          } else {
            // Exit — accumulate the dwell delta
            const start = enteredAt.get(id);
            if (start !== undefined) {
              dwellMapRef.current[id].dwellMs += Date.now() - start;
              enteredAt.delete(id);
            }
          }
        });
      },
      { threshold: 0.25 },
    );
    document.querySelectorAll<HTMLElement>('[data-section]').forEach((el) => obs.observe(el));

    // On pagehide / hidden, force-close any open dwell intervals so the
    // accumulator is accurate when lp_exit reads it.
    const closeOpen = () => {
      const now = Date.now();
      enteredAt.forEach((start, id) => {
        if (dwellMapRef.current[id]) {
          dwellMapRef.current[id].dwellMs += now - start;
        }
      });
      enteredAt.clear();
    };
    const onHidden = () => { if (document.visibilityState === 'hidden') closeOpen(); };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', closeOpen);

    return () => {
      closeOpen();
      obs.disconnect();
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', closeOpen);
    };
  }, [angle, dwellMapRef]);
}

// bfcache resume — Safari/Firefox restore the React tree without re-running
// useEffect, so lp_view under-reports back-navigators. Fire lp_resumed when
// pageshow.persisted is true so PostHog can stitch the second session leg.
// Exported as a stand-alone hook so callers can opt in or out.
export function useLPBfcacheResume(angle: string) {
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (!event.persisted) return;
      const variant = getLPSectionOrderVariant();
      track('lp_resumed', { angle, section_order_variant: variant });
    }
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [angle]);
}

/** Build the estimate URL with angle + UTM passthrough */
export function buildEstimateURL(angle: string): string {
  const params = new URLSearchParams();
  params.set('angle', angle);
  if (typeof window !== 'undefined') {
    UTM_KEYS.forEach((key) => {
      const val = new URLSearchParams(window.location.search).get(key) || sessionStorage.getItem(key) || '';
      if (val) params.set(key, val);
    });
  }
  return `/estimate?${params.toString()}`;
}
