'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * /qualify Back link. Prefers router.back() so the user lands on whichever LP
 * they came from (instead of always falling out to home). If history is empty
 * — e.g. the user landed directly on /qualify from an ad — we route to the
 * generator-alternative LP since that's the most likely intent for a cold
 * "see if I qualify" entry.
 */
export function BackButton() {
  const router = useRouter();
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') setHasHistory(window.history.length > 1);
  }, []);

  return (
    <a
      href="/lp/generator-alternative"
      onClick={(e) => {
        if (hasHistory) {
          e.preventDefault();
          router.back();
        }
      }}
      className="text-muted text-sm hover:text-charcoal transition-colors no-underline"
    >
      &larr; Back
    </a>
  );
}
