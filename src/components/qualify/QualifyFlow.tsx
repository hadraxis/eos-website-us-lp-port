'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { QUALIFY_CONFIG, type QualifyConfig } from '@/lib/qualify.config';
import { scoreAnswers, type StepAnswer, type ScoreBreakdown } from './scoring';
import { QualifyResult } from './QualifyResult';
import {
  trackStepView,
  trackStepAnswer,
  trackStepComplete,
  trackStepBack,
  trackAbandoned,
  trackQualifyResult,
  trackMonthlyComfort,
  trackFitQuestionsCompleted,
  identifyOnSubmit,
  trackLeadSubmittedToCrm,
} from './useQualifyTracking';
import { saveSubmission, type LeadContact } from './qualify-store';
import { trackReddit, trackNextdoor, setRedditAdvancedMatching, setNextdoorAdvancedMatching } from '@/lib/track';
import { getUTMProps } from '@/lib/lp-tracking';
import { eosSite } from '@/content/eos-site-analytics';
import { getAnalyticsState } from '@/lib/analytics-config';

interface Props {
  contact?: LeadContact;
  /** Override the qualify config (Lightning LP passes Lightning config; default = Generator). */
  config?: QualifyConfig;
}

// Session-scoped resume: hydrate progress on mount, write on every step
// change, clear on success. Tab-survives (sessionStorage), but doesn't
// linger across browser sessions. Versioned in case the steps array changes.
const RESUME_KEY = 'eos-qualify-state';
const RESUME_VERSION = 1;

type ResumeSnapshot = {
  v: number;
  currentStep: number;
  answers: StepAnswer[];
  zipInput: string;
  addressInput: string;
};

function readResume(): ResumeSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResumeSnapshot;
    if (parsed?.v !== RESUME_VERSION) return null;
    return parsed;
  } catch { return null; }
}

function writeResume(snap: Omit<ResumeSnapshot, 'v'>) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(RESUME_KEY, JSON.stringify({ v: RESUME_VERSION, ...snap }));
  } catch { /* quota / privacy mode — ignore */ }
}

function clearResume() {
  if (typeof window === 'undefined') return;
  try { sessionStorage.removeItem(RESUME_KEY); } catch { /* ignore */ }
}

