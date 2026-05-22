/**
 * INTERFACE BOUNDARY — qualify.config.ts
 *
 * Lead qual chat owns the data in this file.
 * UI chat reads this and renders. Do not split config across other files.
 *
 * Field IDs, event names, and option values align with:
 *   - eos_estimate-workflow_event-spec.md (canonical field names)
 *   - eos_bid-ranking_scratchpad.md (conversion threshold logic)
 *   - eos_paid_campaign_architecture.md (spoke 2 qualification)
 *   - Premium Home Battery Lead Qualification Framework.md (scoring weights)
 *   - Proxy-Based Acquisition.md (HOA signal, ZIP clusters)
 *   - EOS_Customer_Personas B.html (Marcus, Derek, Robert, Brian, Alex)
 *
 * Bump `version` on any breaking change so the UI can detect mismatches.
 *
 * ---------------------------------------------------------------------------
 * HOW QUALIFICATION WORKS
 * ---------------------------------------------------------------------------
 *
 * The form asks the questions that tell us if someone is a real fit:
 * homeowner, in our area, right profession, right motivation, right timeline.
 *
 * Separately, we can look at where they came from and what pages they visited
 * to add context — but that's just normal lead source tracking, not anything
 * exotic. The form does the actual qualifying.
 *
 * Budget note: don't lead with total cost. This customer thinks in monthly
 * payments, same as a mortgage or car. Ask what monthly feels comfortable.
 * ---------------------------------------------------------------------------
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QualifyOption {
  value: string;
  label: string;
  sublabel?: string;
  /** Scoring points for selecting this option. Negative = down-rank. */
  points: number;
}

export interface QualifyStep {
  id: string;
  question: string;
  subtitle?: string;
  inputType?: 'select' | 'zip' | 'address';
  options: QualifyOption[];
  /** Option values that immediately end the flow as disqualified */
  disqualifyOn?: string[];
  disqualifyMsg?: string;
  /**
   * If true, this step is optional / informational and does not block progression.
   * Used for steps that collect CRM data but don't affect score.
   */
  optional?: boolean;
}

export interface QualifyTier {
  tier: 1 | 2 | 3 | 4;
  label: string;
  /** Minimum score (inclusive) to reach this tier */
  minScore: number;
  heading: string;
  body: string;
  /**
   * Ordered next-action options shown at result screen.
   * Maps to event spec: email_options | book_call | start_application
   */
  nextActions: {
    value: 'email_options' | 'book_call' | 'start_application' | 'learn_more';
    label: string;
    href: string;
    primary?: boolean;
  }[];
}

export interface QualifyConfig {
  version: string;
  steps: QualifyStep[];
  tiers: QualifyTier[];            // sorted descending by minScore
  zipHighValue: string[];          // exact 5-digit ZIPs → +zipHighPoints
  zipServicePrefixes: string[];    // 3-char prefixes → +zipServicePoints
  zipHighPoints: number;
  zipServicePoints: number;
  /** Penalty applied when ZIP is outside both highValue + servicePrefixes.
   *  Negative score, NOT a disqualifier — keeps the lead in-flow. */
  zipOutsidePoints: number;
  /**
   * PostHog / analytics event names — map to eos_estimate-workflow_event-spec.md.
   * UI should fire these at the correct transition points.
   */
  events: {
    stepView: string;              // per step on mount
    stepAnswer: string;            // per answer
    stepComplete: string;          // per answer, with time-on-step + is_change
    stepBack: string;              // user clicked Back
    abandoned: string;             // visibilitychange to hidden mid-flow
    fitQuestionsCompleted: string; // after last fit question (before result)
    monthlyComfort: string;        // after monthly_comfort step (replaces price_survival)
    resultShown: string;           // final result shown
    highIntent: string;            // tier 1 or 2 result
    disqualified: string;          // disqualify path
    leadSubmittedToCrm: string;    // fires after saveSubmission with full payload + scoring
  };
}

// ---------------------------------------------------------------------------
// Shared tiers (declared before the configs so both Generator + Lightning
// can reference the same array inline without post-declaration mutation).
// ---------------------------------------------------------------------------

