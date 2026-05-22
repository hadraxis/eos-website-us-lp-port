// src/components/estimate/EstimateProgress.tsx

import { STEP_ORDER, STEP_LABELS, type EstimateStep } from '@/lib/estimate-types';

const VISIBLE_STEPS: EstimateStep[] = STEP_ORDER.filter((s) => s !== 'intro' && s !== 'confirmation');

export function EstimateProgress({ currentStep }: { currentStep: EstimateStep }) {
  const currentIndex = VISIBLE_STEPS.indexOf(currentStep);
  // On confirmation, show full bar
  const effectiveIndex = currentStep === 'confirmation' ? VISIBLE_STEPS.length : currentIndex;

  return (
    <div className="mb-10">
      <div className="flex gap-1.5 mb-3">
        {VISIBLE_STEPS.map((step, i) => (
          <div
            key={step}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= effectiveIndex ? 'bg-eos-accent' : 'bg-rule'
            }`}
          />
        ))}
      </div>
      <div className="flex justify-between">
        {VISIBLE_STEPS.map((step, i) => (
          <span
            key={step}
            className={`text-xs font-medium transition-colors ${
              i <= effectiveIndex ? 'text-eos-accent' : 'text-muted'
            }`}
          >
            {STEP_LABELS[step]}
          </span>
        ))}
      </div>
    </div>
  );
}
