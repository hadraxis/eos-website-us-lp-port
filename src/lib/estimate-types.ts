// src/lib/estimate-types.ts

import type {
  HomeownerStatus,
  HomeSizeBand,
  CurrentSetup,
  HoaStatus,
  PrimaryPain,
  BackupScope,
  BudgetRange,
  InstallTimeline,
  PlanSlug,
  NextAction,
} from './plan-math';

// --- Step identifiers ---

export type EstimateStep = 'intro' | 'fit' | 'needs' | 'results' | 'next_step' | 'confirmation';

export const STEP_ORDER: EstimateStep[] = ['intro', 'fit', 'needs', 'results', 'next_step', 'confirmation'];

export const STEP_LABELS: Record<EstimateStep, string> = {
  intro: 'Who You Are',
  fit: 'About Your Home',
  needs: 'What You Need',
  results: 'Your Options',
  next_step: 'Choose Next Step',
  confirmation: 'Done',
};

// --- Form state ---

export type EstimateState = {
  step: EstimateStep;

  // Fit (step 1)
  homeowner_status: HomeownerStatus | null;
  zip_code: string;
  home_size: HomeSizeBand | null;
  hoa_status: HoaStatus | null;
  current_setup: CurrentSetup | null;

  // Needs (step 2)
  primary_pain: PrimaryPain | null;
  backup_scope: BackupScope | null;
  budget_range: BudgetRange | null;

  // Results (step 3)
  preferred_plan: PlanSlug | null;
  install_timeline: InstallTimeline | null;

  // Next step (step 4)
  next_action: NextAction | null;
  name: string;
  email: string;
  phone: string;
  notes: string;

  // Computed
  fit_score: number;
  budget_score: number;
  intent_score: number;
  total_score: number;

  // Meta
  angle: string;
  utm_source: string;
  utm_campaign: string;
  submitted_at: string | null;
  confirmation_id: string | null;
};

export const INITIAL_STATE: EstimateState = {
  step: 'intro',
  homeowner_status: null,
  zip_code: '',
  home_size: null,
  hoa_status: null,
  current_setup: null,
  primary_pain: null,
  backup_scope: null,
  budget_range: null,
  preferred_plan: null,
  install_timeline: null,
  next_action: null,
  name: '',
  email: '',
  phone: '',
  notes: '',
  fit_score: 0,
  budget_score: 0,
  intent_score: 0,
  total_score: 0,
  angle: '',
  utm_source: '',
  utm_campaign: '',
  submitted_at: null,
  confirmation_id: null,
};

// --- Reducer actions ---

export type EstimateAction =
  | { type: 'SET_FIELD'; field: keyof EstimateState; value: EstimateState[keyof EstimateState] }
  | { type: 'ADVANCE_STEP' }
  | { type: 'GO_BACK' }
  | { type: 'SET_SCORES'; fit_score: number; budget_score: number; intent_score: number }
  | { type: 'SUBMIT'; confirmation_id: string; submitted_at: string }
  | { type: 'RESET' }
  | { type: 'HYDRATE'; state: Partial<EstimateState> };

// --- PostHog event names (from W0/W2 specs) ---

export const ESTIMATE_EVENTS = {
  OPENED: 'estimate_opened',
  STARTED: 'estimate_started',
  FIT_COMPLETED: 'fit_questions_completed',
  OPTIONS_VIEWED: 'options_viewed',
  PREFERRED_SELECTED: 'preferred_option_selected',
  INSTALL_TIMING: 'install_timing_selected',
  QUALIFIED_COMPLETE: 'qualified_estimate_completed',
  PRICE_SURVIVED: 'price_context_survived',
  EMAIL_OPTIONS: 'email_options_after_estimate',
  CALL_BOOKED: 'call_booked_after_estimate',
  APP_STARTED: 'application_started_after_estimate',
} as const;

// --- Session storage key ---

export const STORAGE_KEY = 'eos-estimate-state';
