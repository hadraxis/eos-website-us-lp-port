import { siteContent } from '@/content/generated/site-content';
import type { ComparisonDoc, LearnDoc, LocationDoc, PlanDoc } from './types';

export { siteContent };

// Canonical display order: smallest to largest by finance price, V2X add-on last
const PLAN_ORDER = ['essential', 'plus', 'pro', 'premium', 'ultimate', 'v2x'];
export const sortedPlans: PlanDoc[] = (PLAN_ORDER
  .map((slug) => siteContent.plans.find((p) => p.slug === slug))
  .filter(Boolean) as PlanDoc[]);

export function getPlanDoc(slug: string): PlanDoc | undefined {
  return siteContent.plans.find((plan) => plan.slug === slug);
}

export function getComparisonDoc(slug: string): ComparisonDoc | undefined {
  return siteContent.comparisons.find((comparison) => comparison.slug === slug);
}

export function getLearnDoc(slug: string): LearnDoc | undefined {
  return siteContent.learnDocs.find((doc) => doc.slug === slug);
}

export function getLocationDoc(slug: string): LocationDoc | undefined {
  return siteContent.locations.find((location) => location.slug === slug);
}

export const publicRoutes = [
  siteContent.home.canonical_path,
  siteContent.planHub.canonical_path,
  ...siteContent.plans.map((plan) => plan.canonical_path),
  siteContent.compareHub.canonical_path,
  ...siteContent.comparisons.map((comparison) => comparison.canonical_path),
  siteContent.learnHub.canonical_path,
  ...siteContent.learnDocs.map((doc) => doc.canonical_path),
  siteContent.locationsHub.canonical_path,
  ...siteContent.locations.map((location) => location.canonical_path),
  siteContent.faqPage.canonical_path,
  siteContent.about.canonical_path,
  siteContent.residential.canonical_path,
  siteContent.commercial.canonical_path,
  siteContent.estimate.canonical_path,
] as const;