const SHARED_TIERS: QualifyTier[] = [
  {
    tier: 1,
    label: 'Assessment-Ready',
    minScore: 81,
    heading: "You're a strong fit.",
    body: "Your home, location, and budget align well with a whole-home battery system. The fastest next step is a free on-site assessment. We'll confirm your panel, load profile, and best configuration.",
    nextActions: [
      { value: 'book_call',     label: 'Book Free Assessment', href: '/contact', primary: true },
      { value: 'email_options', label: 'Email My Options',     href: '/contact' },
    ],
    // start_application removed — out of stage. Application only comes AFTER
    // proposal review; pre-proposal users have nothing to apply for. Path
    // was duplicating the booking intent anyway.
  },
  {
    tier: 2,
    label: 'Qualified',
    minScore: 61,
    heading: 'Strong match.',
    body: "Your home and goals align with what our systems deliver. A quick call with our engineering team will clarify sizing, financing, and timeline, without pressure.",
    nextActions: [
      { value: 'book_call',       label: 'Schedule a Call',        href: '/contact',  primary: true },
      { value: 'email_options',   label: 'Email My Options First', href: '/contact' },
      { value: 'learn_more',      label: 'Compare System Plans',   href: '/compare' },
    ],
  },
  {
    tier: 3,
    label: 'Engaged',
    minScore: 31,
    heading: "Let's explore your options.",
    body: "There's potential here. Our system comparison breaks down plans, financing, and what backup coverage looks like for homes like yours. No obligation.",
    nextActions: [
      { value: 'learn_more',    label: 'Compare System Plans', href: '/compare',  primary: true },
      { value: 'email_options', label: 'Email Me the Guide',   href: '/contact' },
    ],
  },
  {
    tier: 4,
    label: 'Cold',
    minScore: 0,
    heading: "We'll keep you in the loop.",
    body: "A whole-home system may not be the right fit today, but the Houston grid is shifting fast. We'll share updates as options expand.",
    nextActions: [
      { value: 'learn_more', label: 'Learn About Battery Systems', href: '/learn', primary: true },
    ],
  },
];

// ---------------------------------------------------------------------------
// Config — edit this block
// ---------------------------------------------------------------------------

