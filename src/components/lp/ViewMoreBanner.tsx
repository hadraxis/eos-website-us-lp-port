'use client';

import { useEffect, useState } from 'react';
import { isInAppWebView } from '@/lib/ua';
import { track } from '@/lib/track';

export function ViewMoreBanner() {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isInAppWebView()) return;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('eos_viewmore_dismissed') === '1') return;
    setEnabled(true);
    track('lp_in_app_webview_detected', { ua: navigator.userAgent });
  }, []);

  useEffect(() => {
    if (!enabled || dismissed) return;
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY;
        if (y < 80) {
          setVisible(true);
        } else if (dy < -8) {
          setVisible(true);
        } else if (dy > 8) {
          setVisible(false);
        }
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [enabled, dismissed]);

  const dismiss = () => {
    setDismissed(true);
    setVisible(false);
    try { sessionStorage.setItem('eos_viewmore_dismissed', '1'); } catch { /* ignore */ }
    track('lp_view_more_dismiss');
  };

  const handleClick = () => {
    track('lp_view_more_click');
  };

  if (!enabled || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
      className={`fixed inset-x-0 z-50 pointer-events-none transition-transform duration-300 ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="pointer-events-auto mx-auto max-w-[640px] m-2 px-4 py-2.5 rounded-xl bg-white/95 backdrop-blur shadow-[0_8px_24px_rgba(0,0,0,0.18)] border border-rule flex items-center gap-3">
        <button
          type="button"
          onClick={handleClick}
          className="flex-1 text-left text-charcoal text-sm leading-tight bg-transparent border-none p-0 cursor-pointer"
        >
          <span className="font-semibold">View More.</span>{' '}
          <span className="text-muted">Tap the menu (…) and pick Open in Browser for the full site.</span>
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 w-7 h-7 rounded-full text-muted hover:text-charcoal hover:bg-rule/40 transition-colors inline-flex items-center justify-center bg-transparent border-none cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
