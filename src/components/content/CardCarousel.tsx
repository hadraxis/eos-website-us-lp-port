'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { ReactNode, MouseEvent, TouchEvent } from 'react';
import { track } from '@/lib/track';

interface CarouselProps {
  children: ReactNode;
  className?: string;
  showDots?: boolean;
  itemCount?: number;
  trackingId?: string;
}

export function CardCarousel({ children, className = '', showDots = false, itemCount, trackingId }: CarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollStart = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);
  const animFrame = useRef<number>(0);
  const overscrollX = useRef(0);
  const dragStartIndex = useRef(0);

  const currentIndex = () => {
    const el = trackRef.current;
    if (!el || !itemCount) return 0;
    const cardWidth = el.scrollWidth / itemCount;
    return Math.max(0, Math.min(Math.round(el.scrollLeft / cardWidth), itemCount - 1));
  };

  const fireSwipe = (to: number) => {
    if (!trackingId) return;
    const from = dragStartIndex.current;
    if (from === to) return;
    track('lp_carousel_swipe', {
      tracking_id: trackingId,
      from_index: from,
      to_index: to,
      direction: to > from ? 'next' : 'prev',
    });
  };

  const updateActiveIndex = useCallback(() => {
    const track = trackRef.current;
    if (!track || !itemCount) return;
    const cardWidth = track.scrollWidth / itemCount;
    const idx = Math.round(track.scrollLeft / cardWidth);
    setActiveIndex(Math.max(0, Math.min(idx, itemCount - 1)));
  }, [itemCount]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !itemCount) return;
    updateActiveIndex();
    const onScroll = () => requestAnimationFrame(updateActiveIndex);
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, [itemCount, updateActiveIndex]);

  // Apply visual overscroll via transform
  const applyOverscroll = (px: number) => {
    const track = trackRef.current;
    if (!track) return;
    overscrollX.current = px;
    if (px === 0) {
      track.style.transform = '';
    } else {
      track.style.transform = `translateX(${px}px)`;
    }
  };

  // Snap overscroll back to zero with spring animation
  const springBack = () => {
    const track = trackRef.current;
    if (!track || overscrollX.current === 0) return;

    track.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
    track.style.transform = 'translateX(0px)';
    overscrollX.current = 0;

    const onEnd = () => {
      track.style.transition = '';
      track.style.transform = '';
      track.removeEventListener('transitionend', onEnd);
    };
    track.addEventListener('transitionend', onEnd);
  };

  // Momentum coast after release
  const coast = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const friction = 0.95;
    const threshold = 0.5;

    const step = () => {
      velocity.current *= friction;
      if (Math.abs(velocity.current) < threshold) {
        // Snap to nearest card
        track.style.scrollSnapType = 'x proximity';
        if (itemCount) {
          const cardWidth = track.scrollWidth / itemCount;
          const targetIdx = Math.round(track.scrollLeft / cardWidth);
          track.scrollTo({ left: targetIdx * cardWidth, behavior: 'smooth' });
          fireSwipe(targetIdx);
        }
        return;
      }
      track.scrollLeft -= velocity.current;
      animFrame.current = requestAnimationFrame(step);
    };
    animFrame.current = requestAnimationFrame(step);
  }, [itemCount]);

  // Mouse drag handlers (desktop)
  const handleMouseDown = (e: MouseEvent) => {
    const track = trackRef.current;
    if (!track) return;
    cancelAnimationFrame(animFrame.current);
    track.style.transition = '';
    isDragging.current = true;
    startX.current = e.clientX;
    lastX.current = e.clientX;
    lastTime.current = Date.now();
    scrollStart.current = track.scrollLeft;
    dragStartIndex.current = currentIndex();
    velocity.current = 0;
    overscrollX.current = 0;
    track.style.scrollSnapType = 'none';
    track.style.scrollBehavior = 'auto';
    track.style.cursor = 'grabbing';
    track.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    const track = trackRef.current;
    if (!track) return;
    const now = Date.now();
    const dt = now - lastTime.current;
    const dx = e.clientX - lastX.current;
    if (dt > 0) velocity.current = dx / dt * 16;
    lastX.current = e.clientX;
    lastTime.current = now;

    const rawTarget = scrollStart.current - (e.clientX - startX.current);
    const maxScroll = track.scrollWidth - track.clientWidth;

    if (rawTarget < 0) {
      // Overscroll left — rubber band
      track.scrollLeft = 0;
      applyOverscroll(-rawTarget * 0.35);
    } else if (rawTarget > maxScroll) {
      // Overscroll right — rubber band
      track.scrollLeft = maxScroll;
      applyOverscroll(-(rawTarget - maxScroll) * 0.35);
    } else {
      applyOverscroll(0);
      track.scrollLeft = rawTarget;
    }
  };

  const handleMouseUp = () => {
    const track = trackRef.current;
    if (!track || !isDragging.current) return;
    isDragging.current = false;
    track.style.cursor = 'grab';
    track.style.userSelect = '';

    // Spring back from overscroll
    if (overscrollX.current !== 0) {
      springBack();
      return;
    }

    if (Math.abs(velocity.current) > 1) {
      coast();
    } else {
      track.style.scrollSnapType = 'x proximity';
      fireSwipe(currentIndex());
    }
  };

  // Touch drag handlers (mobile)
  const handleTouchStart = (e: TouchEvent) => {
    const track = trackRef.current;
    if (!track) return;
    cancelAnimationFrame(animFrame.current);
    track.style.transition = '';
    startX.current = e.touches[0].clientX;
    lastX.current = e.touches[0].clientX;
    lastTime.current = Date.now();
    scrollStart.current = track.scrollLeft;
    dragStartIndex.current = currentIndex();
    velocity.current = 0;
    overscrollX.current = 0;
    track.style.scrollSnapType = 'none';
    track.style.scrollBehavior = 'auto';
  };

  const handleTouchMove = (e: TouchEvent) => {
    const track = trackRef.current;
    if (!track) return;
    const now = Date.now();
    const dx = e.touches[0].clientX - lastX.current;
    const dt = now - lastTime.current;
    if (dt > 0) velocity.current = dx / dt * 16;
    lastX.current = e.touches[0].clientX;
    lastTime.current = now;

    const rawTarget = scrollStart.current - (e.touches[0].clientX - startX.current);
    const maxScroll = track.scrollWidth - track.clientWidth;

    if (rawTarget < 0) {
      track.scrollLeft = 0;
      applyOverscroll(-rawTarget * 0.35);
    } else if (rawTarget > maxScroll) {
      track.scrollLeft = maxScroll;
      applyOverscroll(-(rawTarget - maxScroll) * 0.35);
    } else {
      applyOverscroll(0);
      track.scrollLeft = rawTarget;
    }
  };

  const handleTouchEnd = () => {
    const track = trackRef.current;
    if (!track) return;

    if (overscrollX.current !== 0) {
      springBack();
      return;
    }

    if (Math.abs(velocity.current) > 1) {
      coast();
    } else {
      track.style.scrollSnapType = 'x proximity';
      fireSwipe(currentIndex());
    }
  };

  // Reset all inline styles on mount / route change / bfcache restore
  const resetTrackStyles = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    cancelAnimationFrame(animFrame.current);
    track.style.transform = '';
    track.style.transition = '';
    track.style.scrollSnapType = 'x proximity';
    track.style.scrollBehavior = '';
    track.style.cursor = 'grab';
    track.style.userSelect = '';
    overscrollX.current = 0;
    isDragging.current = false;
    velocity.current = 0;
  }, []);

  useEffect(() => {
    resetTrackStyles();

    // bfcache / back-forward nav restore
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) resetTrackStyles();
    };
    // Next.js popstate (client-side back/forward)
    const onPopState = () => resetTrackStyles();

    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('popstate', onPopState);
    return () => {
      cancelAnimationFrame(animFrame.current);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('popstate', onPopState);
    };
  }, [resetTrackStyles]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        ref={trackRef}
        tabIndex={0}
        role="region"
        aria-label="Image carousel — use arrow keys to scroll"
        className="flex gap-5 overflow-x-auto pb-4 touch-pan-y focus:outline-none focus-visible:ring-2 focus-visible:ring-eos-accent/40 focus-visible:ring-offset-2 rounded-card"
        style={{
          scrollSnapType: 'x proximity',
          overscrollBehaviorX: 'contain',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          cursor: 'grab',
          WebkitOverflowScrolling: 'touch',
          willChange: 'transform',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDragStart={(e) => e.preventDefault()}
      >
        {children}
      </div>
      {showDots && itemCount && itemCount > 1 && (
        <div className="flex justify-center mt-4">
          {Array.from({ length: itemCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === activeIndex ? 'true' : undefined}
              onClick={() => {
                const el = trackRef.current;
                if (!el || !itemCount) return;
                const cardWidth = el.scrollWidth / itemCount;
                el.scrollTo({ left: cardWidth * i, behavior: 'smooth' });
                if (trackingId) {
                  track('lp_carousel_dot_click', {
                    tracking_id: trackingId,
                    from_index: activeIndex,
                    to_index: i,
                  });
                }
              }}
              className="w-11 h-11 flex items-center justify-center bg-transparent border-none cursor-pointer p-0"
            >
              <span
                aria-hidden="true"
                className={`block rounded-full transition-all duration-300 ${
                  i === activeIndex ? 'w-5 h-1.5 bg-eos-accent' : 'w-1.5 h-1.5 bg-rule'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CarouselItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`shrink-0 transition-transform duration-300 ease-out self-stretch ${className}`}
      style={{ scrollSnapAlign: 'center' }}
    >
      {children}
    </div>
  );
}
