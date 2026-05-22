'use client';

import { useState, useEffect, useRef } from 'react';
import { InlineEstimate } from '@/components/estimate/InlineEstimate';
import { StatsRow } from '@/components/content/StatsRow';
import { CardCarousel, CarouselItem } from '@/components/content/CardCarousel';
import { useLPTracking, useSectionDwellTracking, useLPBfcacheResume } from '@/lib/lp-tracking';
import { track } from '@/lib/track';
import { smoothScrollToCenter } from '@/lib/scroll';
import { SchematicBackground } from './SchematicBackground';
import { ViewMoreBanner } from './ViewMoreBanner';

const ANGLE = 'generator_alternative';

// Section view + dwell tracking lives in lp-tracking.ts now so it shares
// state with the lp_exit accumulator for the lp_journey summary event.

function openEstimate(source: string) {
  // LP CTAs scroll to the Megan advisor card; they do NOT auto-open the
  // planning sheet. Megan acts as the visual breather + warm advisor framing
  // before the form. User reads Megan's pitch, then clicks her own
  // "Start Planning" button to open the qualify sheet. Two-tap intent
  // beats one-tap blind open for conversion quality.
  track('cta_qualification_click', { angle: ANGLE, source, destination: 'megan_card' });
}

function CTAButton({
  label,
  source,
  size = 'base',
  variant = 'primary',
}: {
  label: string;
  source: string;
  size?: 'base' | 'lg';
  variant?: 'primary' | 'ghost';
}) {
  const sizeClass = size === 'lg' ? 'px-7 py-4 text-base' : 'px-6 py-3.5 text-sm';
  // iOS-26 "Liquid Glass" CTA — inner-top specular highlight + outer tint shadow
  // on primary (raised pill); backdrop-blur + inner spec on ghost (frosted pill
  // over dark hero). active:scale-[0.98] gives the tactile press feel.
  const variantClass =
    variant === 'primary'
      ? 'bg-eos-accent text-white hover:bg-eos-accent-hover hover:-translate-y-px shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-1px_0_rgba(0,0,0,0.12),0_8px_24px_-8px_rgba(16,43,133,0.45)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.32),inset_0_-1px_0_rgba(0,0,0,0.12),0_12px_32px_-8px_rgba(16,43,133,0.55)]'
      : 'bg-white/12 text-white border border-white/22 hover:bg-white/18 hover:border-white/30 backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_16px_-4px_rgba(0,0,0,0.25)]';
  return (
    <a
      href="#estimate"
      onClick={(e) => {
        e.preventDefault();
        openEstimate(source);
        const el = document.getElementById('estimate');
        if (el) smoothScrollToCenter(el);
      }}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-btn no-underline transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] ${sizeClass} ${variantClass}`}
    >
      {label}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </a>
  );
}

function FAQItem({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  const handleToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (e.currentTarget.open) track('lp_faq_expand', { angle: ANGLE, question: q });
  };
  return (
    <details
      open={defaultOpen}
      onToggle={handleToggle}
      className="group border-b border-rule last:border-b-0"
    >
      <summary className="list-none [&::-webkit-details-marker]:hidden flex items-start justify-between gap-4 py-5 text-left min-h-[56px] cursor-pointer">
        <span className="text-charcoal font-semibold text-base leading-snug">{q}</span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          className="shrink-0 text-muted transition-transform duration-200 mt-0.5 group-[[open]]:rotate-45"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </summary>
      <p className="text-muted text-sm leading-relaxed pb-5 pr-8">{a}</p>
    </details>
  );
}

function CostRow({ topic, gen, eos }: { topic: string; gen: string; eos: string }) {
  const handleToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (e.currentTarget.open) track('lp_cost_expand', { angle: ANGLE, topic });
  };
  return (
    <details
      onToggle={handleToggle}
      className="group rounded-card overflow-hidden transition-all duration-300 border bg-canvas border-rule hover:border-eos-accent/20 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] [&[open]]:border-eos-accent/30 [&[open]]:shadow-[0_8px_24px_rgba(16,43,133,0.08)]"
    >
      <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-center justify-between gap-4 px-5 py-4 text-left">
        <span className="text-charcoal font-semibold text-base">{topic}</span>
        <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 bg-surface group-hover:bg-eos-accent/10 group-[[open]]:bg-eos-accent/15 group-[[open]]:rotate-180">
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" className="text-eos-accent">
            <path d="M2 3.5L5 6.5L8 3.5" />
          </svg>
        </span>
      </summary>
      <div className="grid grid-cols-2 gap-3 px-5 pb-4 text-sm">
        <div>
          <p className="text-muted text-[11px] font-semibold tracking-wide mb-1">Generator</p>
          <p className="text-charcoal">{gen}</p>
        </div>
        <div>
          <p className="text-eos-accent text-[11px] font-semibold tracking-wide mb-1">Eos Battery</p>
          <p className="text-eos-accent font-semibold">{eos}</p>
        </div>
      </div>
    </details>
  );
}

function AttributeCard({
  topic,
  gen,
  eos,
}: {
  topic: string;
  gen: string;
  eos: string;
}) {
  const handleToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (e.currentTarget.open) track('lp_attribute_expand', { angle: ANGLE, topic });
  };
  return (
    <details
      onToggle={handleToggle}
      className="group rounded-card overflow-hidden transition-all duration-300 border bg-canvas border-rule hover:border-eos-accent/20 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] [&[open]]:border-eos-accent/30 [&[open]]:shadow-[0_8px_24px_rgba(16,43,133,0.08)]"
    >
      <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-center justify-between gap-4 px-5 py-4 text-left">
        <p className="text-charcoal font-semibold text-base">{topic}</p>
        <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 bg-surface group-hover:bg-eos-accent/10 group-[[open]]:bg-eos-accent/15 group-[[open]]:rotate-180">
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" className="text-eos-accent">
            <path d="M2 3.5L5 6.5L8 3.5" />
          </svg>
        </span>
      </summary>
      <div className="flex flex-col border-t border-rule">
        <div className="flex items-start gap-3 px-5 py-4 border-b border-rule">
          <span className="text-muted/50 text-base shrink-0 leading-tight">✕</span>
          <div>
            <p className="text-muted text-[12px] font-semibold tracking-wide mb-1">Standby generator</p>
            <p className="text-charcoal text-sm leading-relaxed">{gen}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 px-5 py-4 bg-eos-accent/5">
          <span className="text-eos-accent text-base shrink-0 leading-tight">✓</span>
          <div>
            <p className="text-eos-accent text-[12px] font-semibold tracking-wide mb-1">Eos Battery</p>
            <p className="text-charcoal text-sm font-medium leading-relaxed">{eos}</p>
          </div>
        </div>
      </div>
    </details>
  );
}

const TIERS = [
  {
    slug: 'pro',
    label: 'Pro',
    batteries: 3,
    kwh: '26.28',
    runtime: 'about 17 hours',
    price: 16472,
    photo: '/images/lp/stacks/products/pro-1-3.webp',
    photoAlt: 'Pro tier — SigenStor 1 controller + 3 battery modules',
  },
  {
    slug: 'premium',
    label: 'Premium',
    batteries: 4,
    kwh: '35.04',
    runtime: 'about 23 hours',
    price: 19751,
    photo: '/images/lp/stacks/products/premium-1-4.webp',
    photoAlt: 'Premium tier — SigenStor 1 controller + 4 battery modules',
  },
  {
    slug: 'ultimate',
    label: 'Ultimate',
    batteries: 5,
    kwh: '43.80',
    runtime: 'about 29 hours',
    price: 23029,
    photo: '/images/lp/stacks/products/ultimate-1-5.webp',
    photoAlt: 'Ultimate tier — SigenStor 1 controller + 5 battery modules',
  },
];

function PricingPicker() {
  const [selected, setSelected] = useState('pro');
  const activeIndex = TIERS.findIndex((t) => t.slug === selected);
  const tier = TIERS[activeIndex >= 0 ? activeIndex : 0];
  const pick = (slug: string) => {
    if (slug === selected) return;
    setSelected(slug);
    track('lp_pricing_tier_select', { angle: ANGLE, tier: slug });
  };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-6 lg:gap-12 lg:items-center">
      {/* Left: pill + product shot */}
      <div className="flex flex-col gap-4 lg:gap-5">
        {/* Morphing pill selector — colored bg "melts" between tiers via translateX */}
        <div
          role="tablist"
          aria-label="Pick a system size"
          className="relative grid grid-cols-3 gap-0 max-w-[420px] lg:max-w-none glass-thin rounded-btn p-1"
        >
          <div
            aria-hidden="true"
            className="absolute top-1 bottom-1 rounded-btn bg-eos-accent shadow-[0_4px_16px_rgba(16,43,133,0.25)] transition-transform duration-[420ms] ease-[cubic-bezier(0.5,1.4,0.5,1)]"
            style={{
              left: '4px',
              width: 'calc((100% - 8px) / 3)',
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          />
          {TIERS.map((t) => (
            <button
              key={t.slug}
              type="button"
              role="tab"
              id={`pricing-tab-${t.slug}`}
              aria-controls={`pricing-panel-${t.slug}`}
              tabIndex={selected === t.slug ? 0 : -1}
              onClick={() => pick(t.slug)}
              aria-selected={selected === t.slug}
              className={`relative z-10 px-3 py-3 min-h-[44px] rounded-btn text-sm font-semibold cursor-pointer border-none bg-transparent transition-colors duration-300 ${
                selected === t.slug ? 'text-white' : 'text-charcoal hover:text-eos-accent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tier product shot — transparent PNG. Soft surface + radial glow behind so the
            product floats clean. object-contain so nothing crops, centered. */}
        <div className="relative aspect-[4/3] lg:aspect-[5/4] rounded-card overflow-hidden bg-gradient-to-b from-surface to-canvas border border-rule">
          {/* radial glow under the product */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 55% 35% at 50% 70%, rgba(16,43,133,0.10) 0%, transparent 70%)',
            }}
          />
          {TIERS.map((t) => (
            <img
              key={t.slug}
              src={t.photo}
              alt={t.photoAlt}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-contain p-6 lg:p-10 transition-opacity duration-500"
              style={{ opacity: selected === t.slug ? 1 : 0 }}
            />
          ))}
          <span className="absolute top-2 right-2 lg:top-3 lg:right-3 text-[10px] font-semibold uppercase tracking-widest text-charcoal bg-canvas/85 backdrop-blur-sm border border-rule px-2 py-1 rounded">
            {tier.batteries} {tier.batteries === 1 ? 'battery' : 'batteries'}
          </span>
        </div>
      </div>

      {/* Right: price card + financing strip */}
      <div className="flex flex-col gap-3">
        {/* Price/spec card — re-keys on tier so animate-fadeSlideIn replays */}
        <div
          key={tier.slug}
          id={`pricing-panel-${tier.slug}`}
          role="tabpanel"
          aria-labelledby={`pricing-tab-${tier.slug}`}
          tabIndex={0}
          className="bg-eos-accent/5 border-2 border-eos-accent/30 rounded-card px-6 py-5 lg:px-8 lg:py-7 animate-fadeSlideIn"
        >
          <p className="text-eos-accent text-[11px] font-semibold uppercase tracking-widest mb-1">{tier.label}</p>
          <p className="text-charcoal text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            ${tier.price.toLocaleString()}
          </p>
          <p className="text-muted text-xs lg:text-sm mt-1 lg:mt-2">installed, before federal tax credit</p>

          <dl className="hidden lg:grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-eos-accent/20">
            <div>
              <dt className="text-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Batteries</dt>
              <dd className="text-charcoal text-base font-semibold">{tier.batteries}</dd>
            </div>
            <div>
              <dt className="text-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Usable</dt>
              <dd className="text-charcoal text-base font-semibold">{tier.kwh} kWh</dd>
            </div>
            <div>
              <dt className="text-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Runtime</dt>
              <dd className="text-charcoal text-base font-semibold">{tier.runtime.replace(/^about /, '~')}</dd>
            </div>
          </dl>

          <p className="lg:hidden text-muted text-xs mt-1">
            {tier.batteries} {tier.batteries === 1 ? 'battery' : 'batteries'} · about {tier.kwh} kWh usable · {tier.runtime} runtime
          </p>
        </div>
        <div className="bg-surface border border-rule rounded-btn px-4 py-3 lg:px-5 lg:py-4 flex items-center gap-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-eos-accent shrink-0">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <p className="text-charcoal text-sm font-medium">Financing available. No prepayment penalty.</p>
        </div>
      </div>
    </div>
  );
}

