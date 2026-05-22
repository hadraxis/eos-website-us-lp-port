// PostHog capture options pass-through. Exit-time events should use
// `{ transport: 'sendBeacon' }` so Safari's visibility=hidden tab-suspend
// doesn't drop them before the XHR queue flushes.
type TrackOpts = { transport?: 'sendBeacon' | 'XHR' | 'fetch'; send_instantly?: boolean };

export function track(event: string, props: Record<string, unknown> = {}, opts?: TrackOpts) {
  if (typeof window === 'undefined') return;
  (window as any).posthog?.capture?.(event, props, opts);
  (window as any).dataLayer?.push({ event, ...props });
}

// Reddit Pixel conversion event. `conversionId` MUST be the same string that
// the server-side CAPI fan-out attaches to its event, so Reddit dedups the
// pixel hit and the CAPI hit into one conversion. Standard event names:
// 'Lead', 'SignUp', 'Purchase', 'AddToCart', 'ViewContent', 'Search'.
export function trackReddit(
  event: string,
  conversionId: string,
  props: Record<string, unknown> = {}
) {
  if (typeof window === 'undefined') return;
  const rdt = (window as any).rdt;
  if (typeof rdt !== 'function') return;
  rdt('track', event, { conversionId, ...props });
}

// Nextdoor Pixel conversion event. `conversionId` rides on the `order_id`
// field, which is Nextdoor's canonical dedup key when the same conversion
// also fires server-side. Standard event names: 'PAGE_VIEW', 'CONVERSION',
// 'LEAD', 'ADD_TO_CART', 'COMPLETE_REGISTRATION', 'INITIATE_CHECKOUT'.
export function trackNextdoor(
  event: string,
  conversionId: string,
  props: Record<string, unknown> = {}
) {
  if (typeof window === 'undefined') return;
  const ndp = (window as any).ndp;
  if (typeof ndp !== 'function') return;
  ndp('track', event, { order_id: conversionId, ...props });
}

// Advanced matching — re-init each pixel with identity (email/phone/external_id)
// once the visitor identifies via qualify or callback submit. Reddit + Nextdoor
// pixel.js both hash these client-side before send, so we pass raw values.
//
// Effect: every subsequent pixel event (Lead, CONVERSION, future PageVisits in
// the same session) carries identity match keys alongside the click_id. Match
// quality jumps from click_id-only → click_id + identity, lowering CPA and
// catching conversions when the ad-click cookie has expired.
//
// Safe to call multiple times (re-init updates the matching params; events
// already fired keep their original payload, future events pick up the
// new identity).
export type AdvancedMatchingIdentity = {
  email?: string;
  phone?: string;       // E.164 preferred
  externalId?: string;  // CRM person_id or stable user id
};

export function setRedditAdvancedMatching(
  identity: AdvancedMatchingIdentity,
  pixelIds: string[]
) {
  if (typeof window === 'undefined') return;
  const rdt = (window as any).rdt;
  if (typeof rdt !== 'function' || pixelIds.length === 0) return;
  const params: Record<string, string> = {};
  if (identity.email) params.email = identity.email.trim().toLowerCase();
  if (identity.phone) params.phoneNumber = identity.phone;
  if (identity.externalId) params.externalId = identity.externalId;
  if (Object.keys(params).length === 0) return;
  for (const id of pixelIds) {
    rdt('init', id, params);
  }
}

export function setNextdoorAdvancedMatching(
  identity: AdvancedMatchingIdentity,
  pixelId: string
) {
  if (typeof window === 'undefined') return;
  const ndp = (window as any).ndp;
  if (typeof ndp !== 'function' || !pixelId) return;
  const params: Record<string, string> = {};
  if (identity.email) params.email = identity.email.trim().toLowerCase();
  if (identity.phone) params.phone_number = identity.phone;
  if (identity.externalId) params.external_id = identity.externalId;
  if (Object.keys(params).length === 0) return;
  ndp('init', pixelId, params);
}
