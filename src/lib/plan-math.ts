// src/lib/plan-math.ts

import { isPremiumZip, isInServiceArea } from './city-data';

// --- Runtime calculation (single source of truth) ---

/** Reference household load in kW used for all runtime estimates. 1.5 kWh/hr
 * is the realistic Houston-area essentials baseline (lights, fridge, fans,
 * Wi-Fi, plus light HVAC). Previously 0.75 kW which underestimated cycling
 * loads. */
export const REFERENCE_LOAD_KW = 1.5;

/** Compute estimated runtime in hours at the 1.5 kWh/hr reference load. */
export function runtimeAtReferenceLoad(kwhNominal: number): number {
  if (kwhNominal <= 0) return 0;
  return kwhNominal / REFERENCE_LOAD_KW;
}

/** Format runtime as a display string (e.g. "12.0"). */
export function formatRuntime(kwhNominal: number): string {
  return runtimeAtReferenceLoad(kwhNominal).toFixed(1);
}

// --- Types ---

export type HomeownerStatus = 'owner' | 'renter' | 'other';
export type HomeSizeBand = 'small' | 'medium' | 'large' | 'very_large';
export type CurrentSetup = 'none' | 'generator' | 'solar' | 'ups' | 'generator_and_solar' | 'other';
export type HoaStatus = 'yes' | 'no' | 'not_sure';
export type PrimaryPain = 'outages' | 'continuity' | 'hoa_friction' | 'solar_gaps' | 'remote_confidence' | 'other';
export type BackupScope = 'critical_loads' | 'office_and_network' | 'hvac_and_core_home' | 'whole_home_style_goal' | 'not_sure';
export type BudgetRange = 'under_10k' | '10k_20k' | '20k_35k' | '35k_plus' | 'not_sure';
export type InstallTimeline = 'asap' | '30_days' | '60_days' | '90_days' | 'researching';
export type PlanSlug = 'essential' | 'plus' | 'pro' | 'premium' | 'ultimate';
export type NextAction = 'email_options' | 'book_call' | 'start_application';

export type FitAnswers = {
  homeowner_status: HomeownerStatus;
  zip_code: string;
  home_size: HomeSizeBand;
  hoa_status: HoaStatus;
  current_setup: CurrentSetup;
};

export type NeedsAnswers = {
  primary_pain: PrimaryPain;
  backup_scope: BackupScope;
  budget_range: BudgetRange;
};

export type ResultAnswers = {
  preferred_plan: PlanSlug;
  install_timeline: InstallTimeline;
};

// --- Fit Scoring (from W0 scorecard) ---

export function scoreFit(answers: FitAnswers): number {
  let score = 0;

  // Homeowner
  if (answers.homeowner_status === 'owner') score += 15;
  if (answers.homeowner_status === 'renter') return -100; // hard disqualifier

  // ZIP
  if (!isInServiceArea(answers.zip_code)) return -100; // hard disqualifier
  if (isPremiumZip(answers.zip_code)) {
    score += 20; // replaces generic +10
  } else {
    score += 10;
  }

  // HOA
  if (answers.hoa_status === 'yes') score += 5;

  // Home size
  if (answers.home_size === 'very_large') {
    score += 10; // replaces generic +5
  } else if (answers.home_size === 'large') {
    score += 5;
  }

  // Current setup
  if (answers.current_setup === 'generator' || answers.current_setup === 'generator_and_solar') {
    score += 10;
  } else if (answers.current_setup === 'solar') {
    score += 8;
  } else if (answers.current_setup === 'none') {
    score += 3;
  }

  return score;
}

// --- Needs scoring (budget component) ---

export function scoreBudget(budget: BudgetRange): number {
  switch (budget) {
    case '35k_plus': return 20;
    case '20k_35k': return 15;
    case '10k_20k': return 8;
    case 'under_10k': return -10;
    case 'not_sure': return 0;
  }
}

// --- Plan recommendation ---

type PlanRec = {
  slug: PlanSlug;
  name: string;
  reason: string;
};

