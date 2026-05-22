// src/components/estimate/steps/NeedsStep.tsx
'use client';

import type { EstimateState, EstimateAction } from '@/lib/estimate-types';
import type { PrimaryPain, BackupScope, BudgetRange } from '@/lib/plan-math';

type Props = {
  state: EstimateState;
  dispatch: React.Dispatch<EstimateAction>;
  onComplete: () => void;
  onBack: () => void;
};

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-5 py-3 rounded-btn text-sm font-medium border transition-all duration-200 text-left ${
        selected
          ? 'border-eos-accent bg-eos-accent/8 text-eos-accent'
          : 'border-rule bg-canvas text-charcoal hover:border-eos-accent/40'
      }`}
    >
      {children}
    </button>
  );
}

function QuestionBlock({ label, visible, children }: { label: string; visible: boolean; children: React.ReactNode }) {
  if (!visible) return null;
  return (
    <div className="animate-[fadeSlideIn_0.3s_ease-out]">
      <p className="text-charcoal text-sm font-semibold mb-3">{label}</p>
      {children}
    </div>
  );
}

export function NeedsStep({ state, dispatch, onComplete, onBack }: Props) {
  const set = (field: keyof EstimateState, value: EstimateState[keyof EstimateState]) =>
    dispatch({ type: 'SET_FIELD', field, value });

  const allAnswered = state.primary_pain && state.backup_scope && state.budget_range;

  return (
    <div className="flex flex-col gap-8">
      <QuestionBlock label="What's driving your interest?" visible>
        <div className="flex flex-wrap gap-3">
          {([
            { val: 'outages' as PrimaryPain, label: 'Outage protection' },
            { val: 'continuity' as PrimaryPain, label: 'Home office / work continuity' },
            { val: 'hoa_friction' as PrimaryPain, label: 'HOA won\'t allow a generator' },
            { val: 'solar_gaps' as PrimaryPain, label: 'Have solar, want storage' },
            { val: 'remote_confidence' as PrimaryPain, label: 'Peace of mind while away' },
            { val: 'other' as PrimaryPain, label: 'Something else' },
          ]).map((opt) => (
            <OptionButton key={opt.val} selected={state.primary_pain === opt.val} onClick={() => set('primary_pain', opt.val)}>
              {opt.label}
            </OptionButton>
          ))}
        </div>
      </QuestionBlock>

      <QuestionBlock label="What should the battery cover during an outage?" visible={!!state.primary_pain}>
        <div className="flex flex-wrap gap-3">
          {([
            { val: 'critical_loads' as BackupScope, label: 'Just the essentials (fridge, Wi-Fi, lights)' },
            { val: 'office_and_network' as BackupScope, label: 'Home office and network' },
            { val: 'hvac_and_core_home' as BackupScope, label: 'HVAC + core home systems' },
            { val: 'whole_home_style_goal' as BackupScope, label: 'Everything, whole-home comfort' },
            { val: 'not_sure' as BackupScope, label: 'Not sure yet' },
          ]).map((opt) => (
            <OptionButton key={opt.val} selected={state.backup_scope === opt.val} onClick={() => set('backup_scope', opt.val)}>
              {opt.label}
            </OptionButton>
          ))}
        </div>
      </QuestionBlock>

      <QuestionBlock label="What's your budget range?" visible={!!state.backup_scope}>
        <div className="flex flex-wrap gap-3">
          {([
            { val: 'under_10k' as BudgetRange, label: 'Under $10,000' },
            { val: '10k_20k' as BudgetRange, label: '$10,000 – $20,000' },
            { val: '20k_35k' as BudgetRange, label: '$20,000 – $35,000' },
            { val: '35k_plus' as BudgetRange, label: '$35,000+' },
            { val: 'not_sure' as BudgetRange, label: 'Not sure yet' },
          ]).map((opt) => (
            <OptionButton key={opt.val} selected={state.budget_range === opt.val} onClick={() => set('budget_range', opt.val)}>
              {opt.label}
            </OptionButton>
          ))}
        </div>
        {state.budget_range === 'under_10k' && (
          <p className="text-sm text-muted mt-3">
            Our smallest system starts at $10,200. We'll show you the closest option, but battery backup may be above this range.
          </p>
        )}
      </QuestionBlock>

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
            See My Options
          </button>
        )}
      </div>
    </div>
  );
}
