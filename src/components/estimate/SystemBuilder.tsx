// src/components/estimate/SystemBuilder.tsx
'use client';

import { useState } from 'react';
import { IntroStep } from './steps/IntroStep';
import { QualifyFlow } from '@/components/qualify/QualifyFlow';
import { track } from '@/lib/track';
import { getUTMProps } from '@/lib/lp-tracking';
import { getQualifyConfig, type QualifyAngle } from '@/lib/qualify.config';

const LEAD_STARTED_FIRED_KEY = 'eos-lead-started-fired';

/**
 * fireLeadStarted — POSTs Name/Email/Phone + attribution to the n8n Lead
 * Started webhook so Pipedrive gets the Person stamped the moment contact
 * info is captured. This covers partial-completer remarketing: even if the
 * user bails mid-qualify, we have them in Pipedrive with first-touch
 * attribution.
 *
 * Session-dedup via sessionStorage so a refresh / back-nav doesn't refire.
 * Env-gated by NEXT_PUBLIC_N8N_LEAD_STARTED_WEBHOOK_URL — no-op if unset.
 */
function fireLeadStarted(contact: { name: string; email: string; phone: string }) {
  if (typeof window === 'undefined') return;
  if (sessionStorage.getItem(LEAD_STARTED_FIRED_KEY)) return;
  sessionStorage.setItem(LEAD_STARTED_FIRED_KEY, '1');
  const utm = getUTMProps();
  const submittedAt = new Date().toISOString();
  const basePayload = {
    Name: contact.name,
    Email: contact.email,
    Phone: contact.phone,
    submittedAt,
    ...utm,
  };

  // n8n Lead Started — Pipedrive Person create w/ all 12 attribution fields
  // stamped (6 first-touch + 6 last-touch). Env-gated.
  const n8nWebhookUrl = process.env.NEXT_PUBLIC_N8N_LEAD_STARTED_WEBHOOK_URL;
  if (n8nWebhookUrl) {
    void fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(basePayload),
    }).catch(() => { /* silent — n8n downstream */ });
  }

  // ActiveCampaign siphon — same upstream URL the qualify-complete fan-out
  // uses, but with source='qualify_intro_complete' so AC automation can
  // branch: apply tag 102 (lp_partial) on this event, then apply tag 103
  // (lp_qualified) + remove 102 when source='qualify_complete' arrives.
  // Hardcoded URL matches QualifyFlow's pattern (token is the auth, no env
  // var indirection on the browser side).
  void fetch('https://integration-layer-siphon-webhook-receiver.cluster.app-us1.com/webhooks/gAAAAABqDnSExGif6gtYxX9bEgfnn01xOA98bJue6x8ymcEeFUCJMs_fPoHEmqjvvVznZMOsEc0LP9uOmyzHFFc4qHK7wvmFDvv0qsdr-ilwNu9Yukw2jpLCxiv4xEezsLupptPX2E4hzvEhNSn0i3Z2BX4gfFkj7A==', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...basePayload,
      email: contact.email,
      source: 'qualify_intro_complete',
    }),
  }).catch(() => { /* silent — keep UX clean */ });
}

interface Contact {
  name: string;
  email: string;
  phone: string;
}

/**
 * SystemBuilder — body of the planning sheet. No header chrome; the parent
 * PlanningSheet provides the close button + visual frame. We just switch
 * between intro (contact gate) and qualify (the question flow).
 *
 * `onCollapse` is no longer needed at this level — the sheet's close X is
 * the single exit. Kept as a no-op-optional prop for backwards compat in
 * case anything else mounts SystemBuilder directly.
 */
export function SystemBuilder({
  angle = 'generator',
}: {
  onCollapse?: () => void;
  /** Selects which qualify config to render (default = Generator). */
  angle?: QualifyAngle;
} = {}) {
  const [contact, setContact] = useState<Contact>({ name: '', email: '', phone: '' });
  const [phase, setPhase] = useState<'intro' | 'qualify'>('intro');
  const qualifyConfig = getQualifyConfig(angle);

  return (
    // Full sheet height + flex column so the phase content can pin its own
    // header/footer and only scroll the middle region.
    <div className="flex flex-col h-full min-h-0">
      {phase === 'intro' ? (
        <IntroStep
          name={contact.name}
          email={contact.email}
          phone={contact.phone}
          onChange={(field, value) => setContact((c) => ({ ...c, [field]: value }))}
          onComplete={() => {
            track('lp_megan_step', {
              step: 'intro_submitted',
              has_phone: Boolean(contact.phone.trim()),
            });
            track('lp_megan_step', { step: 'qualify_started' });
            // Fire Lead Started → n8n → Pipedrive Person create w/ first-touch
            // attribution. Covers partial-completer remarketing (Pipedrive
            // Person exists even if user bails mid-qualify). Session-deduped.
            fireLeadStarted(contact);
            setPhase('qualify');
          }}
        />
      ) : (
        <QualifyFlow contact={contact} config={qualifyConfig} />
      )}
    </div>
  );
}
