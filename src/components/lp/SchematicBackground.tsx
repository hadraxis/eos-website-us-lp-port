'use client';

import { useEffect, useId, useRef, useState } from 'react';

type Props = {
  opacity?: number;
  className?: string;
};

/**
 * One-line note: extracted from homepage Hero schematic. Use as absolute bg
 * inside `relative` bg-dark sections. useId() gates gradient id collisions.
 */
export function SchematicBackground({ opacity = 0.11, className = '' }: Props) {
  const id = useId().replace(/[:]/g, '');
  const glowId = `hglow-${id}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => setPaused(!entry.isIntersecting),
      { rootMargin: '100px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1200 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      overflow="hidden"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity,
        pointerEvents: 'none',
        contentVisibility: 'auto',
        overflow: 'hidden',
      }}
      aria-hidden="true"
      className={className}
    >
      <defs>
        <style>{`
          .sb-${id} .hf { stroke: white; stroke-width: 1.2; fill: none; }
          .sb-${id} .hfb { stroke: white; stroke-width: 2; fill: none; }
          .sb-${id} .hfl { stroke: white; stroke-width: 0.7; fill: none; }
          .sb-${id} .hft { fill: white; font-family: monospace; font-size: 9px; letter-spacing: 1px; }
          .sb-${id} .flow {
            stroke: white; stroke-width: 1.5; fill: none;
            stroke-dasharray: 8 12;
            animation: sbflow-${id} 2.4s linear infinite;
          }
          .sb-${id} .flowRev {
            stroke: white; stroke-width: 1.5; fill: none;
            stroke-dasharray: 8 12;
            animation: sbflow-${id} 2.4s linear infinite reverse;
          }
          .sb-${id} .pulse { fill: white; transform-origin: center; transform-box: fill-box; animation: sbpulse-${id} 2.8s ease-in-out infinite; }
          .sb-${id} .pulse2 { fill: white; transform-origin: center; transform-box: fill-box; animation: sbpulse-${id} 2.8s ease-in-out 0.9s infinite; }
          .sb-${id} .pulse3 { fill: white; transform-origin: center; transform-box: fill-box; animation: sbpulse-${id} 2.8s ease-in-out 1.8s infinite; }
          .sb-${id} .drawIn {
            stroke: white; stroke-width: 1.2; fill: none;
            stroke-dasharray: 400; stroke-dashoffset: 400;
            animation: sbdraw-${id} 2s ease-out 0.3s forwards;
          }
          .sb-${id} .drawIn2 {
            stroke: white; stroke-width: 1.2; fill: none;
            stroke-dasharray: 300; stroke-dashoffset: 300;
            animation: sbdraw-${id} 1.8s ease-out 0.8s forwards;
          }
          .sb-${id} .drawIn3 {
            stroke: white; stroke-width: 1.2; fill: none;
            stroke-dasharray: 500; stroke-dashoffset: 500;
            animation: sbdraw-${id} 2.2s ease-out 1.2s forwards;
          }
          @keyframes sbflow-${id} { to { stroke-dashoffset: -80; } }
          @keyframes sbpulse-${id} {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.4); }
          }
          @keyframes sbdraw-${id} { to { stroke-dashoffset: 0; } }
          .sb-${id}.paused .flow, .sb-${id}.paused .flowRev,
          .sb-${id}.paused .pulse, .sb-${id}.paused .pulse2, .sb-${id}.paused .pulse3,
          .sb-${id}.paused .drawIn, .sb-${id}.paused .drawIn2, .sb-${id}.paused .drawIn3 {
            animation-play-state: paused;
          }
          @media (prefers-reduced-motion: reduce) {
            .sb-${id} .flow, .sb-${id} .flowRev, .sb-${id} .pulse,
            .sb-${id} .pulse2, .sb-${id} .pulse3,
            .sb-${id} .drawIn, .sb-${id} .drawIn2, .sb-${id} .drawIn3 {
              animation: none;
            }
            .sb-${id} .drawIn, .sb-${id} .drawIn2, .sb-${id} .drawIn3 {
              stroke-dashoffset: 0;
            }
          }
        `}</style>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0.3" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className={`sb-${id}${paused ? ' paused' : ''}`}>
        {[0, 80, 160, 240, 320, 400, 480, 560].map((y) => (
          <line key={y} className="hfl" x1="0" y1={y} x2="1200" y2={y} strokeOpacity="0.15" />
        ))}
        {[0, 120, 240, 360, 480, 600, 720, 840, 960, 1080, 1200].map((x) => (
          <line key={x} className="hfl" x1={x} y1="0" x2={x} y2="600" strokeOpacity="0.15" />
        ))}

        <line className="drawIn hfb" x1="30" y1="280" x2="220" y2="280" />
        <text className="hft" x="38" y="268" opacity="0.7">UTILITY FEED</text>
        <line className="hf" x1="80" y1="272" x2="80" y2="288" />
        <line className="hf" x1="110" y1="272" x2="110" y2="288" />
        <line className="hf" x1="140" y1="272" x2="140" y2="288" />

        <rect className="drawIn hfb" x="220" y="250" width="90" height="60" rx="3" />
        <text className="hft" x="230" y="276" opacity="0.9">MAIN</text>
        <text className="hft" x="230" y="290" opacity="0.9">PANEL</text>
        <line className="hfl" x1="230" y1="302" x2="300" y2="302" />
        <line className="hfl" x1="248" y1="298" x2="248" y2="306" />
        <line className="hfl" x1="268" y1="298" x2="268" y2="306" />
        <line className="hfl" x1="288" y1="298" x2="288" y2="306" />

        <line className="flow" x1="160" y1="280" x2="218" y2="280" />

        <line className="drawIn2 hf" x1="310" y1="280" x2="420" y2="280" />
        <rect className="hf" x="420" y="256" width="70" height="48" rx="3" />
        <text className="hft" x="428" y="278" opacity="0.9">XFER</text>
        <text className="hft" x="428" y="292" opacity="0.9">SW</text>
        <path className="hf" d="M 434 272 Q 455 260 476 272" />
        <line className="flow" x1="318" y1="280" x2="418" y2="280" />

        <line className="drawIn2 hf" x1="490" y1="280" x2="590" y2="280" />
        <rect className="hfb" x="590" y="248" width="90" height="64" rx="3" />
        <text className="hft" x="601" y="272" opacity="0.9">INVERTER</text>
        <text className="hft" x="601" y="287" opacity="0.9">11.5 kW</text>
        <text className="hft" x="601" y="303" style={{ fontSize: '7px' }} opacity="0.7">AC ◄ ► DC</text>
        <line className="flow" x1="498" y1="280" x2="588" y2="280" />

        <line className="drawIn3 hf" x1="635" y1="312" x2="635" y2="370" />
        <line className="drawIn3 hf" x1="635" y1="370" x2="760" y2="370" />
        <text className="hft" x="645" y="358" opacity="0.7">DC BUS</text>
        <line className="flowRev" x1="635" y1="320" x2="635" y2="368" />
        <line className="flowRev" x1="637" y1="370" x2="758" y2="370" />

        <rect className="hfb" x="760" y="330" width="140" height="80" rx="4" />
        <text className="hft" x="775" y="358" opacity="0.9">BATTERY ESS</text>
        <text className="hft" x="775" y="374" opacity="0.9">26.28 kWh</text>
        <text className="hft" x="775" y="390" opacity="0.9">LFP</text>
        <line className="hfl" x1="820" y1="334" x2="820" y2="344" />
        <line className="hfl" x1="835" y1="334" x2="835" y2="344" />
        <line className="hfl" x1="850" y1="334" x2="850" y2="344" />
        <line className="hfl" x1="865" y1="334" x2="865" y2="344" />
        <rect x="775" y="398" width="110" height="5" className="hfl" />
        <rect x="775" y="398" width="82" height="5" style={{ fill: 'white', opacity: 0.5 }} />
        <text className="hft" x="775" y="412" style={{ fontSize: '7px' }} opacity="0.6">SOC 74%</text>

        <ellipse cx="830" cy="370" rx="90" ry="60" fill={`url(#${glowId})`} />

        <path className="drawIn3 hf" d="M 920 160 L 1100 160 L 1100 420 L 920 420 Z" strokeOpacity="0.5" />
        <path className="drawIn3 hf" d="M 908 168 L 1010 88 L 1112 168" strokeOpacity="0.5" />
        <text className="hft" x="945" y="190" opacity="0.5" style={{ fontSize: '8px' }}>RESIDENCE</text>
        <rect className="hfl" x="940" y="250" width="45" height="40" strokeOpacity="0.4" />
        <rect className="hfl" x="1020" y="250" width="45" height="40" strokeOpacity="0.4" />
        <rect className="hfl" x="975" y="350" width="32" height="60" strokeOpacity="0.4" />

        <line className="drawIn3 hf" x1="900" y1="370" x2="920" y2="370" strokeOpacity="0.4" />
        <line className="drawIn3 hf" x1="920" y1="370" x2="920" y2="340" strokeOpacity="0.4" />
        <line className="flow" x1="904" y1="370" x2="918" y2="370" />

        <circle className="pulse" cx="310" cy="280" r="4" />
        <circle className="pulse2" cx="490" cy="280" r="4" />
        <circle className="pulse3" cx="635" cy="312" r="4" />
        <circle className="pulse" cx="900" cy="370" r="3" />

        <line className="hf" x1="635" y1="420" x2="635" y2="450" />
        <line className="hf" x1="618" y1="450" x2="652" y2="450" />
        <line className="hf" x1="623" y1="458" x2="647" y2="458" />
        <line className="hf" x1="628" y1="466" x2="642" y2="466" />

        <circle className="hf" cx="710" cy="280" r="14" />
        <text className="hft" x="700" y="284" style={{ fontSize: '7px' }} opacity="0.8">kWh</text>
        <line className="hf" x1="710" y1="266" x2="710" y2="254" />
        <line className="hf" x1="710" y1="254" x2="760" y2="254" />
        <text className="hft" x="764" y="258" opacity="0.6">METER</text>
      </g>
    </svg>
  );
}