export const QUALIFY_CONFIG: QualifyConfig = {
  version: '1.2.0',

  // --- ZIP scoring ---
  zipHighPoints: 20,
  zipServicePoints: 10,
  // Soft drag — out-of-service-area ZIPs get a score penalty but are NOT
  // disqualified at the UX level. Lead still lands on a result screen; CRM
  // can route to "not currently served" follow-up sequence.
  zipOutsidePoints: -15,

  // High-value Houston clusters per Proxy-Based Acquisition doc:
  // River Oaks, West University, Memorial Villages, The Woodlands, Katy, Clear Lake
  zipHighValue: [
    '77024', '77055', '77056', '77027', '77019', // Memorial / Piney Point / River Oaks
    '77005', '77025', '77030',                    // West University / Southside / Bellaire
    '77401',                                       // Bellaire city proper
    '77380', '77381', '77382', '77389',            // The Woodlands
    '77494', '77450', '77459',                     // Katy / Sugar Land / Missouri City
    '77058', '77059', '77062',                     // Clear Lake / NASA
    '77002', '77003', '77004', '77006', '77007', '77008', '77009', '77098', // Inner Loop
    '77339', '77345', '77346',                     // Kingwood / Humble
    '77573', '77546',                              // League City / Friendswood
  ],

  // Broad Houston service area (3-char prefix match)
  zipServicePrefixes: ['770', '773', '774', '775'],

  // --- Event names (from eos_estimate-workflow_event-spec.md) ---
  events: {
    stepView: 'qualify_step_view',
    stepAnswer: 'qualify_step_answer',
    stepComplete: 'qualify_step_complete',
    stepBack: 'qualify_step_back',
    abandoned: 'qualify_abandoned',
    fitQuestionsCompleted: 'fit_questions_completed',  // candidate primary conversion
    monthlyComfort: 'qualify_monthly_comfort',   // replaces price_survival — monthly frame, not sticker shock
    resultShown: 'qualify_result_shown',
    highIntent: 'qualify_high_intent',
    disqualified: 'qualify_disqualified',
    leadSubmittedToCrm: 'lead_submitted_to_crm',
  },

  // Steps — ordered: location pair first (fail-fast service-area gate), their
  // world next, fit context middle, money late, ownership gate last.
  steps: [
    // 1. Install address — required, no score. Captures street address so the
    //    advisor has site notes ready before the callback. Autofills from
    //    Safari Keychain / Android Smart Lock in one tap.
    {
      id: 'install_address',
      question: 'First, where\'s the install going?',
      subtitle: 'Street address of the home this would be installed at.',
      inputType: 'address',
      options: [],
    },

    // 2. ZIP — service-area gate. Moved up from last position so we fail fast
    //    on out-of-area leads instead of burning them through 9 questions.
    {
      id: 'zip_code',
      question: 'And your ZIP?',
      subtitle: 'Confirms we serve your area before we go further.',
      inputType: 'zip',
      options: [],
      // No disqualifyMsg — out-of-service-area is a SOFT penalty applied in
      // scoring.ts via zipOutsidePoints. Lead still flows to a result screen.
    },

    // 3. What are they trying to solve? — open with their need, not our process
    {
      id: 'primary_pain',
      question: 'What problem are you mainly trying to solve?',
      options: [
        { value: 'outages',           label: 'Power outages',              sublabel: 'Keep the lights on when ERCOT goes down',         points: 15 },
        { value: 'continuity',        label: 'Work or business continuity',sublabel: 'Can\'t afford downtime at home',                  points: 12 },
        { value: 'hoa_friction',      label: 'HOA won\'t allow a generator',sublabel: 'Need a quiet, compliant alternative',            points: 14 },
        { value: 'solar_gaps',        label: 'Solar doesn\'t cover my nights',sublabel: 'Want storage behind existing solar',           points: 10 },
        { value: 'remote_confidence', label: 'Vacation or remote home',   sublabel: 'Need the home to run itself',                     points: 8  },
        { value: 'other',             label: 'Something else',            points: 5 },
      ],
    },

    // 2. What are they starting from?
    {
      id: 'current_setup',
      question: 'What are you working with now?',
      subtitle: 'Helps us understand what you\'d be upgrading or adding to.',
      options: [
        { value: 'none',                label: 'Nothing yet',              sublabel: 'Starting from scratch',                           points: 10 },
        { value: 'generator',           label: 'Gas generator',            sublabel: 'Looking to replace or supplement it',             points: 12 },
        { value: 'solar',               label: 'Solar panels',             sublabel: 'Want to add storage to existing solar',           points: 15 },
        { value: 'generator_and_solar', label: 'Generator and solar',      sublabel: 'Looking to consolidate or upgrade',               points: 8  },
        { value: 'ups',                 label: 'Small UPS or APC unit',   sublabel: 'Protecting a few devices, want whole-home',       points: 8  },
        { value: 'other',               label: 'Something else',           points: 5 },
      ],
    },

    // 3. Works from home — outage affects their income, not just comfort
    {
      id: 'works_from_home',
      question: 'Do you work from home?',
      subtitle: 'If an outage affects your work, backup power pays for itself differently.',
      options: [
        { value: 'full_time', label: 'Yes, full time',  sublabel: 'Home is my office. Downtime costs money', points: 12 },
        { value: 'part_time', label: 'Yes, part time',  sublabel: 'A few days a week from home',              points: 7  },
        { value: 'no',        label: 'No',              points: 0 },
      ],
    },

    // 4. EV — relevant for system sizing and integration
    {
      id: 'has_ev',
      question: 'Do you have an electric vehicle?',
      subtitle: 'EV owners often want their car, solar, and battery working as one system.',
      options: [
        { value: 'yes',  label: 'Yes',               sublabel: 'EV already in the garage',  points: 8 },
        { value: 'soon', label: 'Getting one soon',  sublabel: 'Planning the full setup',    points: 5 },
        { value: 'no',   label: 'No',                points: 0 },
      ],
    },

    // 5. Occupation — tells us about their home use and what downtime costs them
    {
      id: 'occupation',
      question: 'What do you do for work?',
      subtitle: 'Helps us understand what matters most in your setup.',
      options: [
        { value: 'medical',   label: 'Healthcare / Medical',       sublabel: 'Physician, surgeon, nurse',       points: 15 },
        { value: 'energy',    label: 'Energy / Oil & Gas',         sublabel: 'Operator, engineer, executive',   points: 12 },
        { value: 'executive', label: 'Executive / Business owner', sublabel: 'C-suite, founder, manager',       points: 12 },
        { value: 'tech',      label: 'Technology / Engineering',   sublabel: 'Software, systems, infrastructure',points: 10 },
        { value: 'legal_fin', label: 'Legal / Finance',            sublabel: 'Attorney, CPA, advisor',          points: 10 },
        { value: 'retired',   label: 'Retired',                    sublabel: 'Full-time homeowner',             points: 8  },
        { value: 'other',     label: 'Something else',             points: 5 },
      ],
    },

    // 6. Home size — neutral, helpful for sizing
    {
      id: 'home_size_band',
      question: 'Roughly how large is your home?',
      subtitle: 'Helps us estimate the system capacity you\'ll need.',
      options: [
        { value: 'very_large', label: '4,000+ sqft',         points: 5 },
        { value: 'large',      label: '2,500 – 4,000 sqft',  points: 4 },
        { value: 'medium',     label: '1,500 – 2,500 sqft',  points: 3 },
        { value: 'small',      label: 'Under 1,500 sqft',    points: 2 },
      ],
    },

    // 7. HOA — relevant context, not a gate
    {
      id: 'hoa_status',
      question: 'Is your home in an HOA?',
      subtitle: 'Many HOAs restrict generators. Battery systems are HOA-compliant.',
      options: [
        { value: 'yes',      label: 'Yes, I have an HOA', sublabel: 'Battery is typically the only compliant option', points: 15 },
        { value: 'no',       label: 'No HOA',             points: 5 },
        { value: 'not_sure', label: 'Not sure',           points: 3 },
      ],
    },

    // 8. Timeline — when are they actually trying to move?
    {
      id: 'install_timeline',
      question: 'When would you ideally want it installed?',
      subtitle: 'Most installs take several weeks after permitting.',
      options: [
        { value: 'asap',        label: 'As soon as possible', points: 10 },
        { value: '30_days',     label: 'Within 30 days',      points: 9  },
        { value: '60_days',     label: 'Within 60 days',      points: 7  },
        { value: '90_days',     label: 'Within 90 days',      points: 5  },
        { value: 'researching', label: 'Just researching',    points: 0  },
      ],
    },

    // 9. Who's involved — routes result CTA, no score impact
    {
      id: 'decision_authority',
      question: 'Who\'s involved in this decision?',
      optional: true,
      options: [
        { value: 'sole',  label: 'Just me',                    points: 0 },
        { value: 'joint', label: 'Me and my spouse / partner', sublabel: 'We decide together',      points: 0 },
        { value: 'other', label: 'Others involved',            sublabel: 'Business partner, etc.',  points: 0 },
      ],
    },

    // 10. Monthly comfort — money question comes after rapport
    //     Ranges map to actual plan finance pricing (per content/plans/*.md):
    //       Essential $87/mo · Plus $116/mo · Pro $144/mo · Premium $173/mo · Ultimate $201/mo
    //     Every bracket lands on a real plan — no "below floor" framing. Under
    //     $100 IS Essential, a fully qualified entry point.
    {
      id: 'monthly_comfort',
      question: 'What monthly payment feels comfortable for a home upgrade like this?',
      subtitle: 'Most of our customers finance, same idea as a car or mortgage payment.',
      options: [
        { value: '200_plus',    label: '$200 or more / month',  sublabel: 'Ultimate tier territory',                       points: 28 },
        { value: '150_199',     label: '$150 – $200 / month',   sublabel: 'Premium tier',                                  points: 22 },
        { value: '120_149',     label: '$120 – $150 / month',   sublabel: 'Pro tier',                                      points: 18 },
        { value: '100_119',     label: '$100 – $120 / month',   sublabel: 'Plus tier',                                     points: 14 },
        { value: 'under_100',   label: 'Under $100 / month',    sublabel: 'Essential plan — a flexible entry point',       points: 10 },
        { value: 'pay_in_full', label: 'Prefer to pay in full', sublabel: 'No financing needed',                           points: 15 },
        { value: 'not_sure',    label: 'Not sure yet',          sublabel: 'Want to see the numbers first',                 points: 5  },
      ],
    },

    // 11. Homeownership — gate, asked late after they're already invested
    {
      id: 'homeowner_status',
      question: 'Do you own your home?',
      subtitle: 'Battery systems are permanently installed infrastructure.',
      options: [
        { value: 'owner',  label: 'Yes, I own it',  points: 15 },
        { value: 'other',  label: 'Buying soon',    points: 5  },
        { value: 'renter', label: 'No, I rent',     points: -100 },
      ],
      // Internal flag — sets disqualified=true on the lead record for CRM
      // segmentation and ad-platform exclusion lists. Does NOT stop the
      // flow; user still reaches the standard tier-based result screen.
      disqualifyOn: ['renter'],
      disqualifyMsg: 'Renter — battery installs require homeownership. Internal flag only.',
    },
  ],

  // Tiers — shared across angles (declared at top of file)
  tiers: SHARED_TIERS,
};

