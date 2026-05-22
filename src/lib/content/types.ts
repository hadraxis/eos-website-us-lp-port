export type DocStatus = 'published' | 'archived';

export type ImageSlotStatus = 'needed' | 'planned' | 'ready' | 'delivered';

export type ImageOrientation = 'landscape' | 'portrait' | 'square';

export type LinkItem = {
  href: string;
  label: string;
};

export type StatItem = {
  value: string;
  label: string;
};

export type FAQItem = {
  question: string;
  answer: string;
  category?: string;
};

export type Section = {
  heading: string;
  body: string[];
};

export type ImageSlot = {
  slot_id: string;
  purpose: string;
  suggested_subject: string;
  orientation: ImageOrientation;
  alt_text: string;
  seo_filename: string;
  status: ImageSlotStatus;
  prompt_brief?: string;
  intended_placement?: string;
  delivered_asset_path?: string;
};

export type BaseDoc = {
  page_type: string;
  title: string;
  slug: string;
  canonical_path: string;
  meta_title: string;
  meta_description: string;
  redirect_from: string[];
  status: DocStatus;
  image_slots: ImageSlot[];
  image_not_required?: boolean;
};

export type HomeDoc = BaseDoc & {
  page_type: 'home';
  hero: {
    eyebrow: string;
    title: string;
    summary: string;
    primary_cta: LinkItem;
    secondary_cta?: LinkItem;
    stats: StatItem[];
  };
  route_blocks: {
    title: string;
    body: string;
    href: string;
    label: string;
  }[];
  proof_sections: {
    title: string;
    body: string;
  }[];
  cta: {
    headline: string;
    subtext: string;
  };
};

export type PlanDoc = BaseDoc & {
  page_type: 'plan';
  name: string;
  tagline: string;
  hero_title: string;
  hero_summary: string;
  hero_stats: StatItem[];
  pricing: {
    cash_price: number;
    finance_price?: number;
    monthly_price: number | null;
    install_note: string;
    warranty_note: string;
  };
  specs: {
    batteries: number;
    controllers: number;
    controller_kw: string;
    kwh_nominal: number;
    kwh_usable: number;
  };
  best_for: string;
  features: string[];
  description: string[];
  faq: FAQItem[];
  cta: {
    headline: string;
    subtext: string;
  };
  highlight?: boolean;
  marketing_alias?: string;
  what_this_powers?: string[];
};

export type CommercialPlan = {
  slug: string;
  name: string;
  batteries: number;
  controllers: number;
  controller_kw: string;
  kwh_nominal: number;
  kwh_usable: number;
  cash_price: number;
  monthly_price: number;
  best_for: string;
};

export type ComparisonDoc = BaseDoc & {
  page_type: 'comparison';
  competitor: string;
  hero_title: string;
  hero_subtitle: string;
  verdict: string;
  verdict_detail: string;
  comparison_rows: {
    attr: string;
    competitor: string;
    eos: string;
    eos_wins: boolean;
  }[];
  sections: Section[];
  faq: FAQItem[];
};

export type LearnDoc = BaseDoc & {
  page_type: 'learn';
  hero_title: string;
  hero_subtitle: string;
  sections: Section[];
  faq: FAQItem[];
  related_links: LinkItem[];
};

export type LocationDoc = BaseDoc & {
  page_type: 'location';
  city: string;
  state: string;
  county: string;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    stats: StatItem[];
  };
  intro: string[];
  reasons: {
    title: string;
    body: string;
  }[];
  faq: FAQItem[];
  related_links: LinkItem[];
};

export type HubDoc = BaseDoc & {
  page_type: 'hub';
  hero: {
    eyebrow: string;
    title: string;
    summary: string;
    stats?: StatItem[];
  };
  intro: string;
  cta?: {
    headline: string;
    subtext: string;
  };
};

export type FAQPageDoc = BaseDoc & {
  page_type: 'faq_page';
  hero_title: string;
  hero_subtitle: string;
  intro: string;
  support_links: LinkItem[];
};

export type AboutDoc = BaseDoc & {
  page_type: 'about';
  hero_title: string;
  hero_subtitle: string;
  sections: Section[];
  city_links: LinkItem[];
};

export type CommercialRouteBlock = {
  title: string;
  label: string;
  body: string;
  href: string;
};

export type CommercialIcpTheme = 'emerald' | 'rose' | 'amber' | 'indigo' | 'sky' | 'violet';

export type CommercialIcpProfile = {
  pool: string;
  title: string;
  subtitle: string;
  reframe: string;
  fit_signals: string[];
  quote: string;
  plan_intercept: string;
  price_range: string;
  theme: CommercialIcpTheme;
};

export type CommercialProofSection = {
  title: string;
  body: string;
};

export type CommercialInstallSection = {
  heading: string;
  body: string[];
  inclusions: string[];
};

export type CommercialHardwareSection = {
  heading: string;
  body: string[];
  cert_disclosure?: {
    label: string;
    body: string[];
  };
};

export type CommercialFAQBlock = {
  heading: string;
  items: { q: string; a: string }[];
};

export type CommercialDoc = BaseDoc & {
  page_type: 'commercial';
  hero_title: string;
  hero_subtitle: string;
  sections?: Section[];
  route_blocks?: CommercialRouteBlock[];
  icp_profiles?: CommercialIcpProfile[];
  proof_sections?: CommercialProofSection[];
  how_install_works?: CommercialInstallSection;
  hardware_section?: CommercialHardwareSection;
  faq?: CommercialFAQBlock;
  support_links: LinkItem[];
  cta?: {
    headline: string;
    subtext: string;
  };
};

export type ResidentialDoc = BaseDoc & {
  page_type: 'residential';
  hero_title: string;
  hero_subtitle: string;
  sections: Section[];
  support_links: LinkItem[];
  cta?: {
    headline: string;
    subtext: string;
  };
};

export type EstimateDoc = BaseDoc & {
  page_type: 'estimate';
  hero_title: string;
  hero_subtitle: string;
  hero_stats: StatItem[];
  checklist_items: string[];
  cta: {
    headline: string;
    subtext: string;
  };
};

export type ArchiveDoc = BaseDoc & {
  page_type: 'archive';
  legacy_route: string;
  legacy_label: string;
  summary: string;
};

export type SiteContent = {
  home: HomeDoc;
  planHub: HubDoc;
  plans: PlanDoc[];
  compareHub: HubDoc;
  comparisons: ComparisonDoc[];
  learnHub: HubDoc;
  learnDocs: LearnDoc[];
  locationsHub: HubDoc;
  locations: LocationDoc[];
  faqPage: FAQPageDoc;
  faqItems: FAQItem[];
  about: AboutDoc;
  residential: ResidentialDoc;
  commercial: CommercialDoc;
  estimate: EstimateDoc;
  archives: {
    homeVariants: ArchiveDoc[];
    planVariants: ArchiveDoc[];
  };
};
