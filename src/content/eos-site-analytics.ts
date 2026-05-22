/**
 * eos-site-analytics.ts — prod-scoped analytics config shim for AnalyticsProvider.
 *
 * Purpose: AnalyticsProvider.tsx imports `eosSite.analytics` and uses
 * getAnalyticsState() to compute *Enabled flags. This shim provides the
 * same shape but tuned for prod:
 *
 * - gtmContainerId + redditPixelId are INTENTIONALLY EMPTY so that
 *   getAnalyticsState() returns gtmEnabled: false / redditPixelEnabled: false.
 *   That means AnalyticsProvider's conditional GTM block and primary Reddit
 *   block render NOTHING. Prod's existing src/components/GTMLoader.tsx and
 *   src/components/RedditPixel.tsx remain the sole initializers for those
 *   trackers — zero double-init risk.
 *
 * - posthog + nextdoor pull from env vars. Missing env → blank values →
 *   *Enabled returns false → those script blocks also render nothing.
 *   Tracker stays inert until the prod team adds the vars in Vercel.
 *
 * - This file is the ONLY thing AnalyticsProvider imports from @/content/.
 *   The sandbox repo has a much larger eos-site.ts; this shim avoids
 *   contaminating prod with sandbox-specific marketing config.
 */

export const eosSite = {
  analytics: {
    // Gated OFF — prod's GTMLoader.tsx handles GTM-TQV5KW2K
    gtmContainerId: '',

    // Gated OFF — prod's RedditPixel.tsx handles a2_izohry8y9k7k
    redditPixelId: '',
    redditPixelIdSecondary: '',

    // Active when env vars are set in Vercel project settings
    posthogProjectApiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '',
    posthogApiHost: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    nextdoorPixelId: process.env.NEXT_PUBLIC_NEXTDOOR_PIXEL_ID ?? '',
  },
};
