export type AnalyticsConfig = {
  gtmContainerId: string;
  posthogProjectApiKey: string;
  posthogApiHost: string;
  redditPixelId?: string;
  // Optional secondary Reddit pixel — e.g. a Reddit Pro / promoted-post pixel
  // tied to a user account (t2_*) running a different campaign type than the
  // primary ad-account pixel (a2_*). Reddit pixel.js multi-init lets both
  // listen to the same `rdt('track', ...)` calls, so conversion events
  // dedup naturally via shared conversionId.
  redditPixelIdSecondary?: string;
  nextdoorPixelId?: string;
};

export const analyticsPlaceholders: AnalyticsConfig = {
  // PRODUCTION: replace before launch
  gtmContainerId: "GTM-XXXXXXX",
  posthogProjectApiKey: "phc_REPLACE_WITH_POSTHOG_PROJECT_KEY",
  posthogApiHost: "https://us.i.posthog.com",
  redditPixelId: "",
  redditPixelIdSecondary: "",
  nextdoorPixelId: "",
};

const normalizeAnalyticsValue = (value: string) => value.trim();

const isConfiguredGtmId = (value: string) => {
  const normalized = normalizeAnalyticsValue(value);
  return /^GTM-[A-Z0-9]+$/i.test(normalized) && normalized !== analyticsPlaceholders.gtmContainerId;
};

const isConfiguredPosthogKey = (value: string) => {
  const normalized = normalizeAnalyticsValue(value);
  return /^phc_[A-Za-z0-9]+$/i.test(normalized) && normalized !== analyticsPlaceholders.posthogProjectApiKey;
};

const isConfiguredPosthogHost = (value: string) => {
  const normalized = normalizeAnalyticsValue(value);
  return /^https?:\/\/[^/\s]+/i.test(normalized);
};

const isConfiguredRedditPixelId = (value: string) => {
  const normalized = normalizeAnalyticsValue(value);
  // a2_* = standard ad-account pixel; t2_* = Reddit account-tied pixel
  // (Reddit Pro / promoted user post). Both run through pixel.js the same way.
  return /^(a2|t2)_[a-z0-9]+$/i.test(normalized);
};

const isConfiguredNextdoorPixelId = (value: string) => {
  const normalized = normalizeAnalyticsValue(value);
  // UUID v4 shape — Nextdoor "Data Source ID"
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized);
};

export const getAnalyticsState = (config: AnalyticsConfig) => {
  const gtmContainerId = normalizeAnalyticsValue(config.gtmContainerId);
  const posthogProjectApiKey = normalizeAnalyticsValue(config.posthogProjectApiKey);
  const posthogApiHost = normalizeAnalyticsValue(config.posthogApiHost);
  const redditPixelId = normalizeAnalyticsValue(config.redditPixelId ?? '');
  const redditPixelIdSecondary = normalizeAnalyticsValue(config.redditPixelIdSecondary ?? '');
  const nextdoorPixelId = normalizeAnalyticsValue(config.nextdoorPixelId ?? '');

  const gtmEnabled = isConfiguredGtmId(gtmContainerId);
  const posthogEnabled =
    isConfiguredPosthogKey(posthogProjectApiKey) && isConfiguredPosthogHost(posthogApiHost);
  const redditPixelEnabled = isConfiguredRedditPixelId(redditPixelId);
  const redditPixelSecondaryEnabled = isConfiguredRedditPixelId(redditPixelIdSecondary);
  const nextdoorPixelEnabled = isConfiguredNextdoorPixelId(nextdoorPixelId);

  return {
    gtmContainerId,
    gtmId: gtmContainerId,
    posthogProjectApiKey,
    posthogKey: posthogProjectApiKey,
    posthogApiHost,
    posthogHost: posthogApiHost,
    redditPixelId,
    redditPixelIdSecondary,
    nextdoorPixelId,
    gtmEnabled,
    posthogEnabled,
    redditPixelEnabled,
    redditPixelSecondaryEnabled,
    nextdoorPixelEnabled,
  };
};
