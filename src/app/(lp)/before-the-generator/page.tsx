import { GeneratorInterceptLP } from '@/components/lp/GeneratorInterceptLP';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Not Every Outage Needs a Generator | Eos Backup and Battery',
  description:
    'Researching a standby generator in Houston? See what the math actually says. Silent, garage-mounted battery backup. 0ms switchover. No fuel, no fumes, no HOA letters. $10,800 starting (~$7,500 post-ITC).',
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
        href="/images/lp/eos-ad-style-1-yellow-generator.webp"
        fetchPriority="high"
      />
      <GeneratorInterceptLP />
    </>
  );
}