export function recommendPlans(
  fit: FitAnswers,
  needs: NeedsAnswers,
): PlanRec[] {
  const recs: PlanRec[] = [];

  // Scope-based primary recommendation
  if (needs.backup_scope === 'critical_loads' || needs.backup_scope === 'office_and_network') {
    recs.push({ slug: 'essential', name: 'Essential', reason: 'Covers critical circuits, pairs well with V2X if you have an EV' });
    recs.push({ slug: 'plus', name: 'Plus', reason: 'More headroom for additional loads' });
  } else if (needs.backup_scope === 'hvac_and_core_home') {
    recs.push({ slug: 'plus', name: 'Plus', reason: 'The most popular pick. Balanced coverage, clean V2X upgrade path' });
    recs.push({ slug: 'pro', name: 'Pro', reason: 'Generator-alternative sizing (marketed as Reserve) for core-home coverage' });
  } else if (needs.backup_scope === 'whole_home_style_goal') {
    recs.push({ slug: 'premium', name: 'Premium', reason: 'More fixed capacity for whole-home coverage on the same clean platform' });
    recs.push({ slug: 'ultimate', name: 'Ultimate', reason: 'Top of the residential stack for maximum runtime' });
  } else {
    // not_sure — default to Plus as the most popular pick, then right-size
    if (fit.home_size === 'small') {
      recs.push({ slug: 'essential', name: 'Essential', reason: 'Good starting point for smaller homes' });
      recs.push({ slug: 'plus', name: 'Plus', reason: 'Most popular step up with V2X pairing option' });
    } else if (fit.home_size === 'medium') {
      recs.push({ slug: 'plus', name: 'Plus', reason: 'The most popular pick for mid-size homes' });
    } else {
      recs.push({ slug: 'pro', name: 'Pro', reason: 'Generator-alternative sizing (Reserve) for larger homes' });
    }
  }

  // Generator-alternative override
  if (fit.current_setup === 'generator' || fit.current_setup === 'generator_and_solar') {
    const hasPro = recs.some((r) => r.slug === 'pro');
    if (!hasPro) {
      recs.unshift({ slug: 'pro', name: 'Pro', reason: 'Direct generator replacement (marketed as Reserve). Silent, no fuel, no HOA friction' });
    }
  }

  // Solar-add override
  if (fit.current_setup === 'solar' && needs.primary_pain === 'solar_gaps') {
    const hasPlus = recs.some((r) => r.slug === 'plus');
    if (!hasPlus) {
      recs.unshift({ slug: 'plus', name: 'Plus', reason: 'Pairs well with existing solar installation' });
    }
  }

  // Budget filter — soft ceiling only. Essential now starts at $10,555 so under_10k
  // has no perfect fit; surface Essential as the closest option rather than dropping all.
  if (needs.budget_range === 'under_10k') {
    return [{ slug: 'essential', name: 'Essential', reason: 'Closest fit to this budget. Essential starts just above $10K' }];
  }
  if (needs.budget_range === '10k_20k') {
    return recs.filter((r) => r.slug === 'essential' || r.slug === 'plus' || r.slug === 'pro');
  }

  // Deduplicate by slug, keep first occurrence
  const seen = new Set<string>();
  return recs.filter((r) => {
    if (seen.has(r.slug)) return false;
    seen.add(r.slug);
    return true;
  });
}

// --- Qualification tier ---

export type QualTier = 'cold' | 'engaged' | 'qualified' | 'warm';

export function qualificationTier(score: number): QualTier {
  if (score >= 81) return 'warm';
  if (score >= 61) return 'qualified';
  if (score >= 31) return 'engaged';
  return 'cold';
}

// --- Install timeline bonus ---

export function scoreInstallTimeline(timeline: InstallTimeline): number {
  const base = 8; // install_timing_selected
  switch (timeline) {
    case 'asap': return base + 5;
    case '30_days': return base + 3;
    case '60_days': return base;
    case '90_days': return base;
    case 'researching': return 0; // no bonus for researching — not a timing signal
  }
}
