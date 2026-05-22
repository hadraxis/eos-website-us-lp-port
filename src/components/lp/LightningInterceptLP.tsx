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

const ANGLE = 'lightning_v2h';

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
          <p className="text-muted text-[11px] font-semibold tracking-wide mb-1">PPOB + transfer switch</p>
          <p className="text-charcoal">{gen}</p>
        </div>
        <div>
          <p className="text-eos-accent text-[11px] font-semibold tracking-wide mb-1">Sigenergy + V2X</p>
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
          <span className="text-muted/50 text-base shrink-0 leading-tight">○</span>
          <div>
            <p className="text-muted text-[12px] font-semibold tracking-wide mb-1">Pro Power Onboard + transfer switch</p>
            <p className="text-charcoal text-sm leading-relaxed">{gen}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 px-5 py-4 bg-eos-accent/5">
          <span className="text-eos-accent text-base shrink-0 leading-tight">✓</span>
          <div>
            <p className="text-eos-accent text-[12px] font-semibold tracking-wide mb-1">Sigenergy stack + V2X</p>
            <p className="text-charcoal text-sm font-medium leading-relaxed">{eos}</p>
          </div>
        </div>
      </div>
    </details>
  );
}

const TIERS = [
  {
    slug: 'essential-v2x',
    label: 'Essential + V2X',
    batteries: 1,
    kwh: '8.76',
    runtime: 'critical loads + truck reservoir',
    // Essential plan cash price per ops (proposal generator). Install included, tax not.
    price: 12849,
    photo: '/images/lp/lightning/sigenergy-essential-v2x-stack-1-with-evdc.webp',
    photoAlt: 'Sigenergy Essential tier with V2X — wall EVDC charger paired with the compact 1-module floor stack',
  },
  {
    slug: 'plus-v2x',
    label: 'Plus + V2X',
    batteries: 2,
    kwh: '17.52',
    runtime: 'base backup + truck reservoir',
    price: 16128,
    photo: '/images/lp/lightning/sigenergy-plus-v2x-front-1-1-2.webp',
    photoAlt: 'Sigenergy Plus tier with wall-mounted EVDC charger and 1+1+2 floor stack, front view',
  },
  {
    slug: 'pro-v2x',
    label: 'Pro + V2X',
    batteries: 3,
    kwh: '26.28',
    runtime: 'more daily buffer + truck reservoir',
    price: 19407,
    photo: '/images/lp/lightning/sigenergy-pro-v2x-1-1-3-side.webp',
    photoAlt: 'Sigenergy Pro tier — 1+1+3 floor stack, side view',
  },
];