// ---------------------------------------------------------------------------
// Lightning LP config — F-150 Lightning EV owners
//
// Audience: Lightning owners stranded by Ford HIS shutdown looking for a
// bidirectional charger + home battery. EV ownership is implicit (always
// yes), so the generic `has_ev` step is replaced by 4 Lightning-specific
// questions covering year, count, trim, and V2H usage.
//
// Reuses Generator tiers, ZIPs, events. Steps diverge only at the
// has_ev slot — the rest mirrors the Generator flow so scoring + result
// behavior stay consistent across LPs.
// ---------------------------------------------------------------------------

export type QualifyAngle = 'generator' | 'lightning';

const HAS_EV_INDEX = QUALIFY_CONFIG.steps.findIndex((s) => s.id === 'has_ev');

const LIGHTNING_STEPS: QualifyStep[] = [
  // Lightning year — older units (2022/2023) hit hardest by Ford HIS lockout
  {
    id: 'lightning_year',
    question: 'Which Lightning year do you drive?',
    subtitle: 'Helps us match firmware + Ford Charge Station Pro behavior to your truck.',
    options: [
      { value: '2022',  label: '2022', sublabel: 'Pre-Charge-Station-Pro recall era',     points: 12 },
      { value: '2023',  label: '2023', sublabel: 'Most affected by Ford HIS shutdown',    points: 14 },
      { value: '2024',  label: '2024', sublabel: 'Newer firmware, V2H ready',             points: 10 },
      { value: '2025+', label: '2025 or newer', sublabel: 'Latest hardware revision',     points: 10 },
    ],
  },

  // Lightning trim / battery — Extended Range = more usable kWh through V2H
  {
    id: 'lightning_trim',
    question: 'Standard Range or Extended Range battery?',
    subtitle: 'Extended Range gives ~131 kWh on board, roughly double Standard.',
    options: [
      { value: 'extended', label: 'Extended Range',   sublabel: '~131 kWh — Lariat ER / Platinum',     points: 10 },
      { value: 'standard', label: 'Standard Range',   sublabel: '~98 kWh — Pro / XLT / Lariat SR',     points: 7  },
      { value: 'not_sure', label: 'Not sure',          points: 4 },
    ],
  },

  // EV count — more EVs = larger sustained home load + bigger battery sizing
  {
    id: 'ev_count',
    question: 'How many EVs in the household?',
    subtitle: 'Total EVs charging at home, including the Lightning.',
    options: [
      { value: '1',    label: 'Just the Lightning',    points: 6  },
      { value: '2',    label: '2 EVs',                 sublabel: 'Lightning plus one other',  points: 9 },
      { value: '3plus',label: '3 or more',             sublabel: 'EV-heavy household',        points: 12 },
    ],
  },

  // V2H usage — high intent if already using or actively looking
  {
    id: 'v2h_use',
    question: 'Are you using vehicle-to-home (V2H) today?',
    subtitle: 'Truck powering the house during outages, via Ford Charge Station Pro or aftermarket.',
    options: [
      { value: 'using_ford',      label: 'Yes, with Ford Charge Station Pro',    sublabel: 'May be affected by Ford HIS shutdown',           points: 16 },
      { value: 'using_aftermarket', label: 'Yes, with a third-party bidirectional charger', sublabel: 'Already on the path',                points: 14 },
      { value: 'need_charger',    label: 'No, looking for a V2H charger now',    sublabel: 'Primary reason for visiting',                   points: 15 },
      { value: 'exploring',       label: "Exploring, not committed yet",          sublabel: "Want to understand the options",                points: 10 },
      { value: 'not_interested',  label: "Not interested in V2H",                 sublabel: "Just want home battery backup",                 points: 4  },
    ],
  },
];

const LIGHTNING_STEPS_FULL: QualifyStep[] =
  HAS_EV_INDEX >= 0
    ? [
        ...QUALIFY_CONFIG.steps.slice(0, HAS_EV_INDEX),
        ...LIGHTNING_STEPS,
        ...QUALIFY_CONFIG.steps.slice(HAS_EV_INDEX + 1),
      ]
    : [...QUALIFY_CONFIG.steps, ...LIGHTNING_STEPS];

export const QUALIFY_CONFIG_LIGHTNING: QualifyConfig = {
  ...QUALIFY_CONFIG,
  version: '1.2.0-lightning',
  steps: LIGHTNING_STEPS_FULL,
  tiers: SHARED_TIERS,
};

export function getQualifyConfig(angle: QualifyAngle = 'generator'): QualifyConfig {
  return angle === 'lightning' ? QUALIFY_CONFIG_LIGHTNING : QUALIFY_CONFIG;
}
