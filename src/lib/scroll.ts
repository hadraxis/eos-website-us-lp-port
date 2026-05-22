/**
 * Custom smooth-scroll with duration control.
 *
 * Native `scrollIntoView({ behavior: 'smooth' })` runs at a browser-controlled
 * speed (typically 400-700ms) with no duration override. For "catch the eye
 * as content slides past" effects, we need ~1.5-2s of decelerating travel.
 *
 * Uses requestAnimationFrame + an ease-in-out cubic curve. Honors
 * prefers-reduced-motion by jumping instantly. Zero dependencies.
 */

/** Quintic ease-out — fast initial travel that decelerates strongly toward
 *  the target. The last ~30% of the animation barely moves, giving a "soft
 *  landing" feel as the target slides into the centered position. Better
 *  than ease-in-out cubic for "catch the eye then settle gently." */
function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

/** Scroll the page so the target element is vertically centered in the
 *  viewport, with a duration that scales with the travel distance so velocity
 *  feels consistent. Short scrolls (~1000px) finish in ~1.6s; long scrolls
 *  (top of LP → Megan ~3000px) take ~3.2s capped, so the eye registers
 *  intermediate sections rather than blurring past them.
 *
 *  Pass `durationMs` to override the auto-calculation. Pass 0 (or have
 *  prefers-reduced-motion enabled) for an instant jump. */
export function smoothScrollToCenter(
  el: HTMLElement,
  durationMs?: number,
): void {
  if (typeof window === 'undefined') return;

  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const rect = el.getBoundingClientRect();
  const elTop = rect.top + window.scrollY;
  const targetY = Math.max(0, elTop - (window.innerHeight - rect.height) / 2);
  const startY = window.scrollY;
  const distance = Math.abs(targetY - startY);

  // Auto-calculate from distance unless overridden. ~1.6ms/px, floor 1.4s,
  // ceiling 3.2s. Tuned so a short ~1000px scroll feels snappy and a long
  // ~3000px scroll feels deliberate without being sluggish.
  const duration = durationMs ?? Math.min(3200, Math.max(1400, distance * 1.6));

  if (prefersReducedMotion || duration <= 0 || distance < 2) {
    window.scrollTo(0, targetY);
    return;
  }

  const dy = targetY - startY;
  const startTime = performance.now();
  function step(now: number) {
    const t = Math.min(1, (now - startTime) / duration);
    window.scrollTo(0, startY + dy * easeOutQuint(t));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