const ATTRIBUTES = [
  {
    topic: 'Loud or silent',
    gen: 'Loud while it runs (about as loud as a vacuum)',
    eos: 'Silent. No engine, no moving parts.',
  },
  {
    topic: 'Fuel or no fuel',
    gen: 'Needs gas or propane. Stations close first when a storm rolls in.',
    eos: 'Charges from the wall. Add solar later if you want.',
  },
  {
    topic: '30 seconds or instant',
    gen: '30 second startup gap. Router resets, AC kicks back on.',
    eos: 'Already on. Your lights do not even flicker.',
  },
  {
    topic: 'Yearly upkeep or none',
    gen: 'Yearly oil change, filter swap, test run, service contract.',
    eos: 'Nothing to maintain. No oil, no filters, no test cycle.',
  },
  {
    topic: 'Outside box or garage wall',
    gen: 'Big box outside the house. Most HOAs make you ask permission.',
    eos: 'Mounts on the garage or utility room wall. HOA usually never sees it.',
  },
  {
    topic: 'Loses or adds value',
    gen: 'Drops in value over time, like a car.',
    eos: 'Adds to your home value, like a new AC.',
  },
];

const COST_ROWS = [
  ['Install', '$8,500 to $13,000', '$16,472'],
  ['Maintenance over 10 years', '$1,500 to $3,000', 'nothing'],
  ['Fuel during a 7 day outage', '$700 or more', 'nothing'],
  ['Starter battery swaps', 'about $225 every 2 years', 'included, 10 year warranty'],
  ['Noise or HOA fights', 'often', 'never'],
];

