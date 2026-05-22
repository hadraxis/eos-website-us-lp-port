'use client';

import { useRef, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SystemBuilder } from './SystemBuilder';
import { VoiceInput } from '@/components/shared/VoiceInput';
import { track, trackReddit, trackNextdoor, setRedditAdvancedMatching, setNextdoorAdvancedMatching } from '@/lib/track';
import { checkPhone, checkEmail } from '@/lib/lead-validation';
import { eosSite } from '@/content/eos-site-analytics';
import { getAnalyticsState } from '@/lib/analytics-config';

type Mode = 'idle' | 'planning' | 'callback' | 'callback-done';

type FieldErrors = {
  phone?: string;
  email?: string;
  emailSuggestion?: { full: string; domain: string };
};

function meganStep(step: string, props: Record<string, unknown> = {}) {
  track('lp_megan_step', { step, ...props });
}

/**
 * PlanningSheet — iOS-26-style fullscreen modal that hosts SystemBuilder.
 * - `body[data-planning-open]` flag drives the global CSS that hides nav,
 *   footer, and mobile tab bar (see globals.css).
 * - Backdrop blurs the LP behind via backdrop-filter; glass-thin close
 *   button top-right.
 * - Esc closes. Sheet itself scrolls internally on overflow so long
 *   QualifyFlow steps don't push the close button off-screen.
 */
function PlanningSheet({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.dataset.planningOpen = 'true';
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEsc);
    return () => {
      delete document.body.dataset.planningOpen;
      document.removeEventListener('keydown', onEsc);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Plan your battery system"
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 safe-top safe-bottom"
      style={{
        background: 'rgba(8, 18, 56, 0.78)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        backdropFilter: 'blur(28px) saturate(180%)',
      }}
    >
      {/* Close — glass pill, top-right. Doubles as the only exit so users
          aren't hunting for "back to options" in two places. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close planning"
        className="absolute top-4 right-4 w-11 h-11 rounded-full glass-thin flex items-center justify-center text-charcoal hover:scale-105 active:scale-95 transition-transform z-10"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Sheet — floating glass card. Itself does NOT scroll; child content
          areas declare their own scroll regions (options list, etc) so the
          header + progress + primary CTA stay pinned to the sheet edges.
          Uses .h-sheet utility (globals.css) which falls back to vh on
          browsers without dvh (Safari < 15.4 on macOS Monterey, Edge < 108,
          etc) via @supports. lg:max-w-[640px] gives desktop a hair more
          breathing room without changing mobile form ergonomics. */}
      <div
        className="w-full max-w-[560px] lg:max-w-[640px] h-sheet flex flex-col overflow-hidden bg-canvas rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.5)] animate-fadeSlideIn"
        style={{ animationDuration: '0.4s' }}
      >
        {children}
      </div>
    </div>
  );
}

const TIME_OPTIONS = [
  'Morning (8am – 12pm)',
  'Afternoon (12pm – 4pm)',
  'Evening (4pm – 7pm)',
];

