/**
 * Scores a set of answers against the config.
 * All weights live in qualify.config.ts — edit there, not here.
 */

import { QUALIFY_CONFIG, type QualifyConfig, type QualifyTier } from '@/lib/qualify.config';

export interface StepAnswer {
  stepId: string;
  value: string;
}

export interface ScoreBreakdown {
  total: number;
  tier: 1 | 2 | 3 | 4;
  tierLabel: string;
  tierConfig: QualifyTier;
  components: { label: string; points: number }[];
  disqualified: boolean;
  disqualifyReason?: string;
}

export function scoreAnswers(
  answers: StepAnswer[],
  config: QualifyConfig = QUALIFY_CONFIG,
): ScoreBreakdown {
  const components: { label: string; points: number }[] = [];
  let disqualified = false;
  let disqualifyReason: string | undefined;

  const get = (id: string) => answers.find((a) => a.stepId === id)?.value ?? '';

  for (const step of config.steps) {
    const value = get(step.id);
    if (!value) continue;

    // ZIP step — dynamic scoring. Outside-service-area is a SOFT drag
    // (zipOutsidePoints), NOT a hard disqual. Form's job is to qualify
    // and score, not gate the user out of the flow. CRM routing decides
    // what to do with a low-score / out-of-area lead downstream.
    if (step.inputType === 'zip') {
      const zip = value.trim();
      if (zip.length === 5) {
        const prefix = zip.slice(0, 3);
        if (config.zipHighValue.includes(zip)) {
          components.push({ label: 'High-value ZIP', points: config.zipHighPoints });
        } else if (config.zipServicePrefixes.some((p) => prefix.startsWith(p))) {
          components.push({ label: 'Service area ZIP', points: config.zipServicePoints });
        } else {
          components.push({ label: 'Outside service area', points: config.zipOutsidePoints });
        }
      }
      continue;
    }

    // Option-based steps
    const opt = step.options.find((o) => o.value === value);
    if (!opt) continue;

    components.push({ label: opt.label, points: opt.points });

    // Check disqualification
    if (step.disqualifyOn?.includes(value)) {
      disqualified = true;
      disqualifyReason = step.disqualifyMsg;
    }
  }

  // Clamp total 0–100; disqualified → 0
  const raw = components.reduce((sum, c) => sum + c.points, 0);
  const total = disqualified ? 0 : Math.max(0, Math.min(100, raw));

  // Find tier (tiers are sorted descending by minScore)
  const tierConfig =
    config.tiers.find((t) => total >= t.minScore) ?? config.tiers[config.tiers.length - 1];

  return {
    total,
    tier: tierConfig.tier,
    tierLabel: tierConfig.label,
    tierConfig,
    components,
    disqualified,
    disqualifyReason,
  };
}
