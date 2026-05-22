// src/components/estimate/steps/ConfirmationStep.tsx

import type { EstimateState } from '@/lib/estimate-types';
import { lookupZip } from '@/lib/city-data';

const ACTION_LABELS: Record<string, { title: string; body: string; nextHref: string; nextLabel: string }> = {
  email_options: {
    title: 'Options sent',
    body: 'Check your inbox for a summary of your recommended plan and pricing.',
    nextHref: '/plans',
    nextLabel: 'Browse all plans',
  },
  book_call: {
    title: 'Call request received',
    body: 'We\'ll reach out within one business day to schedule your call.',
    nextHref: '/compare',
    nextLabel: 'Compare options while you wait',
  },
  start_application: {
    title: 'Application started',
    body: 'Our team will follow up with next steps for assessment and installation.',
    nextHref: '/learn/how-it-works',
    nextLabel: 'See how installation works',
  },
};

export function ConfirmationStep({ state, onReset }: { state: EstimateState; onReset: () => void }) {
  const action = ACTION_LABELS[state.next_action ?? 'email_options'];
  const city = lookupZip(state.zip_code);

  return (
    <div className="text-center max-w-lg mx-auto">
      <div className="w-12 h-12 rounded-full bg-eos-green/15 flex items-center justify-center mx-auto mb-6">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#43A047" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h2 className="text-charcoal text-2xl font-bold mb-2">{action.title}</h2>
      <p className="text-muted text-base mb-8">{action.body}</p>

      {state.confirmation_id && (
        <div className="bg-surface border border-rule rounded-card p-6 mb-8 text-left">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted text-xs uppercase tracking-widest">Confirmation</span>
              <p className="text-charcoal font-semibold mt-1">{state.confirmation_id}</p>
            </div>
            <div>
              <span className="text-muted text-xs uppercase tracking-widest">Submitted</span>
              <p className="text-charcoal font-semibold mt-1">{state.submitted_at}</p>
            </div>
            <div>
              <span className="text-muted text-xs uppercase tracking-widest">Plan</span>
              <p className="text-charcoal font-semibold mt-1 capitalize">{state.preferred_plan?.replace('-', ' ')}</p>
            </div>
            <div>
              <span className="text-muted text-xs uppercase tracking-widest">Location</span>
              <p className="text-charcoal font-semibold mt-1">{city?.city ?? state.zip_code}, TX</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <a
          href={action.nextHref}
          className="bg-eos-accent hover:bg-eos-accent-hover text-white px-6 py-3 rounded-btn text-sm font-semibold transition-all duration-200 no-underline"
        >
          {action.nextLabel}
        </a>
        <button
          type="button"
          onClick={onReset}
          className="border border-rule text-charcoal hover:border-eos-accent hover:text-eos-accent px-6 py-3 rounded-btn text-sm font-medium transition-all duration-200"
        >
          Start Over
        </button>
      </div>

      <p className="text-muted text-xs mt-8">
        This demo stores your submission locally. The live site will route it to our team.
      </p>
    </div>
  );
}
