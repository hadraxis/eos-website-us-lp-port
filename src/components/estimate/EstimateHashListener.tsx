'use client';

import { useEffect } from 'react';

// Intercepts clicks on href="#estimate" anywhere on the page
// and fires the eos:open-estimate event to expand InlineEstimate
export function EstimateHashListener() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a[href="#estimate"]');
      if (!target) return;
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('eos:open-estimate'));
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