function PricingPicker() {
  const [selected, setSelected] = useState('plus-v2x');
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
          className="relative grid grid-cols-3 gap-0 max-w-[520px] lg:max-w-none glass-thin rounded-btn p-1"
        >
          <div
            aria-hidden="true"
            className="absolute top-1 bottom-1 rounded-btn bg-eos-accent shadow-[0_4px_16px_rgba(16,43,133,0.25)] transition-transform duration-[420ms] ease-[cubic-bezier(0.5,1.4,0.5,1)]"
            style={{
              left: '4px',
              width: `calc((100% - 8px) / ${TIERS.length})`,
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
            {tier.batteries} {tier.batteries === 1 ? 'module' : 'modules'} + V2X
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
          <p className="text-muted text-xs lg:text-sm mt-1 lg:mt-2">installed, includes V2X module · ask about current incentives</p>

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
              <dt className="text-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Coverage</dt>
              <dd className="text-charcoal text-base font-semibold">{tier.runtime}</dd>
            </div>
          </dl>

          <p className="lg:hidden text-muted text-xs mt-1">
            {tier.batteries} modules · {tier.kwh} kWh usable · {tier.runtime}
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
    topic: 'Output to the house',
    gen: 'About 7.2 kW continuous from the 240V/30A bed outlet. Critical loads only.',
    eos: 'Up to 11.5 kW continuous from the Controller. Whole-home capable with the right stack and a LoadHub for shedding.',
  },
  {
    topic: 'What the truck does during backup',
    gen: 'Truck stays partially awake. Cooling fans and pack thermal management run to support the inverter.',
    eos: 'Truck sits idle until the V2X actually pulls. No parasitic load between events.',
  },
  {
    topic: 'Lightning fast-charge bonus',
    gen: 'None. PPOB is one-way out of the truck.',
    eos: 'V2X pulls 25 kW DC into the truck. About a couple hours from low to full instead of overnight on Level 2.',
  },
  {
    topic: 'Install effort',
    gen: 'Neutral-switching transfer switch (Generac 6852/6853 or Reliance LinkX) plus a licensed electrician for the panel tie-in.',
    eos: 'Full Sigen system install. Permit, interconnection, commissioning. One-day on site after the permit clears.',
  },
  {
    topic: 'Daily use beyond backup',
    gen: 'None. The transfer switch sits unused 99% of the year.',
    eos: 'Daily TOU shifting, solar self-consumption layer, grid resilience. The system earns its keep between outages.',
  },
  {
    topic: 'Truck has to be home',
    gen: 'Yes. If the truck is gone the house has nothing.',
    eos: 'No. The home stack alone covers short outages. The truck is the extra reservoir for longer ones.',
  },
];

const COST_ROWS = [
  ['Install cost', 'Not apples to apples — these do different jobs.', 'Installation included. Tax varies by jurisdiction.'],
  ['Backup capacity', '~7.2 kW critical loads only', 'Up to 11.5 kW continuous, whole-home capable'],
  ['Daily savings', '$0 — the switch sits idle between outages', 'TOU peak-shifting, solar self-consumption layer'],
  ['Fast-charge the truck', 'Not possible — PPOB is one-way', '25 kW DC bidirectional. 23 kW PV (DC / AC).'],
  ['10 year ownership', 'Low cap-ex, no daily payoff. Truck wear on PPOB cycles.', 'Higher cap-ex, recovers via daily use + outage coverage.'],
];

const PHOTOS = [
  // Lead with the truck-and-system pair
  {
    src: '/images/lp/lightning/pair2-f150-lightning-sigenergy-stack-garage',
    alt: 'F-150 Lightning beside a Sigenergy stack and V2X module mounted in the garage',
  },
  {
    src: '/images/lp/lightning/pair2-f150-lightning-v2x-plugged-daylight',
    alt: 'F-150 Lightning plugged into the Sigenergy V2X cable in daylight, active bidirectional charging',
  },
  // What's behind the panel
  {
    src: '/images/lp/lightning/stacks/eos-loadhub-panel-interior-wire-routing',
    alt: 'LoadHub panel interior: smart loads, inverters, generator, grid — all wired together for whole-home backup',
  },
  // Footprint triplet: empty → typical (Powerwall) → ours (Sigen)
  {
    src: '/images/lp/lightning/pair-empty-garage-wall-pre-install',
    alt: 'Empty garage wall before install — what your space looks like today',
  },
  {
    src: '/images/lp/lightning/pair3-tesla-powerwall-row-40kwh-10-feet',
    alt: 'Three Tesla Powerwalls floor-mounted across 10 feet of garage wall covering only 40 kWh',
  },
  {
    src: '/images/lp/lightning/pair3-sigenergy-single-stack-45kwh-60-inch',
    alt: 'Single 60-inch Sigenergy floor stack covering 45 kWh in the footprint of one Powerwall',
  },
];

const FAQ = [
  {
    q: 'Is the Ford Charge Station Pro path actually dead?',
    a: "Yes. Ford’s own support page says it straight: “The Ford Charge Station Pro, required for Automatic Home Backup Power, is no longer for sale.” The Sunrun and Siemens support contracts ended with it. The CSP hardware still works fine as an 80A Level 2 charger, but the V2H path through it is closed. Two real options forward: Pro Power Onboard through a transfer switch, or replace the bidirectional side with a Sigenergy V2X. Eos installs the second one.",
  },
  {
    q: 'Can I just wire a generic inverter to the CSP’s DC terminals?',
    a: "No. The DC lugs inside the CSP are real, but they stay open until the truck authorizes the connection. That authorization comes from a Ford-specific protocol that no off-the-shelf inverter speaks. The CSP’s internal contactors only close when a Delta BDI inverter inside the dead HIS system sends the right handshake over RS-485. It’s a permission problem, not a wiring problem.",
  },
  {
    q: 'Could I buy a new BDI inverter and rebuild HIS myself?',
    a: "In theory the Delta E4 BDI would work, because that’s what HIS shipped with. In practice you can’t really buy one. Ford and Sunrun ended the program, AEE Solar stopped stocking new units, Delta isn’t making them for the channel anymore. Even if you found NOS stock you’d have no manufacturer support, no firmware updates, no warranty path, and Ford has no incentive to keep truck firmware compatible with a discontinued integration. Technical yes, practical no.",
  },
  {
    q: 'What’s the catch with Pro Power Onboard through a transfer switch?',
    a: "Bonded-neutral GFCI mismatch. The Lightning’s PPOB outlets are bonded-neutral with internal GFCI. Most off-the-shelf transfer switches assume a floating neutral like a portable gas generator, and the truck trips the moment you wire it up. You need a neutral-switching transfer switch (Generac 6852 or 6853, Reliance LinkX) so the truck’s GFCI sees clean current. About 7.2 kW continuous from the 240V/30A bed outlet. Hardware $400-800 plus a licensed electrician for the panel work. The truck has to be home and plugged in.",
  },
  {
    q: 'What does the Sigenergy V2X actually do?',
    a: "It’s a 25 kW bidirectional DC charging module that pairs with the Sigenergy hybrid inverter and a small battery stack. NACS native for the 2024+ Lightning. CCS1 adapter handles earlier model years. It moves DC both directions: pulls 25 kW into the truck for fast charging, or pushes power from the truck into the home stack and the panel during an outage. Daily it does TOU shifting and solar self-consumption. During an outage your truck becomes the long-runtime reservoir on top of the home stack.",
  },
  {
    q: 'How does this compare to Tesla Powerwalls plus a Wallbox?',
    a: "Footprint and integration are the real difference. In the same wall space as one Powerwall you can fit roughly 3-4x the kWh on a Sigen stack. LoadHub is an integrated subpanel with load shedding logic, so you can keep more of the house alive during a backup event. mySigen handles monitoring. You can also add modules one at a time, so the system grows with the house. Eos does not install Powerwall + Wallbox, so we won’t go further than the spec-side comparison.",
  },
  {
    q: 'Is Sigenergy reliable?',
    a: "Honest answer, we haven’t seen a real hardware failure on these yet. Battery is rated for 10,000 cycles, which is 20+ years of normal use. Warranty is 10 years from the manufacturer, with a 5-year extended warranty available as a separate add-on. The catch is reliable internet to the system, because no connection means no warranty. UL listed, IP66 outdoor weather rating. The global Sigenergy communities mostly talk about solar PV tuning and app sync bugs, not battery failures.",
  },
  {
    q: 'Does the V2X work with my Tesla, Cybertruck, or other EV?',
    a: "Yes. The Sigenergy V2X is CCS1 and NACS compatible, so it covers the Lightning, Tesla (including Cybertruck), and other EVs with a compatible bidirectional charging port. Sigenergy has validated bidirectional flow across the Tesla lineup alongside the Lightning. Tell us what you drive on the intake and we’ll confirm the connector and any model-year notes before install.",
  },
  {
    q: 'What do I do with my stranded CSP?',
    a: "Two options. Keep it. At 80A and 19.2 kW it’s still a strong Level 2 charger, especially if you have the extended-range truck. Or sell it. The resale market is soft now that HIS is dead, but it’s not zero. Standard-range buyers originally paid Ford $1,310 for it, extended-range buyers got it bundled. If you want to talk about a buyback that’s a direct conversation, not something we surface on a public page.",
  },
  {
    q: 'What does install look like in Houston?',
    a: "Permit-side it’s a dual-purpose ESS + EVSE package handled together. City of Houston AHJ plus CenterPoint interconnection. Typical contract-to-power-on is 3 to 6 weeks, with the variable being the city not the install. Physical install is one day on site after the permit clears, 4 to 8 hours typically. Battery stack sits on the floor (the V2X cable has to reach the truck), the EVDC charger mounts on the wall — garage or utility room either way. The Lightning slides into the V2X workflow during commissioning so you can verify the bidirectional flow on day one.",
  },
];

/**
 * SectionDef — config-driven LP section.
 * Order is what PostHog flags will A/B; bg + bleed + cv-below-fold derive
 * from position at render time so reorders stay visually coherent without
 * hand-editing per-section classes.
 * tone='self' opts out of wrapping (the render fn owns its own section).
 */
type SectionDef = {
  id: string;
  tone: 'dark' | 'light' | 'self';
  schematicOpacity?: number;
  layoutClass?: string;
  dataAos?: boolean;
  render: () => React.ReactNode;
};

const CV_BELOW_FOLD_AFTER_INDEX = 2;

/**
 * HeroVideo — F-150 Lightning + Sigenergy V2X loop, gated until the user reaches
 * the bottom of the page. The video is a treat for engaged readers, not a hero
 * payload.
 *
 * Performance contract: the 12 MB+ video MUST NOT load before the rest of the
 * page is consumed. Sequence:
 *   1. First paint: poster only (no <source> elements, preload=none)
 *   2. User scrolls all the way to the bottom of the page → arm
 *   3. IntersectionObserver fires when the hero re-enters viewport on the way
 *      back up → swap in sources, .load(), .play()
 *   4. If the user never returns to the top, video never loads. Fine.
 *
 * Prefers-reduced-motion always keeps the poster.
 */
function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    let armed = false;
    let videoIO: IntersectionObserver | null = null;
    const armOnReturn = () => {
      if (armed) return;
      armed = true;
      videoIO = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setShouldLoad(true);
              videoIO?.disconnect();
              videoIO = null;
              break;
            }
          }
        },
        { rootMargin: '200px' },
      );
      if (videoRef.current) videoIO.observe(videoRef.current);
    };

    // Watch the final CTA section at the very bottom of the LP. When the user
    // reaches it (whether via mouse scroll, touch, keyboard, or programmatic),
    // arm the video. IO fires regardless of how the scroll happened, which
    // scroll listeners don't (programmatic scrollTo skips them).
    const footerSentinel = document.querySelector('[data-section="final_cta"]');
    if (!footerSentinel) return;

    const bottomIO = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          bottomIO.disconnect();
          armOnReturn();
        }
      },
      { rootMargin: '0px' },
    );
    bottomIO.observe(footerSentinel);

    return () => {
      bottomIO.disconnect();
      videoIO?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (shouldLoad && videoRef.current) {
      videoRef.current.load();
      const p = videoRef.current.play();
      if (p && typeof p.catch === 'function') p.catch(() => { /* autoplay blocked: keep poster */ });
    }
  }, [shouldLoad]);

  return (
    <video
      ref={videoRef}
      poster="/images/lp/lightning/f150-lightning-sigenergy-v2x-dusk-hero.webp"
      muted
      loop
      playsInline
      preload="none"
      width={900}
      height={1200}
      aria-label="F-150 Lightning paired with the Sigenergy V2X stack — bidirectional charging loop"
      className="w-full max-w-[440px] lg:max-w-none h-auto rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] bg-dark object-cover"
    >
      {shouldLoad && (
        <>
          <source src="/images/lp/lightning/f150-lightning-sigenergy-v2x-hero-loop.webm" type="video/webm" />
          <source src="/images/lp/lightning/f150-lightning-sigenergy-v2x-hero-loop.mp4" type="video/mp4" />
        </>
      )}
      <img
        src="/images/lp/lightning/f150-lightning-sigenergy-v2x-dusk-hero.webp"
        alt="F-150 Lightning at dusk in a Houston ranch driveway, plugged into a Sigenergy V2X module beside the floor stack with the home windows lit"
        width={900}
        height={1200}
      />
    </video>
  );
}

