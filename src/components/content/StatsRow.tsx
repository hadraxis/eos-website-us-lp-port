'use client';

import { useEffect, useRef, useState } from 'react';

export interface Stat {
  value: string;
  numericValue?: number;
  suffix?: string;
  label: string;
}

function AnimatedNumber({ from = 0, to, suffix = '', duration = 600 }: { from?: number; to: number; suffix?: string; duration?: number }) {
  const [current, setCurrent] = useState(from);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [from, to, duration]);

  return <>{current.toLocaleString()}{suffix}</>;
}

function StatItem({ stat }: { stat: Stat }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-center gap-1">
      <div className="font-mono text-3xl font-bold tabular-nums text-white">
        {visible && stat.numericValue !== undefined ? (
          <AnimatedNumber to={stat.numericValue} suffix={stat.suffix ?? ''} />
        ) : (
          stat.value
        )}
      </div>
      <div className="text-dark-muted text-sm text-center">{stat.label}</div>
    </div>
  );
}

export function StatsRow({ stats, className = '' }: { stats: Stat[]; className?: string }) {
  return (
    <div className={`flex flex-wrap justify-center gap-8 md:gap-12 ${className}`}>
      {stats.map((stat) => (
        <StatItem key={stat.label} stat={stat} />
      ))}
    </div>
  );
}