const PHOTOS = [
  {
    src: '/images/lp/pairs/pair1-gen',
    alt: 'Generator install in progress: gas line trench, concrete pad with rebar formwork, mud, shovels, dug up sod',
  },
  {
    src: '/images/lp/pairs/pair1-eos',
    alt: 'Real Houston customer Google review photo: Eos battery installed on a clean garage wall, no excavation, no outdoor equipment',
  },
  {
    src: '/images/lp/pairs/pair2-gen',
    alt: 'Outdoor generator on side yard, permanently visible from sidewalk, HOA managed brick home',
  },
  {
    src: '/images/lp/pairs/pair2-eos',
    alt: 'Real Houston customer Google review photo: Eos battery indoors, curb stays clean, HOA stays quiet',
  },
  {
    src: '/images/lp/pairs/pair3-gen',
    alt: 'Eight year old generator: exhaust stain on brick, rust, oil drip on pad, weathered',
  },
  {
    src: '/images/lp/pairs/pair3-eos',
    alt: 'Real Houston customer Google review photo: an Eos battery years into ownership, still clean on the garage wall',
  },
];

const FAQ = [
  {
    q: 'Does this actually replace a generator?',
    a: "For how outages usually go here (a few hours, 20 plus times a year), yes, easily. And quietly. For something rare like the 2021 freeze, it depends on the size you pick and how your family runs during an outage. At a typical Houston household draw, a Pro setup gets you about 17 hours before you'd think about anything. If you absolutely need central AC running flat out for multiple days during a blackout, that's still a generator job and we'll say so straight up. Honest match for the typical Houston outage, not a one size fits all promise.",
  },
  {
    q: 'What does the warranty actually cover?',
    a: "Honest answer, we don't see many issues. Most of our customers diagnose stuff themselves before reaching out, and the system is built solid. Here's what's actually on paper: 10 years from the manufacturer (you have to keep it online, Wi-Fi or hardwired internet, no connection means no warranty). A 5 year extended warranty is available as a separate add on. The battery is rated for 10,000 cycles, which is 20 plus years of normal use. UL listed, meets current safety and grid codes, IP66 outdoor weather rating. Installed right and kept out of direct sun, it just runs.",
  },
  {
    q: 'How does it compare to a Generac, Kohler, or Cummins quote?',
    a: "Standby gens land $8,500 to $13,000 installed. Then $150 to $300 a year for maintenance and $700 or more in propane for a 7 day outage. The Pro setup is $16,472 installed, nothing to maintain, no fuel. Day one the generator looks cheaper. Add up 10 years of maintenance, fuel, and starter batteries and you end up around the same money. The difference is everything else: quiet, no HOA fight, no fuel runs, no outdoor box, instant switchover. Financing available with no prepayment penalty.",
  },
  {
    q: 'I keep hearing generator dealers do hard upsells. How is this different?',
    a: 'Price is on this page. No surprise add ons. No yearly service contract. No fuel deliveries to schedule. Battery is covered for 10 years. Most generator owners end up replacing the starter battery every couple years just to keep it cranking.',
  },
  {
    q: 'Will my HOA have a problem with it?',
    a: 'It mounts inside your garage or utility room. No outdoor box, no weekly test that fires up at 8am Saturday, no exhaust. Most HOAs do not even notice it. Still worth a quick check on your HOA rules, especially in Katy, Sugar Land, and The Woodlands.',
  },
  {
    q: 'What about a deep freeze, like when Texas froze in 2021?',
    a: 'When Texas froze that February, gas lines lost pressure across the state. Generators that run on natural gas had nothing to burn. A battery does not need a pipeline. It runs on what is already in the cells. Your gas furnace usually still fires (Texas furnaces work even at low pressure). The battery just runs the fan that pushes the heat around.',
  },
  {
    q: 'Do I need solar panels for this to work?',
    a: 'No. The battery charges from your normal grid power, same as your phone. Solar is optional. If you want panels later, they plug into the same battery with no rewiring.',
  },
  {
    q: 'What happens when I click Start Planning?',
    a: '12 quick questions from Megan, our energy advisor. About 2 minutes. We use your answers to figure out the right size for your house and walk you through real numbers. A real Houston advisor follows up, not a call center.',
  },
];