const renderHero = () => (
  <div className="relative mx-auto max-w-[1280px] page-x py-12 md:py-20">
    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-center">
      <div className="order-2 lg:order-1 text-center lg:text-left" data-aos="fade-up">
        <p className="text-eos-blue-on-dark text-[11px] md:text-xs font-semibold uppercase tracking-widest mb-3 md:mb-4">
          F-150 Lightning · V2H · Houston
        </p>
        <h1 className="text-[28px] sm:text-3xl md:text-5xl font-bold tracking-tight leading-[1.15] mb-4 md:mb-5">
          Power your home from your F-150 Lightning. After Ford HIS ended.
        </h1>
        <p className="text-dark-muted text-[15px] md:text-lg leading-relaxed mb-7 md:mb-8 max-w-[520px] mx-auto lg:mx-0">
          If you bought the Charge Station Pro for backup, the path forward isn&apos;t Ford anymore.
          It&apos;s a small Sigenergy stack with a bidirectional V2X module. 25 kW DC, both
          directions. Whole-home capable. Eos installs these in Houston.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center lg:justify-start lg:items-start">
          <CTAButton label="Start Planning" source="hero_primary" size="lg" />
          <CTAButton label="Request a callback" source="hero_secondary" size="lg" variant="ghost" />
        </div>
        <p className="text-white/65 text-xs mt-4 leading-relaxed">
          F150LightningForum Diamond Sponsor · UL listed · Houston-based.
        </p>
      </div>

      <div className="order-1 lg:order-2 flex justify-center" data-aos="fade-up" data-aos-delay="100">
        <HeroVideo />
      </div>
    </div>
  </div>
);

