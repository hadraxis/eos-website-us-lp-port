export type AnalyticsPayload = Record<string, unknown>;

export type AnalyticsConfig = {
  gtmEnabled?: boolean;
  posthogEnabled?: boolean;
};

export type PostHogClient = {
  capture?: (eventName: string, properties?: AnalyticsPayload) => void;
  captureException?: (error: Error, properties?: AnalyticsPayload) => void;
  identify?: (
    distinctId: string,
    setProperties?: AnalyticsPayload,
    setOnceProperties?: AnalyticsPayload
  ) => void;
  get_property?: (property: string) => unknown;
};

export type BrowserAnalytics = {
  version: string;
  track: (eventName: string, properties?: AnalyticsPayload) => AnalyticsPayload;
  pushDataLayerEvent: (eventName: string, properties?: AnalyticsPayload) => AnalyticsPayload;
  identify: (
    distinctId: string,
    setProperties?: AnalyticsPayload,
    setOnceProperties?: AnalyticsPayload
  ) => void;
  trackCtaClick: (target: Element) => boolean;
  initPage: () => void;
  flushScrollSummary: () => void;
};

export type BrowserAnalyticsWindow = BrowserAnalytics & {
  __pageInitialized?: boolean;
  __ctaBound?: boolean;
  __linkBound?: boolean;
  __formBound?: boolean;
  __scrollBound?: boolean;
  __pageViewSent?: boolean;
  __scrollSummarySent?: boolean;
  __scrollThresholdsReached?: Set<number>;
  __maxScrollPercent?: number;
  __maxScrollPixels?: number;
  __pageStartedAt?: number;
};

declare global {
  interface Window {
    __eosAnalyticsConfig?: AnalyticsConfig;
    eosAnalytics?: BrowserAnalyticsWindow;
    posthog?: PostHogClient;
    dataLayer?: AnalyticsPayload[];
  }
}

export const getBrowserAnalytics = () =>
  typeof window === "undefined" ? undefined : window.eosAnalytics;

export const trackBrowserEvent = (eventName: string, properties: AnalyticsPayload = {}) =>
  getBrowserAnalytics()?.track(eventName, properties) || properties;

export const pushBrowserDataLayerEvent = (eventName: string, properties: AnalyticsPayload = {}) =>
  getBrowserAnalytics()?.pushDataLayerEvent(eventName, properties) || properties;

export const identifyBrowserUser = (
  distinctId: string,
  setProperties: AnalyticsPayload = {},
  setOnceProperties: AnalyticsPayload = {}
) => {
  getBrowserAnalytics()?.identify(distinctId, setProperties, setOnceProperties);
};

export {};
