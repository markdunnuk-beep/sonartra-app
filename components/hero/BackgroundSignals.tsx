"use client";

import { motion } from "framer-motion";

type BackgroundSignalsProps = {
  reducedMotion: boolean;
};

const signalRects = [
  { x: 26, y: 70, w: 20, h: 2, delay: 0.2 },
  { x: 82, y: 108, w: 14, h: 2, delay: 1.1 },
  { x: 326, y: 102, w: 18, h: 2, delay: 0.8 },
  { x: 295, y: 266, w: 12, h: 2, delay: 1.7 },
  { x: 62, y: 282, w: 14, h: 2, delay: 1.3 },
  { x: 360, y: 202, w: 22, h: 2, delay: 0.5 },
  { x: 120, y: 318, w: 16, h: 2, delay: 2.1 },
];

export function BackgroundSignals({ reducedMotion }: BackgroundSignalsProps) {
  return (
    <g aria-hidden="true">
      <rect x="0" y="0" width="400" height="400" fill="url(#hero-bg)" />
      <ellipse cx="200" cy="200" rx="146" ry="146" fill="url(#hero-glow)" opacity="0.5" />

      {[60, 100, 140, 180].map((offset) => (
        <line
          key={offset}
          x1={offset}
          y1="34"
          x2={offset}
          y2="366"
          className="stroke-slate-500/10"
          strokeWidth="1"
        />
      ))}

      {[72, 136, 200, 264, 328].map((offset) => (
        <line
          key={offset}
          x1="34"
          y1={offset}
          x2="366"
          y2={offset}
          className="stroke-slate-500/10"
          strokeWidth="1"
        />
      ))}

      {signalRects.map((signal) => {
        if (reducedMotion) {
          return (
            <rect
              key={`${signal.x}-${signal.y}`}
              x={signal.x}
              y={signal.y}
              width={signal.w}
              height={signal.h}
              rx="1"
              className="fill-slate-300/25"
            />
          );
        }

        return (
          <motion.rect
            key={`${signal.x}-${signal.y}`}
            x={signal.x}
            y={signal.y}
            width={signal.w}
            height={signal.h}
            rx="1"
            className="fill-slate-300/25"
            animate={{ opacity: [0.08, 0.36, 0.08] }}
            transition={{
              duration: 5.5,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
              delay: signal.delay,
            }}
          />
        );
      })}
    </g>
  );
}