const renderPhotoCarousel = () => (
  <div className="relative mx-auto max-w-[1280px]">
    <div className="max-w-2xl md:mx-auto md:text-center lg:max-w-[760px] mb-8 md:mb-10">
      <p className="text-eos-blue-on-dark text-[11px] md:text-xs font-semibold uppercase tracking-widest mb-3">
        Driveway, panel, footprint
      </p>
      <h2 className="text-white text-2xl md:text-3xl font-bold tracking-tight mb-3">
        Truck plugged in. Panel wired up. Footprint next to what you already know.
      </h2>
      <p className="text-dark-muted text-base leading-relaxed">
        The Lightning beside the stack, the Lightning actively charging, inside the LoadHub panel,
        then the footprint sequence: empty wall, the typical Powerwall row, and the single Sigenergy
        stack that replaces it. Swipe through.
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
        'F150LightningForum Diamond Sponsor',
        'UL 1741 SB + UL 9540',
        '10 year manufacturer warranty',
        '10,000 cycle battery rating',
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
      The third tier is already in your driveway.
    </h2>
    <StatsRow
      stats={[
        { value: 'Fast charge', label: 'NACS native / CCS1 adapter' },
        { value: '25 kW', numericValue: 25, suffix: ' kW', label: 'V2X bidirectional, both directions' },
        { value: '23 kW PV', label: 'Solar input (DC / AC)' },
      ]}
    />
    <p className="text-white/65 text-xs text-center mt-10 max-w-[620px] mx-auto leading-relaxed">
      The home stack handles the short Houston outages on its own. The Lightning sits idle in the
      driveway until the V2X actually needs it, then the truck pack kicks in as the long-runtime
      reservoir. Sizing on the home side stays small because the truck is the long-runtime layer.
      The intake below matches stack size to your actual house.
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
        Pro Power Onboard works. So does the V2X. They do different jobs.
      </h2>
      <p className="text-muted text-sm md:text-base leading-relaxed">
        Both can power your house from the Lightning. PPOB + a transfer switch is the cheap,
        truck-only path. The V2X turns the truck into a fast-charge endpoint on top of a
        whole-home backup system. Here is the honest scoreboard.
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
        <p className="text-charcoal font-semibold text-base">When PPOB + a transfer switch is the right call</p>
        <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 bg-surface group-hover:bg-eos-accent/10 group-[[open]]:bg-eos-accent/15 group-[[open]]:rotate-180">
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" className="text-eos-accent">
            <path d="M2 3.5L5 6.5L8 3.5" />
          </svg>
        </span>
      </summary>
      <div className="border-t border-rule px-5 py-4">
        <ul className="space-y-1.5 text-charcoal text-sm leading-relaxed">
          <li>• You only need to keep critical loads alive (fridge, Wi-Fi, a few outlets) during short outages</li>
          <li>• You are not looking to add daily TOU shifting, solar self-consumption, or whole-home backup</li>
          <li>• The truck is reliably home when storms roll in</li>
          <li>• Cap-ex matters more than ongoing system value</li>
        </ul>
        <p className="text-muted text-xs mt-3 leading-relaxed">
          If that sounds right, we will tell you straight up. The intake catches these cases. We
          are not trying to push every Lightning owner into the same setup.
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
          Two paths, side by side. Tap a row for the detail.
        </h2>
        <p className="text-muted text-sm md:text-base leading-relaxed mb-6">
          PPOB + a neutral-switching transfer switch is the low cap-ex Lightning backup path.
          A Sigenergy stack + V2X is the whole-home, daily-use path that also fast-charges the
          truck. Different price tags, different jobs.
        </p>
        <CTAButton label="Start Planning" source="cost_section" />
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
        Three configs. Your Lightning is the long-runtime reservoir on all of them.
      </h2>
      <p className="text-muted text-sm md:text-base leading-relaxed">
        Essential + V2X is the smallest setup — critical loads on the home stack with the truck
        carrying everything beyond that. Plus and Pro add modules for more daily buffer and longer
        truck-out coverage. All three include the bidirectional V2X module. The intake matches you
        to the right size based on your house and how you live in it.
      </p>
    </div>
    <PricingPicker />
  </div>
);