/**
 * SectionDef — config-driven LP section.
 * Order is what PostHog flags will A/B; bg + bleed + cv-below-fold derive
 * from position at render time so reorders stay visually coherent without
 * hand-editing per-section classes.
 * tone='self' opts out of wrapping (the render fn owns its own section).
 *
 * Removed per-section authored cvBelowFold + bleedToSurface — they're now
 * derived in renderSection() from neighbor position. Reorder a section and
 * the visual stitching follows automatically.
 */
type SectionDef = {
  id: string;
  tone: 'dark' | 'light' | 'self';
  schematicOpacity?: number;
  layoutClass?: string;
  dataAos?: boolean;
  render: () => React.ReactNode;
};

// Sections beyond this index get `cv-below-fold` (content-visibility:auto)
// for paint perf. First 3 sections render eagerly to keep LCP fast.
const CV_BELOW_FOLD_AFTER_INDEX = 2;

/**
 * HeroVideo — yellow generator loop with poster fallback.
 *
 * Autoplay is muted+playsInline (iOS safe). If the user has prefers-reduced-motion
 * set, we pause the video on mount so they see the static poster frame instead.
 * The static webp also paints first (poster) so first paint is never blank.
 */
function HeroVideo() {
  // Default to static poster on first paint to keep LCP cheap. Only swap in the
  // 972KB <video> after mount when (a) network looks fast enough and (b) user
  // hasn't opted into reduced motion or data-saver. The poster <img> is the LCP
  // element on slow connections — already preloaded with fetchPriority=high in
  // the route's <head>.
  const [playVideo, setPlayVideo] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    type NetInfo = { effectiveType?: string; saveData?: boolean };
    const conn = (navigator as Navigator & { connection?: NetInfo }).connection;
    if (conn?.saveData) return;
    const slow = conn?.effectiveType && ['slow-2g', '2g', '3g'].includes(conn.effectiveType);
    if (slow) return;
    setPlayVideo(true);
  }, []);

  const className =
    'w-full max-w-[440px] lg:max-w-none h-auto rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] bg-dark';

  if (!playVideo) {
    return (
      <img
        src="/images/lp/eos-ad-style-1-yellow-generator.webp"
        width={1120}
        height={1080}
        alt="Yellow gas generator running outside, side by side with a wall mounted Eos battery inside a clean garage"
        fetchPriority="high"
        decoding="async"
        className={className}
      />
    );
  }
  return (
    <video
      src="/videos/lp/yellow-generator.mp4"
      poster="/images/lp/eos-ad-style-1-yellow-generator.webp"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      width={1120}
      height={1080}
      aria-label="Yellow gas generator running outside, side by side with a wall mounted Eos battery inside a clean garage"
      className={className}
    />
  );
}