export function InlineEstimate({ angle = 'generator' }: { angle?: 'generator' | 'lightning' } = {}) {
  const [mode, setMode] = useState<Mode>('idle');
  const [callbackForm, setCallbackForm] = useState({ name: '', email: '', phone: '', time: '', message: '', hp: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const callbackOpenedAtRef = useRef<number | null>(null);
  const pathname = usePathname();
  // LP funnels are pre-qualified by angle copy; the "see if you qualify first"
  // escape hatch makes sense on the homepage but undermines the LP narrative.
  const isLPRoute = pathname?.startsWith('/lp/') ?? false;

  // Bring the advisor card into the middle of the viewport — Megan stays in
  // sight while the right content swaps to SystemBuilder via the same
  // fadeSlideIn animation the qualify flow uses. No more "curtain opens
  // below the fold and the user wonders if anything happened" problem.
  const scrollToSelf = () => {
    requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  useEffect(() => {
    const onOpen = () => {
      setMode('planning');
      meganStep('planning_start', { trigger: 'external_cta' });
      scrollToSelf();
    };
    window.addEventListener('eos:open-estimate', onOpen);
    return () => window.removeEventListener('eos:open-estimate', onOpen);
  }, []);

  const handlePhoneBlur = () => {
    if (!callbackForm.phone) return;
    const r = checkPhone(callbackForm.phone);
    if (!r.valid) {
      setFieldErrors(p => ({ ...p, phone: 'Enter a valid US phone number' }));
    } else {
      setFieldErrors(p => ({ ...p, phone: undefined }));
      if (r.formatted) setCallbackForm(f => ({ ...f, phone: r.formatted! }));
    }
  };

  const handleEmailBlur = () => {
    if (!callbackForm.email) return;
    const r = checkEmail(callbackForm.email);
    if (!r.valid) {
      setFieldErrors(p => ({
        ...p,
        email: r.reason === 'disposable' ? 'Use a real email address' : 'Enter a valid email',
        emailSuggestion: undefined,
      }));
    } else {
      setFieldErrors(p => ({
        ...p,
        email: undefined,
        emailSuggestion: r.suggestion,
      }));
    }
  };

  const acceptEmailSuggestion = () => {
    if (!fieldErrors.emailSuggestion) return;
    setCallbackForm(f => ({ ...f, email: fieldErrors.emailSuggestion!.full }));
    setFieldErrors(p => ({ ...p, email: undefined, emailSuggestion: undefined }));
  };

  const handleCallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Soft anti-bot: hidden honeypot + sub-2s submit detector + client-side
    // phone/email validation. All look like a successful submission to the
    // user — the confirmation screen still renders — but the formspree POST
    // is suppressed so we don't pollute the CRM. The lp_megan_step
    // callback_submitted event still fires (so the funnel stays consistent)
    // but carries a suspected_bot tag for filtering in PostHog. Legit users
    // with browser autofill complete in 1-3s, so 2s is the conservative floor.
    const opened = callbackOpenedAtRef.current ?? Date.now();
    const tooFast = Date.now() - opened < 2000;
    const phoneCheck = checkPhone(callbackForm.phone);
    const emailCheck = checkEmail(callbackForm.email);

    let botReason: string | undefined;
    if (callbackForm.hp) botReason = 'honeypot';
    else if (tooFast) botReason = 'fast_submit';
    else if (!phoneCheck.valid) botReason = 'bad_phone';
    else if (!emailCheck.valid) botReason = emailCheck.reason === 'disposable' ? 'disposable_email' : 'bad_email';

    const suspectedBot = Boolean(botReason);

    // Shared dedup ID — same string rides on the Reddit pixel `Lead` event
    // and the eventual CAPI fan-out, so Reddit collapses pixel + CAPI hits
    // into one conversion. crypto.randomUUID is widely supported (Safari 15.4+).
    const conversionId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `lead-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    setSubmitting(true);

    // Attach qual score/tier if available from a completed qualify session
    let qualScore: number | undefined;
    let qualTier: number | undefined;
    try {
      const raw = localStorage.getItem('eos_qualify_leads');
      if (raw) {
        const leads = JSON.parse(raw) as Array<{ score?: number; tier?: number }>;
        if (leads[0]) { qualScore = leads[0].score; qualTier = leads[0].tier; }
      }
    } catch { /* ignore */ }

    // Server verification — Twilio Lookup (line type) + ZeroBounce (email
    // deliverability). Stubbed until keys land; route returns
    // { stubbed: true } and the form proceeds as if both passed. When
    // env vars are set, hard fails attach reason='dead_email'/'voip' etc.
    let verifyResult: Record<string, unknown> | undefined;
    if (!suspectedBot) {
      try {
        const v = await fetch('/api/verify-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phoneCheck.e164 ?? callbackForm.phone,
            email: callbackForm.email.trim().toLowerCase(),
          }),
        });
        if (v.ok) verifyResult = await v.json();
      } catch { /* network fail — skip, don't block */ }
    }

    if (!suspectedBot) {
      // hp is dev-only honeypot data; strip before sending to CRM
      const { hp: _hp, ...payload } = callbackForm;
      void _hp;
      const leadPayload = {
        ...payload,
        phone_e164: phoneCheck.e164,
        conversion_id: conversionId,
        source: 'lp_callback',
        ...(qualScore !== undefined ? { qual_score: qualScore, qual_tier: qualTier } : {}),
        ...(verifyResult ? { verify: verifyResult } : {}),
      };
      // Dual-fan-out: Formspree (legacy email inbox) + AC webhook (kicks off
      // contact sync + automation + transactional email). Run in parallel so
      // neither blocks the other; both fail silently to keep UX consistent.
      //
      // AC webhook posts directly from the browser — URL is the canonical
      // public webhook receiver, security via the opaque token in the path.
      // Same pattern as Formspree. Works on any host (no Vercel env needed).
      await Promise.allSettled([
        fetch('https://formspree.io/f/xjgjkgnr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(leadPayload),
        }),
        fetch('https://integration-layer-siphon-webhook-receiver.cluster.app-us1.com/webhooks/gAAAAABqDnSExGif6gtYxX9bEgfnn01xOA98bJue6x8ymcEeFUCJMs_fPoHEmqjvvVznZMOsEc0LP9uOmyzHFFc4qHK7wvmFDvv0qsdr-ilwNu9Yukw2jpLCxiv4xEezsLupptPX2E4hzvEhNSn0i3Z2BX4gfFkj7A==', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadPayload),
        }),
      ]);
    }
    setSubmitting(false);
    setMode('callback-done');
    meganStep('callback_submitted', {
      conversion_id: conversionId,
      has_time: Boolean(callbackForm.time),
      ...(suspectedBot ? { suspected_bot: true, bot_reason: botReason } : {}),
      ...(verifyResult ? { verify_stubbed: verifyResult.stubbed === true } : {}),
    });
    // Ad-platform conversions — only for real submissions. Bots tagged by
    // honeypot/fast_submit/bad_phone/disposable_email get the PostHog event
    // (so the funnel stays consistent) but no ad-platform conversion.
    if (!suspectedBot) {
      // Advanced matching — re-init pixels with identity before firing the
      // conversion event so Lead/CONVERSION carries email/phone match keys
      // alongside the click_id. Big CPA improvement vs click_id-only.
      const analytics = getAnalyticsState(eosSite.analytics);
      const identity = {
        email: callbackForm.email,
        phone: phoneCheck.e164 ?? callbackForm.phone,
      };
      const redditPixelIds = [
        analytics.redditPixelEnabled ? analytics.redditPixelId : null,
        analytics.redditPixelSecondaryEnabled ? analytics.redditPixelIdSecondary : null,
      ].filter((x): x is string => Boolean(x));
      setRedditAdvancedMatching(identity, redditPixelIds);
      if (analytics.nextdoorPixelEnabled) {
        setNextdoorAdvancedMatching(identity, analytics.nextdoorPixelId);
      }
      trackReddit('Lead', conversionId, {
        ...(qualScore !== undefined ? { value: qualScore } : {}),
      });
      trackNextdoor('CONVERSION', conversionId, {
        ...(qualScore !== undefined ? { value: qualScore } : {}),
      });
    }
  };

  // Once the user hits Start Planning, the form takes over the viewport as
  // an iOS-26-style fullscreen sheet — frosted backdrop over the LP, glass
  // close button, single floating white card. Site chrome (nav/footer/tab
  // bar) auto-hides via body[data-planning-open] in globals.css. No more
  // duplicate nav/headers/back-buttons stacking around the form.
  if (mode === 'planning') {
    return (
      <PlanningSheet
        onClose={() => {
          setMode('idle');
          meganStep('planning_collapsed');
          scrollToSelf();
        }}
      >
        <SystemBuilder angle={angle} />
      </PlanningSheet>
    );
  }

  return (
    <div ref={sectionRef} id="estimate" className="bg-[#0a1a4a]">
      <div className="mx-auto max-w-[900px] page-x py-16">
        <div className="bg-[#0f2260] rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-fadeSlideIn" style={{ animationDuration: '0.5s' }}>

          {/* Advisor row — always visible */}
          <div className="flex items-stretch">
            {/* Megan — left, desktop */}
            <div className="hidden md:flex flex-col items-center justify-center px-10 py-10 bg-[#0d1d52] shrink-0">
              <img
                src="/images/megan-advisor.png"
                alt="Megan King, Eos Advisor"
                width={96}
                height={96}
                loading="lazy"
                decoding="async"
                className="w-24 h-24 rounded-full object-cover shadow-[0_8px_24px_rgba(30,136,229,0.25)] mb-4"
              />
              <p className="text-white text-base font-semibold">Megan King</p>
              <p className="text-white/50 text-xs mt-0.5">Energy Advisor</p>
              <div className="flex items-center gap-1.5 mt-3">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400/80 text-xs">Available now</span>
              </div>
            </div>

            {/* Right content */}
            <div className="flex-1 p-8 md:p-10 flex flex-col justify-center">
              {/* Mobile avatar */}
              <div className="flex md:hidden items-center gap-3 mb-5">
                <img src="/images/megan-advisor.png" alt="Megan King, Eos Advisor" width={56} height={56} loading="lazy" decoding="async" className="w-14 h-14 rounded-full object-cover" />
                <div>
                  <p className="text-white text-sm font-semibold">Megan King</p>
                  <p className="text-white/50 text-xs">Energy Advisor</p>
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400/80 text-xs">Online</span>
                </div>
              </div>

              {mode === 'callback-done' ? (
                <div>
                  <p className="text-green-400 text-sm font-semibold uppercase tracking-wider mb-2">Got it.</p>
                  <h2 className="text-white text-2xl font-bold mb-2">We'll call you back.</h2>
                  <p className="text-white/60 text-sm">
                    Megan will reach out during your preferred window. Check your email for a confirmation.
                  </p>
                </div>
              ) : mode === 'callback' ? (
                <div>
                  <h2 className="text-white text-xl font-bold mb-1">Request a callback</h2>
                  <p className="text-white/50 text-sm mb-5">We'll call you when it works for you, not us.</p>
                  <form onSubmit={handleCallbackSubmit} className="flex flex-col gap-3">
                    {/* Honeypot — autofillers / headless bots set this; real users never see it.
                        Off-screen + tabindex=-1 + aria-hidden so AT skips it too. */}
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      value={callbackForm.hp}
                      onChange={e => setCallbackForm(f => ({ ...f, hp: e.target.value }))}
                      style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        required
                        type="text"
                        name="name"
                        placeholder="Your name"
                        autoComplete="name"
                        autoCapitalize="words"
                        enterKeyHint="next"
                        value={callbackForm.name}
                        onChange={e => setCallbackForm(f => ({ ...f, name: e.target.value }))}
                        className="bg-white/10 border border-white/15 text-white placeholder:text-white/35 rounded-xl px-4 py-3 text-sm outline-none focus:border-eos-accent transition-colors"
                      />
                      <div className="flex flex-col gap-1">
                        <input
                          required
                          type="tel"
                          name="phone"
                          placeholder="Phone number"
                          autoComplete="tel"
                          inputMode="tel"
                          autoCorrect="off"
                          enterKeyHint="next"
                          aria-invalid={Boolean(fieldErrors.phone)}
                          aria-describedby={fieldErrors.phone ? 'phone-err' : undefined}
                          value={callbackForm.phone}
                          onChange={e => {
                            setCallbackForm(f => ({ ...f, phone: e.target.value }));
                            if (fieldErrors.phone) setFieldErrors(p => ({ ...p, phone: undefined }));
                          }}
                          onBlur={handlePhoneBlur}
                          className={`bg-white/10 border text-white placeholder:text-white/35 rounded-xl px-4 py-3 text-sm outline-none focus:border-eos-accent transition-colors ${
                            fieldErrors.phone ? 'border-red-400/60' : 'border-white/15'
                          }`}
                        />
                        {fieldErrors.phone && (
                          <p id="phone-err" className="text-red-300/80 text-xs px-1">{fieldErrors.phone}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <input
                        required
                        type="email"
                        name="email"
                        placeholder="Email address"
                        autoComplete="email"
                        inputMode="email"
                        autoCorrect="off"
                        autoCapitalize="off"
                        enterKeyHint="next"
                        aria-invalid={Boolean(fieldErrors.email)}
                        aria-describedby={fieldErrors.email ? 'email-err' : fieldErrors.emailSuggestion ? 'email-sug' : undefined}
                        value={callbackForm.email}
                        onChange={e => {
                          setCallbackForm(f => ({ ...f, email: e.target.value }));
                          if (fieldErrors.email || fieldErrors.emailSuggestion) {
                            setFieldErrors(p => ({ ...p, email: undefined, emailSuggestion: undefined }));
                          }
                        }}
                        onBlur={handleEmailBlur}
                        className={`bg-white/10 border text-white placeholder:text-white/35 rounded-xl px-4 py-3 text-sm outline-none focus:border-eos-accent transition-colors ${
                          fieldErrors.email ? 'border-red-400/60' : 'border-white/15'
                        }`}
                      />
                      {fieldErrors.email && (
                        <p id="email-err" className="text-red-300/80 text-xs px-1">{fieldErrors.email}</p>
                      )}
                      {!fieldErrors.email && fieldErrors.emailSuggestion && (
                        <p id="email-sug" className="text-white/60 text-xs px-1">
                          Did you mean{' '}
                          <button
                            type="button"
                            onClick={acceptEmailSuggestion}
                            className="text-eos-accent hover:underline bg-transparent border-none p-0 cursor-pointer"
                          >
                            {fieldErrors.emailSuggestion.full}
                          </button>
                          ?
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-white/50 text-xs mb-2 font-medium uppercase tracking-wider">Best time to call</p>
                      <div className="flex flex-wrap gap-2">
                        {TIME_OPTIONS.map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setCallbackForm(f => ({ ...f, time: t }))}
                            className={`px-4 py-2 rounded-lg text-sm border transition-all duration-150 cursor-pointer ${
                              callbackForm.time === t
                                ? 'bg-eos-accent border-eos-accent text-white'
                                : 'bg-transparent border-white/20 text-white/60 hover:border-white/40 hover:text-white/80'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Describe your situation</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-white/30 text-xs">Tap mic to speak</span>
                          <VoiceInput
                            value={callbackForm.message}
                            onChange={(v) => setCallbackForm(f => ({ ...f, message: v }))}
                            className="text-white/40 hover:text-white/80"
                          />
                        </div>
                      </div>
                      <textarea
                        placeholder="e.g. We lost power for 4 days during Beryl, want to make sure the whole house stays on next time."
                        rows={3}
                        name="message"
                        autoCapitalize="sentences"
                        enterKeyHint="enter"
                        value={callbackForm.message}
                        onChange={e => setCallbackForm(f => ({ ...f, message: e.target.value }))}
                        className="bg-white/10 border border-white/15 text-white placeholder:text-white/25 rounded-xl px-4 py-3 text-sm outline-none focus:border-eos-accent transition-colors w-full resize-none leading-relaxed"
                      />
                    </div>
                    <div className="flex gap-3 mt-1">
                      <button
                        type="submit"
                        disabled={submitting || !callbackForm.time}
                        className="bg-eos-accent hover:bg-eos-accent-hover disabled:opacity-50 text-white px-7 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border-none cursor-pointer"
                      >
                        {submitting ? 'Sending…' : 'Request Callback'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('idle')}
                        className="border border-white/15 text-white/50 hover:text-white/80 px-5 py-3 rounded-xl text-sm transition-all duration-200 bg-transparent cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div>
                  <h2 className="text-white text-2xl md:text-3xl font-bold tracking-tight mb-3">
                    Ready to see what setup makes sense for your house?
                  </h2>
                  <p className="text-white/60 text-sm md:text-base mb-6">
                    Get a personalized estimate in under 2 minutes. No obligation, no pressure.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('planning');
                        meganStep('planning_start', { trigger: 'inline_button' });
                      }}
                      className="bg-eos-accent hover:bg-eos-accent-hover text-white px-7 py-3 rounded-xl text-sm font-semibold transition-all duration-200 inline-flex items-center gap-2 border-none cursor-pointer"
                    >
                      Start Planning
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('callback');
                        callbackOpenedAtRef.current = Date.now();
                        meganStep('callback_open');
                        scrollToSelf();
                      }}
                      className="border border-white/20 text-white/70 hover:border-white/40 hover:text-white px-7 py-3 rounded-xl text-sm font-medium transition-all duration-200 bg-transparent cursor-pointer"
                    >
                      Request a callback
                    </button>
                  </div>
                  {!isLPRoute && (
                    <p className="mt-4 text-white/40 text-xs">
                      Not sure yet?{' '}
                      <a
                        href="/qualify"
                        className="text-white/60 hover:text-white underline underline-offset-2 transition-colors"
                      >
                        See if you qualify first
                      </a>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
