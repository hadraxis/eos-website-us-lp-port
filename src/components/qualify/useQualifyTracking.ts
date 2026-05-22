/**
 * Fires analytics events at key points in the qualification flow.
 * If PostHog isn't loaded yet, events are silent no-ops.
 */

import { QUALIFY_CONFIG } from '@/lib/qualify.config';
import type { ScoreBreakdown } from './scoring';

// Event names are shared across all angles — read from the default config.
const EV = QUALIFY_CONFIG.events;
const DEFAULT_TOTAL_STEPS = QUALIFY_CONFIG.steps.length;

function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && 'posthog' in window) {
    (window as unknown as { posthog: { capture: (e: string, p?: Record<string, unknown>) => void } })
      .posthog.capture(event, properties);
  }
}

function setPersonProps(props: Record<string, unknown>) {
  if (typeof window !== 'undefined' && 'posthog' in window) {
    (window as unknown as {
      posthog: { people?: { set?: (p: Record<string, unknown>) => void } };
    }).posthog.people?.set?.(props);
  }
}

function pct(stepIndex: number, totalSteps: number): number {
  return Math.round(((stepIndex + 1) / totalSteps) * 100);
}

export function trackStepView(stepId: string, stepIndex: number, totalSteps: number = DEFAULT_TOTAL_STEPS) {
  track(EV.stepView, {
    step_id: stepId,
    step_index: stepIndex,
    total_steps: totalSteps,
    completion_pct: pct(stepIndex, totalSteps),
  });
  setPersonProps({ qualify_max_step_reached: stepIndex });
}

export function trackStepAnswer(stepId: string, value: string) {
  track(EV.stepAnswer, { step_id: stepId, value });
}

/** Fires alongside stepAnswer with timing + change-detection for rearrangement analysis. */
export function trackStepComplete(opts: {
  stepId: string;
  stepIndex: number;
  value: string;
  timeMs: number;
  isChange: boolean;
  totalSteps?: number;
}) {
  const totalSteps = opts.totalSteps ?? DEFAULT_TOTAL_STEPS;
  track(EV.stepComplete, {
    step_id: opts.stepId,
    step_index: opts.stepIndex,
    total_steps: totalSteps,
    completion_pct: pct(opts.stepIndex, totalSteps),
    value: opts.value,
    time_ms: opts.timeMs,
    is_change: opts.isChange,
  });
}

export function trackStepBack(opts: {
  fromStepId: string;
  fromStepIndex: number;
  toStepIndex: number;
  timeMs: number;
}) {
  track(EV.stepBack, {
    from_step_id: opts.fromStepId,
    from_step_index: opts.fromStepIndex,
    to_step_index: opts.toStepIndex,
    time_on_step_ms: opts.timeMs,
  });
}

export function trackAbandoned(opts: {
  stepId: string;
  stepIndex: number;
  timeOnStepMs: number;
  trigger: 'visibilitychange' | 'pagehide';
  totalSteps?: number;
}) {
  const totalSteps = opts.totalSteps ?? DEFAULT_TOTAL_STEPS;
  track(EV.abandoned, {
    step_id: opts.stepId,
    step_index: opts.stepIndex,
    total_steps: totalSteps,
    completion_pct: pct(opts.stepIndex, totalSteps),
    time_on_step_ms: opts.timeOnStepMs,
    trigger: opts.trigger,
  });
}

/** Fires when the person finishes all questions. */
export function trackFitQuestionsCompleted(answers: Record<string, string>) {
  track(EV.fitQuestionsCompleted, answers);
}

export function trackMonthlyComfort(value: string) {
  track(EV.monthlyComfort, { value });
}

export function trackQualifyResult(result: ScoreBreakdown) {
  track(EV.resultShown, {
    score: result.total,
    tier: result.tier,
    tier_label: result.tierLabel,
    disqualified: result.disqualified,
  });

  if (result.disqualified) {
    track(EV.disqualified, { reason: result.disqualifyReason });
    return;
  }

  if (result.tier <= 2) {
    track(EV.highIntent, { score: result.total, tier: result.tier });
  }
}

export function trackNextAction(action: string, tier: number) {
  // Maps to call_booked_after_estimate / email_options_after_estimate / application_started_after_estimate
  track(`${action}_after_estimate`, { tier });
}

/**
 * Promote anonymous click-id session into an email-keyed Person record.
 *
 * Uses `posthog.identify(email)` so future visits from cleared-cookie devices
 * still merge to the same person via email. `$set` writes the qualify answers +
 * scoring + attribution onto the Person — that's what fixes the Rebecca-style
 * "lead in Pipedrive, anonymous in PostHog" gap from HANDOFF-2026-05-18.
 *
 * No-op if PostHog hasn't loaded or email missing (defensive — caller should
 * already gate on email present).
 */
export function identifyOnSubmit(email: string, props: Record<string, unknown>) {
  if (typeof window === 'undefined' || !('posthog' in window) || !email) return;
  (window as unknown as {
    posthog: { identify: (id: string, props?: { $set?: Record<string, unknown> }) => void };
  }).posthog.identify(email, { $set: props });
}

/**
 * Fires after `saveSubmission` returns with full qualify payload + scoring +
 * contact. Mirrors what would go to Pipedrive so PostHog has the same shape.
 * Distinct from `fit_questions_completed` (which only carries answer values).
 */
export function trackLeadSubmittedToCrm(props: Record<string, unknown>) {
  track(EV.leadSubmittedToCrm, props);
}