const renderHero = () => (
  <div className="relative mx-auto max-w-[1280px] page-x py-12 md:py-20">
    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-center">
      <div className="order-2 lg:order-1 text-center lg:text-left">
        <p className="text-eos-blue-on-dark text-[11px] md:text-xs font-semibold uppercase tracking-widest mb-3 md:mb-4">
          Generator Alternative · Houston
        </p>
        <h1 className="text-[28px] sm:text-3xl md:text-5xl font-bold tracking-tight leading-[1.15] mb-4 md:mb-5">
          Not every outage needs a generator.
        </h1>
        <p className="text-dark-muted text-[15px] md:text-lg leading-relaxed mb-7 md:mb-8 max-w-[520px] mx-auto lg:mx-0">
          If you&apos;re pricing a Generac, Kohler, or Cummins and the noise, fuel, or HOA stuff
          is making you hesitate, this is your lane. Most outages in Houston are a few hours. A
          battery handles that. Quietly, mounted on your garage wall. No fuel runs. No outdoor
          box. Nothing to service every year.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center lg:justify-start lg:items-start">
          <CTAButton label="Start planning" source="hero_primary" size="lg" />
          <CTAButton label="Request a callback" source="hero_secondary" size="lg" variant="ghost" />
        </div>
      </div>

      <div className="order-1 lg:order-2 flex justify-center">
        <HeroVideo />
      </div>
    </div>
  </div>
);

const renderPhotoCarousel = () => (
  <div className="relative mx-auto max-w-[1280px]">
    <div className="max-w-2xl md:mx-auto md:text-center lg:max-w-[760px] mb-8 md:mb-10">
      <p className="text-eos-blue-on-dark text-[11px] md:text-xs font-semibold uppercase tracking-widest mb-3">
        Side by side
      </p>
      <h2 className="text-white text-2xl md:text-3xl font-bold tracking-tight mb-3">
        Generator life. Battery life.
      </h2>
      <p className="text-dark-muted text-base leading-relaxed">
        Three honest pairs. Generator on the left of each pair, Eos on the right. Swipe through.
      </p>
    </div>

    <CardCarousel showDots itemCount={PHOTOS.length} trackingId="lp_photos">
      {PHOTOS.map((photo) => (
        <CarouselItem key={photo.src} className="w-[280px] sm:w-[360px] md:w-[440px]">
          <div className="bg-canvas rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.35)] h-full">
            <img
              src={`${photo.src}.webp?v=4`}
              alt={photo.alt}
              loading="lazy"
              decoding="async"
              className="w-full aspect-[3/4] object-cover"
              draggable={false}
            />
          </div>
        </CarouselItem>
      ))}
    </CardCarousel>
  </div>
);

const renderTrustBar = () => (
  <div className="mx-auto max-w-[1280px]">
    <div className="flex flex-wrap gap-2 md:gap-2.5 md:justify-center items-center">
      {[
        'Local Houston team',
        'Licensed, insured, permitted',
        '10 year warranty',
      ].map((label) => (
        <span
          key={label}
          // iOS-26 glass pill — frosted chip with hairline border + inner-top
          // specular highlight. Reads as native floating UI on dark hero.
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white/90 text-[11px] md:text-xs font-medium bg-white/10 border border-white/15 backdrop-blur-md backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
        >
          <span className="text-eos-blue-on-dark">✓</span>
          {label}
        </span>
      ))}
    </div>
  </div>
);

const renderStats = () => (
  <div className="relative mx-auto max-w-[1100px]">
    <p className="text-eos-blue-on-dark text-[11px] md:text-xs font-semibold uppercase tracking-widest mb-2 text-center">
      By the Numbers
    </p>
    <h2 className="text-white text-2xl md:text-3xl font-bold tracking-tight mb-10 text-center max-w-[640px] mx-auto">
      Less of the generator stuff. More of just having power.
    </h2>
    <StatsRow
      stats={[
        { value: '20+', numericValue: 20, suffix: '+', label: 'Houston outages every year' },
        { value: '$0', label: 'Fuel cost per outage' },
        { value: '10,000', numericValue: 10000, label: 'Cycles. 20 plus years of normal use.' },
        { value: '1 day', label: 'On site install' },
      ]}
    />
    <p className="text-white/65 text-xs text-center mt-10 max-w-[620px] mx-auto leading-relaxed">
      Runtime depends on the size you pick and how your family runs during an outage. Smaller
      setups cover the short Houston outages you&apos;d actually have. Bigger setups stretch
      further if you&apos;re happy running lean (fridge, fans, Wi-Fi, lights, not blasting
      central AC). The intake below matches size to your actual house.
    </p>
  </div>
);

const renderComparison = () => (
  <div className="mx-auto max-w-[1100px]">
    <div className="max-w-[760px] md:mx-auto md:text-center mb-8 md:mb-10">
      <p className="text-eos-blue text-[11px] md:text-xs font-semibold uppercase tracking-widest mb-3">
        Straight Comparison
      </p>
      <h2 className="text-charcoal text-2xl md:text-3xl font-bold tracking-tight mb-3">
        Standby generators worked 20 years ago. Here&apos;s what&apos;s changed.
      </h2>
      <p className="text-muted text-sm md:text-base leading-relaxed">
        Both work. For the way outages actually go down in Houston, a battery fits better. For
        week long blackouts way out in the country, a generator still wins. Here&apos;s the
        honest scoreboard.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
      {ATTRIBUTES.map((attr, i) => (
        <div
          key={attr.topic}
          data-aos="fade-up"
          data-aos-delay={i * 60}
        >
          <AttributeCard topic={attr.topic} gen={attr.gen} eos={attr.eos} />
        </div>
      ))}
    </div>

    <div className="mt-3 md:mt-4">
      <HonestCallout />
    </div>
  </div>
);