const STACK_GALLERY = [
  // Real installs first — colorful, location-rich, more engaging than catalogue renders
  {
    src: '/images/lp/lightning/pair1-sigenergy-installed-brick-garage.webp',
    caption: 'Real install: Sigenergy stack against a brick garage wall, disconnects wired in alongside',
  },
  {
    src: '/images/lp/lightning/extra-sigenergy-stack-vented-brick-garage.webp',
    caption: 'Real install: vented Sigenergy stack against a striped brick exterior wall',
  },
  {
    src: '/images/lp/lightning/extra-sigenergy-outdoor-enclosure-side-yard.webp',
    caption: 'Real install: Sigenergy stack in a side-yard wooden enclosure with inverter and disconnects mounted next to it',
  },
  {
    src: '/images/lp/lightning/extra-essential-tier-real-install-side.webp',
    caption: 'Essential plan + V2X — garage install',
  },
  // Manufacturer renders fill in the system pieces a customer can't see in a photo
  {
    src: '/images/lp/lightning/extra-sigenergy-v2x-cable-detail-closeup.webp',
    caption: 'V2X cable detail: the EVDC charger on the wall, cable looped down toward the floor stack',
  },
  {
    src: '/images/lp/lightning/stacks/sigenergy-v2x-evdc-wall-plus-floor-stack.webp',
    caption: 'Full V2X system render: wall-mounted EVDC charger paired with the floor-mounted Sigenergy stack',
  },
  {
    src: '/images/lp/lightning/stacks/sigenergy-evdc-charger-and-controller-wiring.webp',
    caption: 'EVDC charger and its bidirectional controller, isolated: the two pieces that move 25 kW DC both ways',
  },
  {
    src: '/images/lp/lightning/stacks/sigenergy-ultimate-1-1-5-side-floor-stack.webp',
    caption: 'Ultimate config render: 1+1+5 floor stack for the houses that want maximum daily buffer',
  },
];

