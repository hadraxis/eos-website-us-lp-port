// src/components/estimate/steps/FitStep.tsx
'use client';

import { useState } from 'react';
import type { EstimateState, EstimateAction } from '@/lib/estimate-types';
import type { HomeownerStatus, HomeSizeBand, HoaStatus, CurrentSetup } from '@/lib/plan-math';
import { lookupZip, extractZip } from '@/lib/city-data';
import { getAngleConfig } from '@/lib/angle-defaults';

type Props = {
  state: EstimateState;
  dispatch: React.Dispatch<EstimateAction>;
  onComplete: () => void;
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

export function FitStep({ state, dispatch, onComplete }: Props) {
  const [zipInput, setZipInput] = useState(state.zip_code);
  const [zipError, setZipError] = useState('');

  const set = (field: keyof EstimateState, value: EstimateState[keyof EstimateState]) =>
    dispatch({ type: 'SET_FIELD', field, value });

  const handleZipBlur = () => {
    const zip = extractZip(zipInput);
    if (!zip) {
      setZipError('Enter a 5-digit ZIP code');
      return;
    }
    const record = lookupZip(zip);
    if (!record) {
      setZipError('We currently serve the Houston metro area only');
      set('zip_code', '');
      return;
    }
    setZipError('');
    set('zip_code', zip);
  };

  const allAnswered =
    state.homeowner_status &&
    state.zip_code &&
    state.home_size &&
    state.hoa_status !== null &&
    state.current_setup;

  return (
    <div className="flex flex-col gap-8">
      {state.angle && getAngleConfig(state.angle)?.note && (
        <div className="bg-eos-accent/5 border border-eos-accent/20 rounded-card px-5 py-4 -mt-2">
          <p className="text-charcoal text-sm leading-relaxed">
            {getAngleConfig(state.angle)!.note}
          </p>
        </div>
      )}

      <QuestionBlock label="Do you own or rent your home?" visible>
        <div className="flex flex-wrap gap-3">
          {(['owner', 'renter', 'other'] as HomeownerStatus[]).map((val) => (
            <OptionButton
              key={val}
              selected={state.homeowner_status === val}
              onClick={() => set('homeowner_status', val)}
            >
              {val === 'owner' ? 'I own my home' : val === 'renter' ? 'I rent' : 'Other / Not sure'}
            </OptionButton>
          ))}
        </div>
        {state.homeowner_status === 'renter' && (
          <p className="text-sm text-muted mt-3">
            Battery installations require homeownership. You're welcome to explore our plans and share with your landlord.
          </p>
        )}
      </QuestionBlock>

      <QuestionBlock label="What's your ZIP code?" visible={state.homeowner_status === 'owner'}>
        <div className="max-w-xs">
          <input
            type="text"
            inputMode="numeric"
            maxLength={5}
            placeholder="77494"
            value={zipInput}
            onChange={(e) => {
              setZipInput(e.target.value.replace(/\D/g, '').slice(0, 5));
              setZipError('');
            }}
            onBlur={handleZipBlur}
            className="w-full bg-white border border-rule rounded-btn px-4 py-2.5 text-sm text-charcoal placeholder:text-muted focus:outline-none focus:border-eos-accent transition-colors"
          />
          {zipError && <p className="text-sm mt-2" style={{ color: '#d32f2f' }}>{zipError}</p>}
          {state.zip_code && !zipError && (
            <p className="text-sm text-eos-green mt-2">
              {lookupZip(state.zip_code)?.city}, {lookupZip(state.zip_code)?.county}
            </p>
          )}
        </div>
      </QuestionBlock>

      <QuestionBlock label="How large is your home?" visible={!!state.zip_code}>
        <div className="flex flex-wrap gap-3">
          {([
            { val: 'small' as HomeSizeBand, label: 'Under 1,500 sqft' },
            { val: 'medium' as HomeSizeBand, label: '1,500 – 2,500 sqft' },
            { val: 'large' as HomeSizeBand, label: '2,500 – 4,000 sqft' },
            { val: 'very_large' as HomeSizeBand, label: '4,000+ sqft' },
          ]).map((opt) => (
            <OptionButton key={opt.val} selected={state.home_size === opt.val} onClick={() => set('home_size', opt.val)}>
              {opt.label}
            </OptionButton>
          ))}
        </div>
      </QuestionBlock>

      <QuestionBlock label="Is your home in an HOA?" visible={!!state.home_size}>
        <div className="flex flex-wrap gap-3">
          {([
            { val: 'yes' as HoaStatus, label: 'Yes' },
            { val: 'no' as HoaStatus, label: 'No' },
            { val: 'not_sure' as HoaStatus, label: 'Not sure' },
          ]).map((opt) => (
            <OptionButton key={opt.val} selected={state.hoa_status === opt.val} onClick={() => set('hoa_status', opt.val)}>
              {opt.label}
            </OptionButton>
          ))}
        </div>
      </QuestionBlock>

      <QuestionBlock label="What do you have now?" visible={state.hoa_status !== null && !!state.home_size}>
        <div className="flex flex-wrap gap-3">
          {([
            { val: 'none' as CurrentSetup, label: 'Nothing, starting fresh' },
            { val: 'generator' as CurrentSetup, label: 'Standby generator' },
            { val: 'solar' as CurrentSetup, label: 'Solar panels (no battery)' },
            { val: 'generator_and_solar' as CurrentSetup, label: 'Generator + solar' },
            { val: 'ups' as CurrentSetup, label: 'UPS / portable' },
            { val: 'other' as CurrentSetup, label: 'Other' },
          ]).map((opt) => (
            <OptionButton key={opt.val} selected={state.current_setup === opt.val} onClick={() => set('current_setup', opt.val)}>
              {opt.label}
            </OptionButton>
          ))}
        </div>
      </QuestionBlock>

      {allAnswered && state.homeowner_status !== 'renter' && (
        <button
          type="button"
          onClick={onComplete}
          className="bg-eos-accent hover:bg-eos-accent-hover text-white px-8 py-3 rounded-btn text-sm font-semibold transition-all duration-200 self-start"
        >
          Continue
        </button>
      )}
    </div>
  );
}