function HonestCallout() {
  const handleToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (e.currentTarget.open) track('lp_honest_callout_expand', { angle: ANGLE });
  };
  return (
    <details
      onToggle={handleToggle}
      className="group rounded-card overflow-hidden transition-all duration-300 border bg-canvas border-rule hover:border-eos-accent/20 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] [&[open]]:border-eos-accent/30 [&[open]]:shadow-[0_8px_24px_rgba(16,43,133,0.08)]"
    >
      <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-center justify-between gap-4 px-5 py-4 text-left">
        <p className="text-charcoal font-semibold text-base">When a generator is still the right call</p>
        <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 bg-surface group-hover:bg-eos-accent/10 group-[[open]]:bg-eos-accent/15 group-[[open]]:rotate-180">
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" className="text-eos-accent">
            <path d="M2 3.5L5 6.5L8 3.5" />
          </svg>
        </span>
      </summary>
      <div className="border-t border-rule px-5 py-4">
        <ul className="space-y-1.5 text-charcoal text-sm leading-relaxed">
          <li>• You live way out (acres of land) where power can be out for weeks at a time</li>
          <li>• All electric house that needs central AC running non stop for a week or more</li>
          <li>• You want one machine that keeps going as long as you can get fuel</li>
        </ul>
        <p className="text-muted text-xs mt-3 leading-relaxed">
          If that sounds like you, we&apos;ll tell you straight up. The intake catches these cases.
          We&apos;re not trying to squeeze every house into the same setup.
        </p>
      </div>
    </details>
  );
}

