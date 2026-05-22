// src/components/estimate/steps/NextStepStep.tsx
'use client';

import { useEffect, useRef } from 'react';
import { VoiceInput } from '@/components/shared/VoiceInput';
import type { EstimateState, EstimateAction } from '@/lib/estimate-types';
import type { NextAction } from '@/lib/plan-math';
import { ESTIMATE_EVENTS } from '@/lib/estimate-types';
import { track } from '@/lib/track';

type Props = {
  state: EstimateState;
  dispatch: React.Dispatch<EstimateAction>;
  onComplete: () => void;
  onBack: () => void;
};

const NEXT_OPTIONS: { val: NextAction; label: string; desc: string }[] = [
  {
    val: 'email_options',
    label: 'Email my options',
    desc: 'We\'ll send a summary of your recommended plan with pricing details.',
  },
  {
    val: 'book_call',
    label: 'Book a call',
    desc: 'Speak with someone who can answer your specific questions.',
  },
  {
    val: 'start_application',
    label: 'Start my application',
    desc: 'Ready to move forward. Begin the assessment and installation process.',
  },
];

export function NextStepStep({ state, dispatch, onComplete, onBack }: Props) {
  const qualifiedTrackedRef = useRef(false);

  useEffect(() => {
    if (!qualifiedTrackedRef.current) {
      track(ESTIMATE_EVENTS.QUALIFIED_COMPLETE, {
        angle: state.angle,
        preferred_plan: state.preferred_plan,
        install_timeline: state.install_timeline,
        zip_code: state.zip_code,
      });
      qualifiedTrackedRef.current = true;
    }
  }, [state.angle, state.preferred_plan, state.install_timeline, state.zip_code]);

  const set = (field: keyof EstimateState, value: EstimateState[keyof EstimateState]) =>
    dispatch({ type: 'SET_FIELD', field, value });

  const handleSelectAction = (action: NextAction) => {
    set('next_action', action);
    const eventMap: Record<NextAction, string> = {
      email_options: ESTIMATE_EVENTS.EMAIL_OPTIONS,
      book_call: ESTIMATE_EVENTS.CALL_BOOKED,
      start_application: ESTIMATE_EVENTS.APP_STARTED,
    };
    track(eventMap[action], {
      angle: state.angle,
      preferred_plan: state.preferred_plan,
    });
  };

  const canSubmit = state.next_action && state.name.trim() && state.email.trim();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-charcoal text-sm font-semibold mb-1">What would you like to do next?</p>
        <p className="text-muted text-xs mb-4">Choose the option that matches where you are in the process.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {NEXT_OPTIONS.map((opt) => (
          <button
            key={opt.val}
            type="button"
            onClick={() => handleSelectAction(opt.val)}
            className={`flex flex-col p-5 rounded-card border transition-all duration-200 text-left ${
              state.next_action === opt.val
                ? 'border-eos-accent ring-1 ring-eos-accent/30 bg-eos-accent/5'
                : 'border-rule bg-canvas hover:border-eos-accent/40'
            }`}
          >
            <span className={`font-semibold text-sm ${state.next_action === opt.val ? 'text-eos-accent' : 'text-charcoal'}`}>
              {opt.label}
            </span>
            <span className="text-muted text-xs mt-1">{opt.desc}</span>
          </button>
        ))}
      </div>

      {state.next_action && (
        <div className="animate-[fadeSlideIn_0.3s_ease-out] flex flex-col gap-4">
          <p className="text-charcoal text-sm font-semibold">Your contact info</p>
          <input
            type="text"
            placeholder="Your name"
            value={state.name}
            onChange={(e) => set('name', e.target.value)}
            className="bg-white border border-rule rounded-btn px-4 py-2.5 text-sm text-charcoal placeholder:text-muted focus:outline-none focus:border-eos-accent transition-colors"
          />
          <input
            type="email"
            placeholder="Email address"
            required
            value={state.email}
            onChange={(e) => set('email', e.target.value)}
            className="bg-white border border-rule rounded-btn px-4 py-2.5 text-sm text-charcoal placeholder:text-muted focus:outline-none focus:border-eos-accent transition-colors"
          />
          {(state.next_action === 'book_call' || state.next_action === 'start_application') && (
            <input
              type="tel"
              placeholder="Phone number"
              value={state.phone}
              onChange={(e) => set('phone', e.target.value)}
              className="bg-white border border-rule rounded-btn px-4 py-2.5 text-sm text-charcoal placeholder:text-muted focus:outline-none focus:border-eos-accent transition-colors"
            />
          )}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-charcoal text-sm font-semibold">
                Anything we should know?
                <span className="text-muted font-normal ml-1">(optional)</span>
              </label>
              <VoiceInput
                value={state.notes}
                onChange={(v) => set('notes', v)}
              />
            </div>
            <p className="text-muted text-xs mb-2">
              Describe your situation, ask a question, or just say what's on your mind. Tap the mic to speak.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. We lost power for 4 days during Beryl and I want to make sure the whole house stays on..."
              value={state.notes}
              onChange={(e) => set('notes', e.target.value)}
              className="w-full bg-white border border-rule rounded-btn px-4 py-2.5 text-sm text-charcoal placeholder:text-muted/60 focus:outline-none focus:border-eos-accent transition-colors resize-none leading-relaxed"
            />
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
        {canSubmit && (
          <button
            type="button"
            onClick={onComplete}
            className="bg-eos-accent hover:bg-eos-accent-hover text-white px-8 py-3 rounded-btn text-sm font-semibold transition-all duration-200"
          >
            Submit
          </button>
        )}
      </div>
    </div>
  );
}