export function QualifyFlow({ contact, config: configProp }: Props = {}) {
  const config = configProp ?? QUALIFY_CONFIG;
  const steps = config.steps;

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<StepAnswer[]>([]);
  const [zipInput, setZipInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [result, setResult] = useState<ScoreBreakdown | null>(null);

  // ZIP → city/state lookup. Fetches zippopotam.us directly client-side
  // (allows CORS, no key, US-only). Powers the inline "✓ City, ST" hint on
  // the combined address+ZIP screen. Client-side keeps the route static-
  // exportable (the codebase ships under `output: 'export'` on this build
  // target, which forbids dynamic API handlers).
  const [location, setLocation] = useState<{ city: string; state: string } | null>(null);
  const [lookingUpZip, setLookingUpZip] = useState(false);
  useEffect(() => {
    const trimmed = zipInput.trim();
    if (!/^\d{5}$/.test(trimmed)) {
      setLocation(null);
      return;
    }
    let cancelled = false;
    setLookingUpZip(true);
    fetch(`https://api.zippopotam.us/us/${trimmed}`, { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { places?: Array<{ 'place name': string; 'state abbreviation': string }> } | null) => {
        if (cancelled) return;
        const place = data?.places?.[0];
        setLocation(place ? { city: place['place name'], state: place['state abbreviation'] } : null);
        setLookingUpZip(false);
      })
      .catch(() => { if (!cancelled) setLookingUpZip(false); });
    return () => { cancelled = true; };
  }, [zipInput]);

  // Hydrate from sessionStorage once on mount. Clamp currentStep so a config
  // change (steps removed) can't drop us into out-of-bounds.
  useEffect(() => {
    const snap = readResume();
    if (!snap) return;
    const safeStep = Math.min(Math.max(0, snap.currentStep), steps.length - 1);
    if (snap.answers?.length) setAnswers(snap.answers);
    if (snap.zipInput) setZipInput(snap.zipInput);
    if (snap.addressInput) setAddressInput(snap.addressInput);
    if (safeStep > 0) setCurrentStep(safeStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write every meaningful transition. Skips the pristine initial state
  // (step 0, no answers) so a fresh visit doesn't leave a stale crumb.
  useEffect(() => {
    if (result) return;
    if (currentStep === 0 && answers.length === 0 && !zipInput && !addressInput) return;
    writeResume({ currentStep, answers, zipInput, addressInput });
  }, [currentStep, answers, zipInput, addressInput, result]);

  // Clear once we hit a result. Restart() will reset state but we want the
  // next attempt to start clean too.
  useEffect(() => { if (result) clearResume(); }, [result]);

  const step = steps[currentStep];
  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Step timing — reset on every step view so trackStepComplete can attribute
  // time-on-question for the rearrange-based-on-data dashboards.
  const stepEnterTimeRef = useRef<number>(Date.now());
  const resultRef = useRef<ScoreBreakdown | null>(null);
  const currentStepRef = useRef(currentStep);
  currentStepRef.current = currentStep;

  useEffect(() => {
    stepEnterTimeRef.current = Date.now();
    trackStepView(step.id, currentStep, totalSteps);
  }, [step.id, currentStep, totalSteps]);

  // Funnel-stage signal — fires once per session when qualify flow first
  // shows. ViewContent (Reddit) / VIEW_CONTENT (Nextdoor) tells the ad
  // platforms an engaged user reached an intermediate funnel step, lets
  // them optimize bid pacing on visitors likely to convert. Session-scoped
  // dedup key prevents re-fire across resume hydration / route navigation.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sessionKey = 'eos-qualify-view-fired';
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
    const conversionId = `posthog-${Date.now()}-view`;
    const analytics = getAnalyticsState(eosSite.analytics);
    const redditPixelIds = [
      analytics.redditPixelEnabled ? analytics.redditPixelId : null,
      analytics.redditPixelSecondaryEnabled ? analytics.redditPixelIdSecondary : null,
    ].filter((x): x is string => Boolean(x));
    if (redditPixelIds.length > 0) {
      trackReddit('ViewContent', conversionId);
    }
    if (analytics.nextdoorPixelEnabled) {
      trackNextdoor('VIEW_CONTENT', conversionId);
    }
  }, []);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  // Abandon detection — only fire if the flow is incomplete (no result yet)
  // and only once per session to avoid duplicate fires on tab toggling.
  useEffect(() => {
    let fired = false;
    const handleHidden = (trigger: 'visibilitychange' | 'pagehide') => {
      if (fired || resultRef.current) return;
      if (trigger === 'visibilitychange' && document.visibilityState !== 'hidden') return;
      fired = true;
      const idx = currentStepRef.current;
      trackAbandoned({
        stepId: steps[idx].id,
        stepIndex: idx,
        timeOnStepMs: Date.now() - stepEnterTimeRef.current,
        trigger,
        totalSteps,
      });
    };
    const onVisibility = () => handleHidden('visibilitychange');
    const onPagehide = () => handleHidden('pagehide');
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPagehide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPagehide);
    };
  }, [steps]);

  const finish = useCallback(
    (updated: StepAnswer[]) => {
      // Fire fit_questions_completed with all answers as properties
      const answerMap = Object.fromEntries(updated.map((a) => [a.stepId, a.value]));
      trackFitQuestionsCompleted(answerMap);

      const scored = scoreAnswers(updated, config);
      const row = saveSubmission(updated, scored, contact);
      trackQualifyResult(scored);

      // Promote anonymous click-id session into email-keyed Person record so
      // PostHog has the same shape Pipedrive does. Pipedrive sync happens
      // downstream via n8n (no backend POST here in static-export build), so
      // pipedrive_person_id is not yet available — n8n catcher will $set it.
      // Per HANDOFF-2026-05-18-posthog-tracking-updates.md PR 1.
      if (contact?.email) {
        // Shared dedup ID across PostHog person + lead_submitted_to_crm event
        // + Reddit pixel Lead + Nextdoor pixel CONVERSION + future CAPI fire.
        // Form per posthog-tracking-cocktail-2026-05-18.md §6:
        // posthog-{lead_id}-lead — stable, derivable from PostHog event row.
        const conversionId = `posthog-${row.id}-lead`;
        const personProps: Record<string, unknown> = {
          // Contact / PII
          name: contact.name,
          phone: contact.phone,
          lead_id: row.id,
          conversion_id: conversionId,
          // Qualify answers (raw step IDs as keys)
          ...answerMap,
          // Scoring
          qualification_score: scored.total,
          qualification_tier: scored.tier,
          qualification_tier_label: scored.tierLabel,
          qualification_disqualified: scored.disqualified,
          ...(scored.disqualifyReason ? { qualification_disqualify_reason: scored.disqualifyReason } : {}),
        };
        identifyOnSubmit(contact.email, personProps);
        trackLeadSubmittedToCrm({
          ...personProps,
          email: contact.email,
        });
        // Fan out to AC webhook so the qualified lead immediately syncs to AC
        // (contact create + automation trigger + transactional email).
        // Posts directly from browser — URL is the public webhook receiver,
        // security via the opaque token in the path (same as Formspree).
        // Works on any host without server-side env config.
        // Fire-and-forget — UX doesn't gate on the AC ack; the PostHog
        // identify above is the source of truth for funnel queries.
        void fetch('https://integration-layer-siphon-webhook-receiver.cluster.app-us1.com/webhooks/gAAAAABqDnSExGif6gtYxX9bEgfnn01xOA98bJue6x8ymcEeFUCJMs_fPoHEmqjvvVznZMOsEc0LP9uOmyzHFFc4qHK7wvmFDvv0qsdr-ilwNu9Yukw2jpLCxiv4xEezsLupptPX2E4hzvEhNSn0i3Z2BX4gfFkj7A==', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...personProps,
            email: contact.email,
            source: 'qualify_complete',
          }),
        }).catch(() => { /* silent — keep UX clean */ });

        // Fan out to n8n Lead Complete webhook so Pipedrive Person gets created
        // / updated with full attribution (rdt_cid + utm_* first-and-last fields).
        // The n8n workflow does fuzzy person matching (phone > email > name),
        // stamps custom Pipedrive fields, builds an intake note, and creates a
        // Lead. Body shape matches the workflow's RESERVED_FIELDS expectations:
        // Name/Email/Phone/Lead ID/submittedAt are top-level; everything else
        // (utm_*, rdt_cid, qualify answers) lands in intake[] dynamically.
        // Env-gated: set NEXT_PUBLIC_N8N_LEAD_WEBHOOK_URL in .env.local / Vercel
        // to enable. No-op when unset (e.g. local dev without n8n exposed).
        const n8nWebhookUrl = process.env.NEXT_PUBLIC_N8N_LEAD_WEBHOOK_URL;
        if (n8nWebhookUrl) {
          const utm = getUTMProps();
          void fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              Name: contact.name,
              Email: contact.email,
              Phone: contact.phone,
              'Lead ID': row.id,
              submittedAt: new Date().toISOString(),
              conversion_id: conversionId,
              qualification_score: scored.total,
              qualification_tier: scored.tier,
              qualification_tier_label: scored.tierLabel,
              ...utm,
              ...answerMap,
            }),
          }).catch(() => { /* silent — n8n is downstream, UX never blocks */ });
        }

        // Ad-platform conversions fire for EVERY completed lead, including
        // soft-disqualified (renter, out-of-area). The qual_score rides as
        // `value` so Reddit/Nextdoor optimizers self-weight — tier 1 leads
        // count more than tier 4. Disqual flag still rides on PostHog
        // lp_journey for CRM/audience-exclusion downstream.
        //
        // Advanced matching — re-init each pixel with identity BEFORE
        // firing the conversion event, so Lead/CONVERSION carries match
        // keys alongside the click_id. Reddit + Nextdoor pixel.js hash
        // client-side, raw values OK. Massive CPA improvement vs click_id-only.
        const analytics = getAnalyticsState(eosSite.analytics);
        const identity = {
          email: contact.email,
          phone: contact.phone,
          externalId: row.id,
        };
        const redditPixelIds = [
          analytics.redditPixelEnabled ? analytics.redditPixelId : null,
          analytics.redditPixelSecondaryEnabled ? analytics.redditPixelIdSecondary : null,
        ].filter((x): x is string => Boolean(x));
        setRedditAdvancedMatching(identity, redditPixelIds);
        if (analytics.nextdoorPixelEnabled) {
          setNextdoorAdvancedMatching(identity, analytics.nextdoorPixelId);
        }
        trackReddit('Lead', conversionId, { value: scored.total });
        trackNextdoor('CONVERSION', conversionId, { value: scored.total });
      }

      setResult(scored);
    },
    [config, contact],
  );

  const recordAnswer = useCallback(
    (value: string) => {
      const prevAnswer = answers.find((a) => a.stepId === step.id)?.value;
      const isChange = prevAnswer !== undefined && prevAnswer !== value;
      const timeMs = Date.now() - stepEnterTimeRef.current;

      trackStepAnswer(step.id, value);
      trackStepComplete({
        stepId: step.id,
        stepIndex: currentStep,
        value,
        timeMs,
        isChange,
        totalSteps,
      });

      const updated = [...answers.filter((a) => a.stepId !== step.id), { stepId: step.id, value }];
      setAnswers(updated);

      // Monthly comfort tracking
      if (step.id === 'monthly_comfort') {
        trackMonthlyComfort(value);
      }

      // Early disqualification (non-zip steps)
      if (step.disqualifyOn?.includes(value)) {
        finish(updated);
        return;
      }

      if (currentStep < totalSteps - 1) {
        setCurrentStep((s) => s + 1);
      } else {
        finish(updated);
      }
    },
    [answers, step, currentStep, totalSteps, finish],
  );

  const goBack = useCallback(() => {
    if (currentStep === 0) return;
    trackStepBack({
      fromStepId: step.id,
      fromStepIndex: currentStep,
      toStepIndex: currentStep - 1,
      timeMs: Date.now() - stepEnterTimeRef.current,
    });
    setCurrentStep((s) => s - 1);
  }, [currentStep, step.id]);

  const handleZipSubmit = useCallback(() => {
    if (zipInput.length === 5) recordAnswer(zipInput);
  }, [zipInput, recordAnswer]);

  // Address step requires a non-empty address. No format validation — advisor
  // verifies on call. Min length 5 (street number + something).
  const handleAddressSubmit = useCallback(() => {
    if (addressInput.trim().length >= 5) recordAnswer(addressInput.trim());
  }, [addressInput, recordAnswer]);

  // Combined address+zip submit — writes BOTH answers in one tap and advances
  // currentStep + 2 so the user sees a single screen instead of two. Mirrors
  // production-site behavior and lets Safari Keychain / Android Smart Lock
  // autofill both fields at once (autofill triggers per-form, not per-field).
  const handleCombinedSubmit = useCallback(() => {
    const addr = addressInput.trim();
    const zip = zipInput.trim();
    if (addr.length < 5 || zip.length !== 5) return;

    const nextStep = steps[currentStep + 1];
    const addrStepId = step.id;
    const zipStepId = nextStep?.id ?? 'zip_code';

    const timeMs = Date.now() - stepEnterTimeRef.current;
    trackStepAnswer(addrStepId, addr);
    trackStepAnswer(zipStepId, zip);
    trackStepComplete({ stepId: addrStepId, stepIndex: currentStep, value: addr, timeMs, isChange: false, totalSteps });
    trackStepComplete({ stepId: zipStepId, stepIndex: currentStep + 1, value: zip, timeMs, isChange: false, totalSteps });

    const filtered = answers.filter((a) => a.stepId !== addrStepId && a.stepId !== zipStepId);
    const updated = [...filtered, { stepId: addrStepId, value: addr }, { stepId: zipStepId, value: zip }];
    setAnswers(updated);

    if (currentStep + 2 <= totalSteps - 1) {
      setCurrentStep((s) => s + 2);
    } else {
      finish(updated);
    }
  }, [addressInput, zipInput, steps, currentStep, step.id, answers, totalSteps, finish]);

  // --- Result screen ---
  if (result) {
    return (
      <QualifyResult
        result={result}
        answers={answers}
        onRestart={() => {
          setAnswers([]);
          setCurrentStep(0);
          setResult(null);
          setZipInput('');
          setAddressInput('');
        }}
      />
    );
  }

  const existingAnswer = answers.find((a) => a.stepId === step.id)?.value;

  return (
    // Sheet-aware layout: progress + question pinned at top, options scroll
    // in the middle. Keeps the close X (provided by PlanningSheet) and the
    // progress bar always visible regardless of how many options the step
    // renders.
    <div className="flex flex-col h-full min-h-0">
      {/* PINNED HEADER — progress + back row + question + subtitle */}
      <div className="shrink-0 px-6 pt-6 md:px-10 md:pt-8">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">
              Step {currentStep + 1} of {totalSteps}
            </span>
            {currentStep > 0 && (
              <button
                onClick={goBack}
                className="text-xs text-eos-blue hover:text-eos-accent-hover transition-colors"
              >
                &larr; Back
              </button>
            )}
          </div>
          <div className="h-1 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full rounded-full bg-eos-blue transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question heading + subtitle — animate on step change via key */}
        <div key={`${step.id}-head`} className="animate-fadeSlideIn" style={{ animationDuration: '0.35s' }}>
          <h2 id={`qualify-question-${step.id}`} className="text-charcoal text-xl md:text-2xl font-bold tracking-tight mb-1">
            {step.question}
          </h2>
          {step.subtitle && (
            <p id={`qualify-subtitle-${step.id}`} className="text-muted text-sm">{step.subtitle}</p>
          )}
        </div>
      </div>

      {/* SCROLLABLE BODY — options list / inputs. Scrolls independently so
          progress + question stay pinned. Bottom padding leaves room past
          last option for comfortable tap. */}
      <div
        key={`${step.id}-body`}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pt-6 pb-8 md:px-10 animate-fadeSlideIn"
        style={{ animationDuration: '0.35s' }}
      >
        {step.inputType === 'address' && steps[currentStep + 1]?.inputType === 'zip' ? (
          // Combined address + ZIP screen — both fields on one form so Safari
          // Keychain / Android Smart Lock autofill triggers both at once.
          // Records two answers on submit and skips currentStep + 2.
          <form
            onSubmit={(e) => { e.preventDefault(); handleCombinedSubmit(); }}
            className="flex flex-col gap-4"
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-charcoal">Street address</span>
              <input
                type="text"
                name="street-address"
                autoComplete="street-address"
                autoCapitalize="words"
                enterKeyHint="next"
                aria-required="true"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="1234 Memorial Dr"
                className="w-full rounded-[var(--radius-btn)] border border-rule bg-white px-4 py-3
                           text-charcoal text-base placeholder:text-muted/40
                           focus:outline-none focus:ring-2 focus:ring-eos-blue/30 transition-shadow"
                autoFocus
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-charcoal">ZIP code</span>
              <input
                type="text"
                name="postal-code"
                autoComplete="postal-code"
                inputMode="numeric"
                enterKeyHint="done"
                maxLength={5}
                aria-required="true"
                value={zipInput}
                onChange={(e) => setZipInput(e.target.value.replace(/\D/g, ''))}
                placeholder="77024"
                className="w-full rounded-[var(--radius-btn)] border border-rule bg-white px-4 py-3
                           text-charcoal text-lg font-medium tracking-wide
                           placeholder:text-muted/40 focus:outline-none focus:ring-2 focus:ring-eos-blue/30
                           transition-shadow"
              />
              {location && (
                <span className="text-[13px] font-medium text-emerald-600">
                  ✓ {location.city}, {location.state}
                </span>
              )}
              {!location && lookingUpZip && (
                <span className="text-[13px] text-muted">Looking up…</span>
              )}
            </label>

            <button
              type="submit"
              disabled={addressInput.trim().length < 5 || zipInput.length !== 5}
              className="mt-2 w-full rounded-[var(--radius-btn)] bg-eos-blue px-6 py-3
                         text-white text-sm font-bold uppercase tracking-widest
                         hover:bg-eos-accent-hover disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors"
            >
              Continue
            </button>
          </form>
        ) : step.inputType === 'address' ? (
          // Standalone address step — kept as fallback if a future flow uses
          // address without a paired ZIP. No combined screen.
          <div>
            <input
              type="text"
              name="street-address"
              autoComplete="street-address"
              autoCapitalize="words"
              enterKeyHint="next"
              aria-labelledby={`qualify-question-${step.id}`}
              aria-describedby={step.subtitle ? `qualify-subtitle-${step.id}` : undefined}
              aria-required="true"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddressSubmit()}
              placeholder="1234 Memorial Dr, Houston, TX"
              className="w-full rounded-[var(--radius-btn)] border border-rule bg-white px-4 py-3
                         text-charcoal text-base placeholder:text-muted/40
                         focus:outline-none focus:ring-2 focus:ring-eos-blue/30 transition-shadow"
              autoFocus
            />
            <button
              onClick={handleAddressSubmit}
              disabled={addressInput.trim().length < 5}
              className="mt-4 w-full rounded-[var(--radius-btn)] bg-eos-blue px-6 py-3
                         text-white text-sm font-bold uppercase tracking-widest
                         hover:bg-eos-accent-hover disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors"
            >
              Continue
            </button>
          </div>
        ) : step.inputType === 'zip' ? (
          <div>
            <input
              type="text"
              name="zip"
              autoComplete="postal-code"
              inputMode="numeric"
              enterKeyHint="done"
              aria-labelledby={`qualify-question-${step.id}`}
              aria-describedby={step.subtitle ? `qualify-subtitle-${step.id}` : undefined}
              aria-required="true"
              maxLength={5}
              value={zipInput}
              onChange={(e) => setZipInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleZipSubmit()}
              placeholder="77024"
              className="w-full rounded-[var(--radius-btn)] border border-rule bg-white px-4 py-3
                         text-charcoal text-lg font-medium tracking-wide
                         placeholder:text-muted/40 focus:outline-none focus:ring-2 focus:ring-eos-blue/30
                         transition-shadow"
              autoFocus
            />
            <button
              onClick={handleZipSubmit}
              disabled={zipInput.length !== 5}
              className="mt-4 w-full rounded-[var(--radius-btn)] bg-eos-blue px-6 py-3
                         text-white text-sm font-bold uppercase tracking-widest
                         hover:bg-eos-accent-hover disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {step.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => recordAnswer(opt.value)}
                className={`w-full text-left rounded-[var(--radius-card)] border px-5 py-4
                           transition-all duration-200
                           ${
                             existingAnswer === opt.value
                               ? 'border-eos-blue bg-eos-blue/5 shadow-sm'
                               : 'border-rule bg-white hover:border-eos-blue/40 hover:shadow-sm'
                           }`}
              >
                <span className="block text-charcoal font-semibold text-[15px]">{opt.label}</span>
                {opt.sublabel && (
                  <span className="block text-muted text-xs mt-0.5">{opt.sublabel}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