const renderCostMath = () => (
  <div className="mx-auto max-w-[1100px]">
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-12 items-start">
      <div className="md:text-center lg:text-left">
        <p className="text-eos-blue text-[11px] md:text-xs font-semibold uppercase tracking-widest mb-3">
          The Math
        </p>
        <h2 className="text-charcoal text-2xl md:text-3xl font-bold tracking-tight mb-4">
          If you want the receipts, tap a row.
        </h2>
        <p className="text-muted text-sm md:text-base leading-relaxed mb-6">
          Most people who land here aren&apos;t picking on cost alone. The Pro setup priced
          against a real Houston generator quote. Today&apos;s Texas propane price. One bad 7
          day outage every other year. Cost ends up in the same neighborhood. The difference is
          everything else.
        </p>
        <CTAButton label="See what fits my house" source="cost_section" />
      </div>

      <div className="flex flex-col gap-3">
        {COST_ROWS.map(([label, gen, eos], i) => (
          <div key={label} data-aos="fade-up" data-aos-delay={i * 50}>
            <CostRow topic={label} gen={gen} eos={eos} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const renderPricing = () => (
  <div className="mx-auto max-w-[1100px]">
    <div className="max-w-[760px] md:mx-auto md:text-center mb-8 md:mb-10">
      <p className="text-eos-blue text-[11px] md:text-xs font-semibold uppercase tracking-widest mb-3">
        Pricing
      </p>
      <h2 className="text-charcoal text-2xl md:text-3xl font-bold tracking-tight mb-3">
        Real gear. Real price. Right here.
      </h2>
      <p className="text-muted text-sm md:text-base leading-relaxed">
        Pro is the size we usually land on. Tap the others to see what changes. The intake
        matches you to the right one based on your house and how you actually live in it.
      </p>
    </div>
    <PricingPicker />
  </div>
);

const STACK_GALLERY = [
  {
    src: '/images/lp/stacks/hero-install.webp',
    caption: 'Whole-system install: controller, smart panel, stack',
  },
  {
    src: '/images/lp/stacks/garage-mount.webp',
    caption: 'Wall mount: clean garage, no outdoor box',
  },
  {
    src: '/images/lp/stacks/indoor-loadhub.webp',
    caption: 'Indoor utility room: load hub + stack',
  },
  {
    src: '/images/lp/stacks/stack-night.webp',
    caption: 'Night view: silent, no running engine',
  },
  {
    src: '/images/lp/stacks/stack-candid.webp',
    caption: 'Up close: real customer install',
  },
];

const renderStackGallery = () => (
  <div className="mx-auto max-w-[1280px]">
    <div className="max-w-2xl md:mx-auto md:text-center lg:max-w-[760px] mb-8 md:mb-10 page-x">
      <p className="text-eos-blue text-[11px] md:text-xs font-semibold uppercase tracking-widest mb-3">
        How it looks installed
      </p>
      <h2 className="text-charcoal text-2xl md:text-3xl font-bold tracking-tight mb-3">
        A few ways people set this up.
      </h2>
      <p className="text-muted text-sm md:text-base leading-relaxed">
        Wall mount in the garage. Indoor utility room. Visible load hub or tucked away.
        Same hardware, your choice on placement.
      </p>
    </div>
    <CardCarousel trackingId="lp_stack_gallery">
      {STACK_GALLERY.map((item) => (
        <CarouselItem key={item.src} className="w-[280px] sm:w-[340px] md:w-[400px]">
          <div className="bg-surface rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)] h-full flex flex-col">
            <img
              src={item.src}
              alt={item.caption}
              loading="lazy"
              decoding="async"
              className="w-full aspect-[3/4] object-cover"
            />
            <p className="text-charcoal text-sm font-medium px-4 py-3 leading-snug">
              {item.caption}
            </p>
          </div>
        </CarouselItem>
      ))}
    </CardCarousel>
  </div>
);

const PERMIT_STEPS = [
  {
    step: '01',
    short: 'Design',
    title: 'System design and permitting',
    body: 'You send measurements and photos of the install location (garage, indoor, outdoor). We design the right system for your house, file the electrical permit with your city, and open the application with CenterPoint. Some cities turn it around in a week, others take six. We tell you what to expect for yours up front, no guessing.',
  },
  {
    step: '02',
    short: 'Install',
    title: 'Install day',
    body: 'Physical install is one day on site. 4 to 8 hours typically. Wall mount in the garage or utility room. No outdoor concrete pad to pour.',
  },
  {
    step: '03',
    short: 'Inspect',
    title: 'City inspector signs off',
    body: 'The city sends an electrical inspector to verify the install meets code. Any flags are usually minor (labeling, paperwork). We re-do them at no cost.',
  },
  {
    step: '04',
    short: 'Live',
    title: 'CenterPoint interconnects',
    body: 'CenterPoint reviews the inspection, signs the interconnection agreement, and issues Permission to Operate. System goes live the moment that lands.',
  },
];

function PermitsStepper() {
  const [active, setActive] = useState(0);
  const pick = (i: number) => {
    if (i === active) return;
    setActive(i);
    track('lp_permit_step_select', { angle: ANGLE, step: PERMIT_STEPS[i].step });
  };
  const current = PERMIT_STEPS[active];
  return (
    <div>
      {/* Morphing pill row — segmented control with translating accent */}
      <div
        role="tablist"
        aria-label="Permit timeline steps"
        className="relative grid grid-cols-4 gap-0 glass-thin rounded-btn p-1"
      >
        <div
          aria-hidden="true"
          className="absolute top-1 bottom-1 rounded-btn bg-eos-accent shadow-[0_4px_12px_rgba(16,43,133,0.2)] transition-transform duration-[380ms] ease-[cubic-bezier(0.5,1.4,0.5,1)]"
          style={{
            left: '4px',
            width: 'calc((100% - 8px) / 4)',
            transform: `translateX(${active * 100}%)`,
          }}
        />
        {PERMIT_STEPS.map((s, i) => {
          const selected = active === i;
          return (
            <button
              key={s.step}
              type="button"
              role="tab"
              id={`permit-tab-${s.step}`}
              aria-controls={`permit-panel-${s.step}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => pick(i)}
              aria-selected={selected}
              className={`relative z-10 px-2 py-2.5 min-h-[48px] rounded-btn cursor-pointer border-none bg-transparent transition-colors duration-300 flex flex-col items-center justify-center gap-0.5 leading-tight ${
                selected ? 'text-white' : 'text-charcoal hover:text-eos-accent'
              }`}
            >
              <span className={`font-mono text-[11px] font-bold tracking-wider ${selected ? 'text-white/75' : 'text-muted'}`}>
                {s.step}
              </span>
              <span className="text-[13px] font-semibold">{s.short}</span>
            </button>
          );
        })}
      </div>

      {/* Detail panel for selected step */}
      <div
        key={current.step}
        id={`permit-panel-${current.step}`}
        role="tabpanel"
        aria-labelledby={`permit-tab-${current.step}`}
        tabIndex={0}
        className="mt-3 bg-canvas border border-rule rounded-card px-5 md:px-6 py-5"
        style={{ animation: 'fadeSlideIn 0.32s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <p className="text-eos-accent font-bold text-sm tracking-wider mb-1">{current.step}</p>
        <h3 className="text-charcoal font-semibold text-base mb-1.5">{current.title}</h3>
        <p className="text-muted text-sm leading-relaxed">{current.body}</p>
      </div>
    </div>
  );
}

const renderPermits = () => (
  <div className="mx-auto max-w-[1100px]">
    <div className="max-w-[760px] md:mx-auto md:text-center mb-8 md:mb-10">
      <p className="text-eos-blue text-[11px] md:text-xs font-semibold uppercase tracking-widest mb-3">
        Permits and Timeline
      </p>
      <h2 className="text-charcoal text-2xl md:text-3xl font-bold tracking-tight mb-3">
        The permit part is mostly painless. We handle it.
      </h2>
      <p className="text-muted text-sm md:text-base leading-relaxed">
        Texas law (SB 1252) makes residential battery permits pretty straightforward. Most
        Houston-area cities have it down. We file the application, deal with the inspector, and
        redo any minor flags at no charge.
      </p>
    </div>

    <PermitsStepper />


    <div className="mt-6 bg-eos-accent/5 border border-eos-accent/20 rounded-card px-5 md:px-6 py-5 flex items-start gap-3">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-eos-accent shrink-0 mt-0.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
      <div>
        <p className="text-charcoal font-semibold text-sm mb-1">Contract to power on: 3 to 6 weeks</p>
        <p className="text-muted text-sm leading-relaxed">
          The variable is the city, not the install. We do not start ordering equipment until
          the permit path is clear, so the timeline you see on day one is the timeline you get.
        </p>
      </div>
    </div>
  </div>
);

const renderFaq = () => (
  <div className="mx-auto max-w-[760px]">
    <div className="md:text-center mb-8 md:mb-10">
      <p className="text-eos-blue text-[11px] md:text-xs font-semibold uppercase tracking-widest mb-3">
        Common Questions
      </p>
      <h2 className="text-charcoal text-2xl md:text-3xl font-bold tracking-tight">
        The stuff people ask before they fill out the form.
      </h2>
    </div>
    <div className="bg-canvas border border-rule rounded-card px-5 md:px-6">
      {FAQ.map((item) => (
        <FAQItem key={item.q} q={item.q} a={item.a} />
      ))}
    </div>
  </div>
);

const renderFinalCta = () => (
  <div className="relative mx-auto max-w-[640px]">
    <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-4 leading-tight">
      See what setup makes sense for your house.
    </h2>
    <p className="text-dark-muted text-base md:text-lg mb-8 leading-relaxed">
      12 quick questions. About 2 minutes. Megan walks you through what fits.
    </p>
    <CTAButton label="Start planning" source="final_cta" size="lg" />
    <p className="text-white/60 text-xs mt-6 leading-relaxed">
      Licensed and insured. Factory trained on the Eos battery system. Serving Houston, Katy,
      Cypress, Sugar Land, Pearland, The Woodlands, Memorial, West U, Bellaire.
    </p>
  </div>
);

const SECTIONS: SectionDef[] = [
  { id: 'hero',           tone: 'dark',  schematicOpacity: 0.13, layoutClass: '',                          dataAos: false, render: renderHero },
  { id: 'photo_carousel', tone: 'dark',  schematicOpacity: 0.08,                                                            render: renderPhotoCarousel },
  { id: 'trust_bar',      tone: 'dark',                          layoutClass: 'py-4 md:py-5 page-x',       dataAos: false, render: renderTrustBar },
  { id: 'stats',          tone: 'dark',  schematicOpacity: 0.09,                                                            render: renderStats },
  { id: 'megan_intake',   tone: 'self',                                                                                     render: () => <InlineEstimate /> },
  { id: 'comparison',     tone: 'light',                                                                                    render: renderComparison },
  { id: 'cost_math',      tone: 'light',                                                                                    render: renderCostMath },
  { id: 'pricing',        tone: 'light',                                                                                    render: renderPricing },
  { id: 'stack_gallery',  tone: 'light',                                                                                    render: renderStackGallery },
  { id: 'permits',        tone: 'light',                                                                                    render: renderPermits },
  { id: 'faq',            tone: 'light',                                                                                    dataAos: false, render: renderFaq },
  { id: 'final_cta',      tone: 'dark',  schematicOpacity: 0.1,  layoutClass: 'py-14 md:py-20 page-x text-center safe-bottom', dataAos: false, render: renderFinalCta },
];

function renderSection(s: SectionDef, i: number, all: SectionDef[]) {
  // Self-toned sections (e.g. megan_intake) bring their own background; we still
  // need the data-section wrapper so the IntersectionObserver fires lp_section_view.
  if (s.tone === 'self') return <section key={s.id} data-section={s.id}>{s.render()}</section>;

  // Derived visual stitching — recomputed every render so reorders stay
  // coherent without per-section bookkeeping.
  // - cvBelowFold: any section past CV_BELOW_FOLD_AFTER_INDEX (paint perf)
  // - bleedToSurface: light section immediately following any non-light
  //   neighbor (dark or self). The surface tone bleeds up into the bottom
  //   of the previous section so the transition isn't a hard seam.
  const cvBelowFold = i > CV_BELOW_FOLD_AFTER_INDEX;
  const bleedToSurface = s.tone === 'light' && all[i - 1] !== undefined && all[i - 1].tone !== 'light';

  let bg: string;
  let borderT = '';
  let schematic: React.ReactNode = null;

  if (s.tone === 'dark') {
    bg = 'bg-dark text-white relative overflow-hidden';
    if (all[i - 1]?.tone === 'dark') borderT = 'border-t border-dark-rule';
    if (s.schematicOpacity !== undefined) {
      schematic = <SchematicBackground opacity={s.schematicOpacity} />;
    }
  } else {
    const lightIdx = all.slice(0, i).filter((x) => x.tone === 'light').length;
    bg = lightIdx % 2 === 0 ? 'bg-canvas' : 'bg-surface';
    if (cvBelowFold) bg += ' cv-below-fold';
  }

  const cls = [
    bg,
    bleedToSurface && 'bleed-to-surface',
    borderT,
    s.layoutClass ?? 'py-14 md:py-20 page-x',
  ].filter(Boolean).join(' ');

  const aosProps = s.dataAos !== false ? { 'data-aos': 'fade-up' } : {};

  return (
    <section key={s.id} data-section={s.id} className={cls} {...aosProps}>
      {schematic}
      {s.render()}
    </section>
  );
}

export function GeneratorInterceptLP() {
  const { dwellMapRef } = useLPTracking(ANGLE);
  useSectionDwellTracking(ANGLE, dwellMapRef);
  useLPBfcacheResume(ANGLE);

  return (
    <>
      <ViewMoreBanner />
      {SECTIONS.map((s, i) => renderSection(s, i, SECTIONS))}
    </>
  );
}
