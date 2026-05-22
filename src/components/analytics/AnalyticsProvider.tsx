'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { eosSite } from '@/content/eos-site-analytics';
import { getAnalyticsState } from '@/lib/analytics-config';

export function AnalyticsProvider() {
  const pathname = usePathname();
  const analytics = getAnalyticsState(eosSite.analytics);

  // SPA route change: re-init page tracking
  useEffect(() => {
    if (typeof window !== 'undefined' && window.eosAnalytics?.initPage) {
      window.eosAnalytics.initPage();
    }
  }, [pathname]);

  // Tier 3: deferred behavior tracking (after idle)
  useEffect(() => {
    const initTracking = async () => {
      const { initBehaviorTracking } = await import('@/lib/behavior-tracker');
      window.setTimeout(() => {
        initBehaviorTracking();
      }, 200);
    };
    initTracking();
  }, []);

  return (
    <>
      {/* Tier 1: GTM — afterInteractive */}
      {analytics.gtmEnabled && analytics.gtmId && (
        <>
          <Script
            id="gtm-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${analytics.gtmId}');
              `,
            }}
          />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${analytics.gtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        </>
      )}

      {/* Tier 1: PostHog — afterInteractive, MAXIMUM config */}
      {analytics.posthogEnabled && analytics.posthogKey && (
        <Script
          id="posthog-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing startSessionRecording stopSessionRecording sessionRecordingStarted identify alias people.set people.set_once set_config reset get_config get_property getFeatureFlag getFeatureFlagPayload isFeatureEnabled onFeatureFlags reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys getNextSurveyStep onSessionId setPersonProperties".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

              posthog.init('${analytics.posthogKey}', {
                api_host: '${analytics.posthogHost || 'https://us.i.posthog.com'}',
                person_profiles: 'identified_only',
                cross_subdomain_cookie: true,
                persistence: 'localStorage+cookie',
                capture_pageview: 'history_change',
                capture_pageleave: true,
                capture_scroll_depth: true,
                capture_performance: true,
                enable_heatmaps: true,
                capture_dead_clicks: true,
                autocapture: {
                  dom_event_allowlist: ['click', 'change', 'submit'],
                  element_allowlist: ['a', 'button', 'form', 'input', 'select', 'textarea'],
                  css_selector_allowlist: ['[data-track]'],
                },
                session_recording: {
                  maskAllInputs: true,
                  maskInputFn: function(text, element) {
                    var whitelist = ['phone', 'email', 'name', 'first_name', 'last_name'];
                    if (element && element.name && whitelist.indexOf(element.name) > -1) return text;
                    return '*'.repeat(text.length);
                  }
                }
              });

              // Error handlers
              window.onerror = function(msg, url, line, col, error) {
                if (window.posthog) {
                  posthog.capture('js_error', { message: msg, source: url, line: line, col: col, stack: error?.stack });
                }
              };
              window.addEventListener('unhandledrejection', function(e) {
                if (window.posthog) {
                  posthog.capture('unhandled_promise_rejection', { reason: String(e.reason) });
                }
              });
            `,
          }}
        />
      )}

      {/* Tier 1: Reddit Pixel — afterInteractive.
          PageVisit on init. Conversion events (Lead/SignUp/Purchase) are
          fired via trackReddit() with a shared `conversionId` that also
          rides on the CAPI payload, so Reddit dedups pixel + CAPI hits.
          Secondary pixel (t2_*) — a Reddit-Pro / promoted-post pixel running
          a different campaign type — runs through the same rdt() queue
          via multi-init, so one trackReddit() call fires to both pixels. */}
      {analytics.redditPixelEnabled && (
        <Script
          id="reddit-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/pixel.js?pixel_id=${analytics.redditPixelId}",t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);
              rdt('init', '${analytics.redditPixelId}');
              ${analytics.redditPixelSecondaryEnabled ? `rdt('init', '${analytics.redditPixelIdSecondary}');` : ''}
              rdt('track', 'PageVisit');
            `,
          }}
        />
      )}

      {/* Tier 1: Nextdoor Pixel — afterInteractive.
          PAGE_VIEW on init. Conversion events fired via trackNextdoor() with
          an `order_id` matching the Reddit conversionId / PostHog conversion_id
          so the same lead is identifiable across all three platforms. */}
      {analytics.nextdoorPixelEnabled && (
        <Script
          id="nextdoor-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(e,n){var t,p;e.ndp||((t=e.ndp=function(){t.handleRequest?t.handleRequest.apply(t,arguments):t.queue.push(arguments)}).queue=[],t.v=1,(p=n.createElement(e="script")).async=!0,p.src="https://ads.nextdoor.com/public/pixel/ndp.js?id=${analytics.nextdoorPixelId}",(n=n.getElementsByTagName(e)[0]).parentNode.insertBefore(p,n))}(window,document);
              ndp('init', '${analytics.nextdoorPixelId}', {});
              ndp('track', 'PAGE_VIEW');
            `,
          }}
        />
      )}

      {/* Analytics config injection */}
      <Script
        id="analytics-config"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.__eosAnalyticsConfig = ${JSON.stringify({ gtmEnabled: analytics.gtmEnabled, posthogEnabled: analytics.posthogEnabled, redditPixelEnabled: analytics.redditPixelEnabled, redditPixelId: analytics.redditPixelId, redditPixelSecondaryEnabled: analytics.redditPixelSecondaryEnabled, redditPixelIdSecondary: analytics.redditPixelIdSecondary, nextdoorPixelEnabled: analytics.nextdoorPixelEnabled, nextdoorPixelId: analytics.nextdoorPixelId })};`,
        }}
      />

      {/* Tier 2: Analytics runtime — lazyOnload for page speed */}
      <Script src="/scripts/analytics-runtime.js" strategy="lazyOnload" />
    </>
  );
}
