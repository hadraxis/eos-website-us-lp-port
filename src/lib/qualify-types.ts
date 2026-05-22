// src/lib/qualify-types.ts
import { QUALIFY_CONFIG } from '@/lib/qualify.config';

export type QualifyPhase = 'intro' | 'qualify' | 'result' | 'disqualified';

export type QualifyState = {
  phase: QualifyPhase;
  stepIndex: number;
  answers: Record<string, string>;
  score: number;
  tier: 1 | 2 | 3 | 4 | null;
  disqualifyMsg: string | null;
  // Contact
  name: string;
  email: string;
  phone: string;
  // Meta
  angle: string;
  utm_source: string;
  utm_campaign: string;
};

export type QualifyAction =
  | { type: 'SET_CONTACT'; field: 'name' | 'email' | 'phone'; value: string }
  | { type: 'INTRO_COMPLETE' }
  | { type: 'ANSWER'; stepId: string; value: string; points: number }
  | { type: 'GO_BACK' }
  | { type: 'DISQUALIFY'; msg: string }
  | { type: 'FINISH'; tier: 1 | 2 | 3 | 4 }
  | { type: 'HYDRATE'; state: Partial<QualifyState> }
  | { type: 'RESET' };

export const INITIAL_STATE: QualifyState = {
  phase: 'intro',
  stepIndex: 0,
  answers: {},
  score: 0,
  tier: null,
  disqualifyMsg: null,
  name: '',
  email: '',
  phone: '',
  angle: '',
  utm_source: '',
  utm_campaign: '',
};

export const STORAGE_KEY = 'eos-qualify-state';

/** Compute ZIP bonus/disqualify */
export function scoreZip(zip: string): { points: number; disqualify: boolean } {
  const clean = zip.trim();
  if (QUALIFY_CONFIG.zipHighValue.includes(clean)) {
    return { points: QUALIFY_CONFIG.zipHighPoints, disqualify: false };
  }
  const prefix = clean.slice(0, 3);
  if (QUALIFY_CONFIG.zipServicePrefixes.includes(prefix)) {
    return { points: QUALIFY_CONFIG.zipServicePoints, disqualify: false };
  }
  return { points: 0, disqualify: true };
}

/** Resolve tier from total score */
export function resolveTier(score: number): 1 | 2 | 3 | 4 {
  const sorted = [...QUALIFY_CONFIG.tiers].sort((a, b) => b.minScore - a.minScore);
  for (const t of sorted) {
    if (score >= t.minScore) return t.tier;
  }
  return 4;
}
