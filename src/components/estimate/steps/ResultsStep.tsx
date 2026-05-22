// src/components/estimate/steps/ResultsStep.tsx
'use client';

import { useEffect, useRef } from 'react';
import type { EstimateState, EstimateAction } from '@/lib/estimate-types';
import type { PlanSlug, InstallTimeline } from '@/lib/plan-math';
import { recommendPlans } from '@/lib/plan-math';
import { ESTIMATE_EVENTS } from '@/lib/estimate-types';
import { track } from '@/lib/track';
import { siteContent } from '@/lib/content/site-content';

type Props = {
  state: EstimateState;
  dispatch: React.Dispatch<EstimateAction>;
  onComplete: () => void;
  onBack: () => void;
};

function PlanOption({
  name,
  reason,
  price,
  kwh,
  selected,
  onClick,
}: {
  name: string;
  reason: string;
  price: number;
  kwh: number;
  selected: boolean;
  onClick: () => void;
}) {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col p-6 rounded-card border transition-all duration-200 text-left ${
        selected
          ? 'border-eos-accent ring-1 ring-eos-accent/30 bg-eos-accent/5'
          : 'border-rule bg-canvas hover:border-eos-accent/40'
      }`}
    >
      <div className="flex items-baseline justify-between mb-2">
        <h3 className={`font-bold text-base ${selected ? 'text-eos-accent' : 'text-charcoal'}`}>{name}</h3>
        <span className="font-mono text-lg font-bold tabular-nums text-charcoal">{formattedPrice}</span>
      </div>
      <p className="text-muted text-sm mb-3">{reason}</p>
      <span className="text-xs text-muted">{kwh} kWh usable</span>
    </button>
  );
}

export function ResultsStep({ state, dispatch, onComplete, onBack }: Props) {
  const trackedRef = useRef(false);

  const fit = {
    homeowner_status: state.homeowner_status!,
    zip_code: state.zip_code,
    home_size: state.home_size!,
    hoa_status: state.hoa_status!,
    current_setup: state.current_setup!,
  };

  const needs = {
    primary_pain: state.primary_pain!,
    backup_scope: state.backup_scope!,
    budget_range: state.budget_range!,
  };

  const recommendations = recommendPlans(fit, needs);

  // Look up full plan data for price/kwh display
  const planData = siteContent.plans;
  const getPlan = (slug: string) => planData.find((p) => p.slug === slug);

  useEffect(() => {
    if (!trackedRef.current) {
      track(ESTIMATE_EVENTS.OPTIONS_VIEWED, { angle: state.angle });
      track('pricing_viewed', { angle: state.angle });
      trackedRef.current = true;
    }
  }, [state.angle]);

  const set = (field: keyof EstimateState, value: EstimateState[keyof EstimateState]) =>
    dispatch({ type: 'SET_FIELD', field, value });

  const handleSelectPlan = (slug: PlanSlug) => {
    set('preferred_plan', slug);
    track(ESTIMATE_EVENTS.PREFERRED_SELECTED, { plan: slug, angle: state.angle });
  };

  const handleSelectTimeline = (timeline: InstallTimeline) => {
    set('install_timeline', timeline);
    track(ESTIMATE_EVENTS.INSTALL_TIMING, { timeline, angle: state.angle });
  };

  const allAnswered = state.preferred_plan && state.install_timeline;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-charcoal text-sm font-semibold mb-1">Based on your answers, we recommend:</p>
        <p className="text-muted text-xs mb-4">Select the option that looks right. You can always adjust later.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec) => {
          const plan = getPlan(rec.slug);
          return (
            <PlanOption
              key={rec.slug}
              name={rec.name}
              reason={rec.reason}
              price={plan?.pricing.cash_price ?? 0}
              kwh={plan?.specs.kwh_usable ?? 0}
              selected={state.preferred_plan === rec.slug}
              onClick={() => handleSelectPlan(rec.slug)}
            />
          );
        })}
      </div>

      {state.preferred_plan && (
        <div className="animate-[fadeSlideIn_0.3s_ease-out]">
          <p className="text-charcoal text-sm font-semibold mb-3">When are you looking to install?</p>
          <div className="flex flex-wrap gap-3">
            {([
              { val: 'asap' as InstallTimeline, label: 'As soon as possible' },
              { val: '30_days' as InstallTimeline, label: 'Within 30 days' },
              { val: '60_days' as InstallTimeline, label: 'Within 60 days' },
              { val: '90_days' as InstallTimeline, label: 'Within 90 days' },
              { val: 'researching' as InstallTimeline, label: 'Just researching' },
            ]).map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => handleSelectTimeline(opt.val)}
                className={`px-5 py-3 rounded-btn text-sm font-medium border transition-all duration-200 ${
                  state.install_timeline === opt.val
                    ? 'border-eos-accent bg-eos-accent/8 text-eos-accent'
                    : 'border-rule bg-canvas text-charcoal hover:border-eos-accent/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          className="border border-rule text-charcoal hover:border-eos-accent hover:text-eos-accent px-6 py-3 rounded-btn text-sm font-medium transition-all duration-200"
        >
          Back
        </button>
        {allAnswered && (
          <button
            type="button"
            onClick={onComplete}
            className="bg-eos-accent hover:bg-eos-accent-hover text-white px-8 py-3 rounded-btn text-sm font-semibold transition-all duration-200"
          >
            Choose Next Step
          </button>
        )}
      </div>
    </div>
  );
}
