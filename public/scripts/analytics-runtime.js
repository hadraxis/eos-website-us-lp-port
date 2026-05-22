(function () {
  const config = window.__eosAnalyticsConfig || {};
  const sessionKey = "eos_analytics_session_initialized";
  const queryParams = new URLSearchParams(window.location.search);

  const getConnection = function () {
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  };

  const getDeviceType = function () {
    const userAgentDataMobile = navigator.userAgentData && typeof navigator.userAgentData.mobile === "boolean"
      ? navigator.userAgentData.mobile
      : null;

    if (userAgentDataMobile === true) return "mobile";
    if (userAgentDataMobile === false && window.innerWidth >= 1024) return "desktop";

    const width = window.innerWidth || document.documentElement.clientWidth || 0;
    if (width < 768) return "mobile";
    if (width < 1100) return "tablet";
    return "desktop";
  };

  const getPageCategory = function () {
    const path = window.location.pathname;
    // LP routes first — new ad-destination pages
    if (path === "/lightning-backup" || path === "/before-the-generator") return "lp";
    // Prod-tuned mapping
    if (path === "/") return "home";
    if (path === "/get-started") return "qualify";
    if (path.indexOf("/plans") === 0) return "plans";
    if (path.indexOf("/locations") === 0) return "locations";
    if (path.indexOf("/blog") === 0) return "learn";
    if (path.indexOf("/learn") === 0) return "learn";
    if (path.indexOf("/compare") === 0) return "compare";
    if (path.indexOf("/contact") === 0) return "contact";
    if (path.indexOf("/about") === 0) return "about";
    if (path.indexOf("/solutions") === 0) return "solutions";
    if (/^\/residential-[a-z]/.test(path)) return "ab_test";
    if (path === "/faq" || path === "/specifications" || path.indexOf("/legal") === 0) return "content";
    return "content";
  };

  const getCampaignProperties = function () {
    return cleanPayload({
      utm_source: queryParams.get("utm_source"),
      utm_medium: queryParams.get("utm_medium"),
      utm_campaign: queryParams.get("utm_campaign"),
      utm_term: queryParams.get("utm_term"),
      utm_content: queryParams.get("utm_content"),
      gclid: queryParams.get("gclid"),
      fbclid: queryParams.get("fbclid"),
      msclkid: queryParams.get("msclkid"),
    });
  };

  const cleanPayload = function (payload) {
    return Object.fromEntries(
      Object.entries(payload).filter(function (_ref) {
        const value = _ref[1];
        return value !== undefined && value !== null && value !== "";
      })
    );
  };

  const getDocumentHeight = function () {
    return Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.body.clientHeight,
      document.documentElement.clientHeight
    );
  };

  const getScrollMetrics = function () {
    const documentHeight = getDocumentHeight();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const maxSeenPixels = Math.min(documentHeight, Math.max(viewportHeight, scrollTop + viewportHeight));
    const percent =
      documentHeight <= 0 ? 100 : Math.max(0, Math.min(100, Math.round((maxSeenPixels / documentHeight) * 100)));

    return {
      documentHeight: documentHeight,
      viewportHeight: viewportHeight,
      scrollTop: scrollTop,
      maxSeenPixels: maxSeenPixels,
      percent: percent,
    };
  };

  const getBaseProperties = function () {
    const connection = getConnection();
    const navEntry =
      window.performance &&
      window.performance.getEntriesByType &&
      window.performance.getEntriesByType("navigation") &&
      window.performance.getEntriesByType("navigation")[0];

    return cleanPayload({
      page: window.location.pathname,
      page_path: window.location.pathname,
      page_url: window.location.href,
      page_title: document.title,
      page_category: getPageCategory(),
      query_string: window.location.search || undefined,
      referrer: document.referrer || undefined,
      language: navigator.language || undefined,
      user_agent: navigator.userAgent || undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
      screen_width: window.screen && window.screen.width,
      screen_height: window.screen && window.screen.height,
      viewport_width: window.innerWidth || document.documentElement.clientWidth || undefined,
      viewport_height: window.innerHeight || document.documentElement.clientHeight || undefined,
      pixel_ratio: window.devicePixelRatio || undefined,
      color_scheme:
        window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      device_type: getDeviceType(),
      touch_points: navigator.maxTouchPoints || undefined,
      hardware_concurrency: navigator.hardwareConcurrency || undefined,
      device_memory: navigator.deviceMemory || undefined,
      cookies_enabled: navigator.cookieEnabled,
      online_status: navigator.onLine,
      network_effective_type: connection && connection.effectiveType,
      network_downlink_mbps: connection && connection.downlink,
      network_rtt_ms: connection && connection.rtt,
      save_data: connection && connection.saveData,
      navigation_type: navEntry && navEntry.type,
      landing_page: sessionStorage.getItem("eos_analytics_landing_page") || window.location.pathname,
      landing_url: sessionStorage.getItem("eos_analytics_landing_url") || window.location.href,
      entry_source: sessionStorage.getItem("eos_analytics_entry_source") || (document.referrer ? "referral" : "direct"),
      session_started_at: sessionStorage.getItem("eos_analytics_session_started_at") || undefined,
      ...getCampaignProperties(),
    });
  };

  if (!window.eosAnalytics) {
    const scrollThresholds = Array.from({ length: 20 }, function (_, index) {
      return (index + 1) * 5;
    });

    const pushDataLayerEvent = function (eventName, properties) {
      const payload = cleanPayload(
        Object.assign({}, getBaseProperties(), properties || {})
      );

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(
        Object.assign(
          {
            event: eventName,
          },
          payload
        )
      );

      return payload;
    };

    const track = function (eventName, properties, opts) {
      const payload = pushDataLayerEvent(eventName, properties || {});
      if (config.posthogEnabled && window.posthog && window.posthog.capture) {
        window.posthog.capture(eventName, payload, opts);
      }
      return payload;
    };

    const identify = function (distinctId, setProperties, setOnceProperties) {
      const nextSetProperties = setProperties || {};
      const nextSetOnceProperties = setOnceProperties || {};

      if (config.posthogEnabled && window.posthog && window.posthog.identify) {
        window.posthog.identify(distinctId, nextSetProperties, nextSetOnceProperties);
      }

      pushDataLayerEvent("user_identified", {
        identified: true,
        has_email: Boolean(nextSetProperties.email),
        has_phone: Boolean(nextSetProperties.phone),
        plan_context: nextSetProperties.last_plan_seen,
        city_context: nextSetProperties.last_seen_city,
      });
    };

    const trackCtaClick = function (target) {
      const ctaMap = [
        // LP-internal (PR1 active — sandbox LP components use [data-cta])
        { selector: "[data-cta]", label: "lp_cta" },
        // Prod-wide (active sitewide when PR2 lifts AnalyticsProvider into root layout)
        { selector: 'a[href="/get-started"]', label: "nav_get_started" },
        { selector: 'a[href="/plans"]', label: "nav_plans" },
        { selector: 'a[href="/contact"]', label: "nav_contact" },
        { selector: 'footer a[href]', label: "footer_link" },
        { selector: 'a[href="#options"]', label: "home_see_options" },
        { selector: 'a[href^="/plans/"]', label: "plan_card_click" },
        { selector: '[role="tab"]', label: "tab_click" },
        { selector: 'a[href^="/blog/"]', label: "blog_post_click" },
        { selector: 'a[href^="/locations/"]', label: "location_card_click" },
        { selector: 'a[href^="/compare/"]', label: "compare_card_click" },
        { selector: 'a[href^="tel:"]', label: "contact_phone" },
        { selector: 'a[href*="outlook.office.com/book"]', label: "contact_booking" },
        { selector: 'a[href^="mailto:"]', label: "contact_email" },
      ];

      const matched = ctaMap.find(function (entry) {
        return target.closest(entry.selector);
      });
      if (!matched) return false;

      const element = target.closest(matched.selector);
      const ctaLabel = (element && element.dataset && element.dataset.ctaLabel) || matched.label;
      const ctaText = (element && element.textContent && element.textContent.trim().slice(0, 80)) || ctaLabel;
      const ctaHref =
        element instanceof HTMLAnchorElement
          ? element.href
          : (element && (element.getAttribute("href") || element.getAttribute("data-href"))) || undefined;

      track("cta_clicked", {
        cta_label: ctaLabel,
        cta_text: ctaText,
        cta_href: ctaHref,
        device_type:
          (window.posthog &&
            window.posthog.get_property &&
            window.posthog.get_property("$device_type")) ||
          "unknown",
      });

      return true;
    };

    const trackLinkClick = function (target) {
      const link = target.closest("a");
      if (!(link instanceof HTMLAnchorElement)) return false;

      const href = link.href || link.getAttribute("href") || "";
      if (!href) return false;

      const isExternal = link.origin !== window.location.origin;
      const isDownload = Boolean(link.hasAttribute("download")) || /\.(pdf|zip|docx?|xlsx?|pptx?)($|\?)/i.test(href);
      const linkType = href.indexOf("mailto:") === 0
        ? "mailto"
        : href.indexOf("tel:") === 0
          ? "tel"
          : isDownload
            ? "download"
            : isExternal
              ? "external"
              : "internal";

      track("link_clicked", {
        link_type: linkType,
        link_url: href,
        link_host: link.host || undefined,
        link_path: link.pathname || undefined,
        link_text: (link.textContent || "").trim().slice(0, 120) || undefined,
        link_target: link.target || undefined,
      });

      return true;
    };

    const initLinkDelegation = function () {
      if (window.eosAnalytics && window.eosAnalytics.__linkBound) return;
      window.eosAnalytics.__linkBound = true;

      document.addEventListener("click", function (event) {
        const target = event.target;
        if (!(target instanceof Element)) return;
        trackLinkClick(target);
      });
    };

    const initFormTracking = function () {
      if (window.eosAnalytics && window.eosAnalytics.__formBound) return;
      window.eosAnalytics.__formBound = true;

      document.addEventListener(
        "invalid",
        function (event) {
          const field = event.target;
          if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) return;

          const form = field.form;
          track("form_field_invalid", {
            form_name: (form && (form.getAttribute("id") || form.getAttribute("name"))) || "unknown_form",
            field_name: field.getAttribute("name") || field.getAttribute("id") || undefined,
            field_type: field instanceof HTMLInputElement ? field.type : field.tagName.toLowerCase(),
            validation_message: field.validationMessage || undefined,
          });
        },
        true
      );

      document.addEventListener(
        "submit",
        function (event) {
          const form = event.target;
          if (!(form instanceof HTMLFormElement)) return;
          track("form_submit_attempted", {
            form_name: form.getAttribute("id") || form.getAttribute("name") || "unknown_form",
          });
        },
        true
      );
    };

    const initSessionContext = function () {
      if (!sessionStorage.getItem("eos_analytics_session_started_at")) {
        sessionStorage.setItem("eos_analytics_session_started_at", String(Date.now()));
      }

      if (!sessionStorage.getItem("eos_analytics_landing_page")) {
        sessionStorage.setItem("eos_analytics_landing_page", window.location.pathname);
      }

      if (!sessionStorage.getItem("eos_analytics_landing_url")) {
        sessionStorage.setItem("eos_analytics_landing_url", window.location.href);
      }

      if (!sessionStorage.getItem("eos_analytics_entry_source")) {
        const entrySource = queryParams.get("utm_source")
          ? "campaign"
          : document.referrer
            ? "referral"
            : "direct";
        sessionStorage.setItem("eos_analytics_entry_source", entrySource);
      }

      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "1");
        track("session_started", {
          landing_page: sessionStorage.getItem("eos_analytics_landing_page"),
          landing_url: sessionStorage.getItem("eos_analytics_landing_url"),
          entry_source: sessionStorage.getItem("eos_analytics_entry_source"),
        });
      }
    };

    const trackPageContext = function () {
      if (window.eosAnalytics && window.eosAnalytics.__pageViewSent) return;
      window.eosAnalytics.__pageViewSent = true;

      track("page_context_loaded", {
        landing_page: sessionStorage.getItem("eos_analytics_landing_page"),
        landing_url: sessionStorage.getItem("eos_analytics_landing_url"),
        entry_source: sessionStorage.getItem("eos_analytics_entry_source"),
      });
    };

    const flushScrollSummary = function () {
      if (window.eosAnalytics && window.eosAnalytics.__scrollSummarySent) return;
      if (window.eosAnalytics && !window.eosAnalytics.__scrollBound) return;

      window.eosAnalytics.__scrollSummarySent = true;

      const reachedThresholds = Array.from(window.eosAnalytics.__scrollThresholdsReached || []).sort(function (a, b) {
        return a - b;
      });
      const scrollMetrics = getScrollMetrics();

      track("page_scroll_summary", {
        max_scroll_percent: window.eosAnalytics.__maxScrollPercent || 0,
        max_scroll_pixels: window.eosAnalytics.__maxScrollPixels || 0,
        scroll_thresholds_reached: reachedThresholds.join(","),
        scroll_threshold_count: reachedThresholds.length,
        document_height: scrollMetrics.documentHeight,
        viewport_height: scrollMetrics.viewportHeight,
        page_engaged_ms: Math.max(0, Date.now() - (window.eosAnalytics.__pageStartedAt || Date.now())),
      }, { transport: "sendBeacon" });
    };

    const initScrollTracking = function () {
      if (window.eosAnalytics && window.eosAnalytics.__scrollBound) return;

      window.eosAnalytics.__scrollBound = true;
      window.eosAnalytics.__scrollThresholdsReached = new Set();
      window.eosAnalytics.__maxScrollPercent = 0;
      window.eosAnalytics.__maxScrollPixels = 0;
      window.eosAnalytics.__pageStartedAt = Date.now();

      const evaluate = function () {
        const scrollMetrics = getScrollMetrics();

        window.eosAnalytics.__maxScrollPercent = Math.max(
          window.eosAnalytics.__maxScrollPercent || 0,
          scrollMetrics.percent
        );
        window.eosAnalytics.__maxScrollPixels = Math.max(
          window.eosAnalytics.__maxScrollPixels || 0,
          scrollMetrics.maxSeenPixels
        );

        // Record threshold crossings into the running set for the on-exit
        // page_scroll_summary, but DO NOT emit per-threshold events — they
        // duplicate lp-tracking.ts's lp_scroll_* on landing pages and flood
        // the funnel with 20 events/visitor elsewhere.
        scrollThresholds.forEach(function (threshold) {
          if (scrollMetrics.percent < threshold) return;
          if (window.eosAnalytics.__scrollThresholdsReached) {
            window.eosAnalytics.__scrollThresholdsReached.add(threshold);
          }
        });
      };

      let ticking = false;
      const onScroll = function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          evaluate();
          ticking = false;
        });
      };

      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      window.addEventListener("pagehide", flushScrollSummary);
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") {
          flushScrollSummary();
        }
      });

      evaluate();
    };

    const initCtaDelegation = function () {
      if (window.eosAnalytics && window.eosAnalytics.__ctaBound) return;
      window.eosAnalytics.__ctaBound = true;

      document.addEventListener("click", function (event) {
        const target = event.target;
        if (!(target instanceof Element)) return;
        trackCtaClick(target);
      });
    };

    const initPage = function () {
      if (window.eosAnalytics && window.eosAnalytics.__pageInitialized) return;
      window.eosAnalytics.__pageInitialized = true;
      window.eosAnalytics.__pageStartedAt = window.eosAnalytics.__pageStartedAt || Date.now();
      initSessionContext();
      initCtaDelegation();
      initLinkDelegation();
      initFormTracking();
      initScrollTracking();
      trackPageContext();
    };

    window.eosAnalytics = {
      version: "2026-03-31",
      track: track,
      pushDataLayerEvent: pushDataLayerEvent,
      identify: identify,
      trackCtaClick: trackCtaClick,
      initPage: initPage,
      flushScrollSummary: flushScrollSummary,
      __pageInitialized: false,
      __ctaBound: false,
      __linkBound: false,
      __formBound: false,
      __scrollBound: false,
      __pageViewSent: false,
      __scrollSummarySent: false,
      __scrollThresholdsReached: new Set(),
      __maxScrollPercent: 0,
      __maxScrollPixels: 0,
      __pageStartedAt: Date.now(),
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      function () {
        if (window.eosAnalytics) window.eosAnalytics.initPage();
      },
      { once: true }
    );
  } else if (window.eosAnalytics) {
    window.eosAnalytics.initPage();
  }
})();