const renderStackGallery = () => (
  <div className="mx-auto max-w-[1280px]">
    <div className="max-w-2xl md:mx-auto md:text-center lg:max-w-[760px] mb-8 md:mb-10 page-x">
      <p className="text-eos-blue text-[11px] md:text-xs font-semibold uppercase tracking-widest mb-3">
        Show and tell
      </p>
      <h2 className="text-charcoal text-2xl md:text-3xl font-bold tracking-tight mb-3">
        Real installs across Houston. The system pieces that aren&apos;t in the photo.
      </h2>
      <p className="text-muted text-sm md:text-base leading-relaxed">
        Real customer setups first — indoor garage, outdoor enclosure, brick exteriors. Then the
        manufacturer renders that show what the V2X system looks like behind the cover: the EVDC
        charger, the bidirectional controller, the bigger configs.
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
    body: 'Physical install is one day on site. 4 to 8 hours typically. Floor mount for the battery stack, wall mount for the EVDC charger — garage or utility room. No outdoor concrete pad to pour.',
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
        Texas law (SB 1252) makes residential battery permits straightforward. The V2X side is
        permitted as a dual-purpose ESS + EVSE package alongside the battery stack, handled in
        one submission. City of Houston AHJ plus CenterPoint interconnection. We file the
        application, deal with the inspector, and redo any minor flags at no charge.
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
        Stuff Lightning owners ask before they fill out the form.
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
      Stop waiting on Ford. Start using your Lightning.
    </h2>
    <p className="text-dark-muted text-base md:text-lg mb-8 leading-relaxed">
      The Lightning is already in your driveway. The V2X turns it into a real backup endpoint.
      A few quick questions and we will tell you what fits your house.
    </p>
    <CTAButton label="Start Planning" source="final_cta" size="lg" />
    <p className="text-white/60 text-xs mt-6 leading-relaxed">
      Licensed and insured. Factory trained on the Sigenergy stack and V2X module. Serving
      Houston, Katy, Cypress, Sugar Land, Pearland, The Woodlands, Memorial, West U, Bellaire.
    </p>
  </div>
);

