'use client';

import { useState } from 'react';
import type { ScoreBreakdown, StepAnswer } from './scoring';
import { saveNote } from './qualify-store';
import { trackNextAction } from './useQualifyTracking';
import { VoiceInput } from '@/components/shared/VoiceInput';

interface Props {
  result: ScoreBreakdown;
  answers?: StepAnswer[];
  onRestart: () => void;
}

// Canonical booking URL — Microsoft Bookings general team page (phone or meet,
// same link, routes to whoever's on the schedule). Any `book_call` tier action
// resolves here, not /contact — the contact page is a fallback.
const BOOKING_URL = 'https://outlook.office.com/book/Scheduleameeting@eosloan.com/';

function resolveActionHref(value: string, fallback: string): string {
  return value === 'book_call' ? BOOKING_URL : fallback;
}

export function QualifyResult({ result, answers = [], onRestart }: Props) {
  const [note, setNote] = useState('');
  const decisionAuthority = answers.find((a) => a.stepId === 'decision_authority')?.value ?? 'sole';
  const hasSolar = answers.find((a) => a.stepId === 'current_setup')?.value === 'solar';
  const isJointDecision = decisionAuthority === 'joint' || decisionAuthority === 'other';
  // Disqualified branch removed — form's job is to score/qualify, not gate
  // the user out. The `disqualified` flag still rides on lp_journey →
  // PostHog/CRM for ad-platform exclusion + sales segmentation. Every user
  // reaches a tier-based result; tier 4 (Cold) handles the score-floor
  // case with a "we'll keep you in the loop" message.

  const { tierConfig } = result;

  const dotColor =
    result.tier === 1 ? 'bg-eos-green'
    : result.tier === 2 ? 'bg-eos-blue'
    : result.tier === 3 ? 'bg-eos-yellow'
    : 'bg-muted';

  const accentColor =
    result.tier === 1 ? 'text-eos-green'
    : result.tier === 2 ? 'text-eos-blue'
    : result.tier === 3 ? 'text-eos-yellow'
    : 'text-muted';

  // Joint decision → email-options leads so they can share with partner
  // Solar owner → book-call leads (already receptive, wants to talk systems)
  let actions = [...tierConfig.nextActions];
  if (isJointDecision && result.tier <= 2) {
    actions = [
      { value: 'email_options', label: 'Email Options to Review Together', href: '/contact', primary: true },
      ...actions.filter((a) => a.value !== 'email_options').map((a) => ({ ...a, primary: false })),
    ];
  } else if (hasSolar && result.tier <= 3) {
    actions = [
      { value: 'book_call', label: 'Talk to Our Solar Integration Team', href: '/contact', primary: true },
      ...actions.filter((a) => a.value !== 'book_call').map((a) => ({ ...a, primary: false })),
    ];
  }
  const primaryAction = actions.find((a) => a.primary) ?? actions[0];
  const secondaryActions = actions.filter((a) => !a.primary);

  return (
    <div className="mx-auto max-w-[560px] px-5 animate-fadeSlideIn" style={{ animationDuration: '0.4s' }}>
      <div className="rounded-[var(--radius-card)] border border-rule bg-white p-8">
        {/* Tier badge */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`h-3 w-3 rounded-full ${dotColor}`} />
          <span className={`text-xs font-bold uppercase tracking-widest ${accentColor}`}>
            {tierConfig.label}
          </span>
        </div>

        <h2 className="text-charcoal text-2xl font-bold tracking-tight mb-2">{tierConfig.heading}</h2>
        <p className="text-muted text-sm leading-relaxed mb-7">{tierConfig.body}</p>

        {/* Primary CTA — book_call resolves to Microsoft Bookings (phone or
            meet, same link). Other tier actions keep their config hrefs. */}
        <div className="flex flex-col gap-3 mb-8">
          {primaryAction && (() => {
            const href = resolveActionHref(primaryAction.value, primaryAction.href);
            const isBooking = primaryAction.value === 'book_call';
            return (
              <a
                href={href}
                target={isBooking ? '_blank' : undefined}
                rel={isBooking ? 'noopener noreferrer' : undefined}
                onClick={() => {
                  if (note.trim()) saveNote(note.trim());
                  trackNextAction(primaryAction.value, result.tier);
                }}
                className="inline-block rounded-[var(--radius-btn)] bg-eos-blue px-6 py-3
                           text-white text-sm font-bold uppercase tracking-widest text-center
                           hover:bg-eos-accent-hover transition-colors no-underline"
              >
                {primaryAction.label}
              </a>
            );
          })()}
          {secondaryActions.map((action) => {
            const href = resolveActionHref(action.value, action.href);
            const isBooking = action.value === 'book_call';
            return (
              <a
                key={action.value}
                href={href}
                target={isBooking ? '_blank' : undefined}
                rel={isBooking ? 'noopener noreferrer' : undefined}
                onClick={() => {
                  if (note.trim()) saveNote(note.trim());
                  trackNextAction(action.value, result.tier);
                }}
                className="text-sm text-eos-blue hover:text-eos-accent-hover transition-colors text-center"
              >
                {action.label}
              </a>
            );
          })}
        </div>

        {/* Optional context — moved AFTER the CTAs so the booking action is
            primary and unobstructed. Voice/text capture for questions or
            specifics the advisor should know before the call. Auto-saves on
            blur to the lead row. Seed surface for future AI-interactive
            validation chat per user direction. */}
        <div className="pt-6 border-t border-rule">
          <p className="text-charcoal text-[13px] font-semibold mb-1.5">
            Anything specific we should know?
          </p>
          <p className="text-muted text-xs mb-2.5">
            Optional. Tell us your top question or anything that matters before the call.
          </p>
          <div className="relative">
            <textarea
              placeholder="Specific question, biggest concern, what good looks like for you…"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => { if (note.trim()) saveNote(note.trim()); }}
              className="w-full rounded-[var(--radius-btn)] border border-rule bg-white px-4 py-3 pr-10
                         text-charcoal text-sm placeholder:text-muted/50
                         focus:outline-none focus:ring-2 focus:ring-eos-blue/20 focus:border-eos-blue/40
                         transition-shadow resize-none"
            />
            <VoiceInput
              value={note}
              onChange={setNote}
              className="absolute right-2.5 top-2.5"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
