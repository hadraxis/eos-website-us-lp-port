import { LightningInterceptLP } from '@/components/lp/LightningInterceptLP';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'F-150 Lightning Home Backup | Bidirectional Charger After Ford HIS | Eos Backup and Battery',
  description:
    'F-150 Lightning owner stranded by Ford HIS shutdown? Sigenergy V2X bidirectional charger paired with a small home battery stack. 25 kW DC to and from the truck. Houston install.',
};

export default function Page() {
  return (
    <>
      {/* LCP boost — hero video poster is the largest paint. Preload at high
          priority so it lands before the video metadata request competes for
          bandwidth. React 19 hoists this to <head> automatically. */}
      <link
        rel="preload"
        as="image"
        href="/images/lp/lightning/f150-lightning-sigenergy-v2x-dusk-hero.webp"
        fetchPriority="high"
      />
      <LightningInterceptLP />
    </>
  );
}