const SECTIONS: SectionDef[] = [
  { id: 'hero',           tone: 'dark',  schematicOpacity: 0.13, layoutClass: '',                          dataAos: false, render: renderHero },
  { id: 'photo_carousel', tone: 'dark',  schematicOpacity: 0.08,                                                            render: renderPhotoCarousel },
  { id: 'trust_bar',      tone: 'dark',                          layoutClass: 'py-4 md:py-5 page-x',       dataAos: false, render: renderTrustBar },
  { id: 'stats',          tone: 'dark',  schematicOpacity: 0.09,                                                            render: renderStats },
  { id: 'megan_intake',   tone: 'self',                                                                                     render: () => <InlineEstimate angle="lightning" /> },
  { id: 'comparison',     tone: 'light',                                                                                    render: renderComparison },
  { id: 'cost_math',      tone: 'light',                                                                                    render: renderCostMath },
  { id: 'pricing',        tone: 'light',                                                                                    render: renderPricing },
  { id: 'stack_gallery',  tone: 'light',                                                                                    render: renderStackGallery },
  { id: 'permits',        tone: 'light',                                                                                    render: renderPermits },
  { id: 'faq',            tone: 'light',                                                                                    render: renderFaq },
  { id: 'final_cta',      tone: 'dark',  schematicOpacity: 0.1,  layoutClass: 'py-14 md:py-20 page-x text-center safe-bottom', render: renderFinalCta },
];

function renderSection(s: SectionDef, i: number, all: SectionDef[]) {
  // Self-toned sections need a data-section wrapper so the
  // IntersectionObserver fires lp_section_view (per posthog-tracking-cocktail
  // §7 fix). The render fn owns its own visual background.
  if (s.tone === 'self') return <section key={s.id} data-section={s.id}>{s.render()}</section>;

  // Derived visual stitching — recomputed every render so reorders stay
  // coherent without per-section bookkeeping. bleed applies whenever the
  // previous section isn't already light (dark or self both qualify), so
  // self-toned sections like megan_intake don't break the stitching.
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

export function LightningInterceptLP() {
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
