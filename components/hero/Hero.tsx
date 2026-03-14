"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { IntelligenceTriangle } from "./IntelligenceTriangle";

export function Hero() {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  const glowStyle = useMemo(() => {
    if (prefersReducedMotion) {
      return { background: "radial-gradient(circle at 50% 45%, rgba(128,147,173,0.16), rgba(6,10,16,0) 58%)" };
    }

    return {
      background: `radial-gradient(circle at ${50 + pointer.x * 8}% ${45 + pointer.y * 8}%, rgba(128,147,173,0.24), rgba(6,10,16,0) 58%)`,
    };
  }, [pointer.x, pointer.y, prefersReducedMotion]);

  return (
    <section
      className="relative isolate min-h-[95vh] overflow-hidden bg-[#06090f] text-slate-100"
      onPointerMove={(event) => {
        if (prefersReducedMotion) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        setPointer({ x, y });
      }}
      onPointerLeave={() => setPointer({ x: 0, y: 0 })}
      aria-labelledby="hero-title"
    >
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        style={glowStyle}
      />

      <div className="relative mx-auto grid min-h-[95vh] max-w-7xl items-center gap-14 px-6 py-20 md:grid-cols-[1.06fr_0.94fr] md:px-10 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="order-2 space-y-6 md:order-1"
        >
          <p className="text-xs uppercase tracking-[0.26em] text-slate-300/80">Performance Intelligence Platform</p>
          <h1
            id="hero-title"
            className="max-w-2xl text-balance text-4xl font-medium leading-tight tracking-[-0.02em] text-slate-50 sm:text-5xl lg:text-[3.5rem]"
          >
            Performance intelligence for individuals, teams, and organisations.
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Sonartra maps behavioural signals, leadership dynamics, and organisational patterns to help build
            higher-performing teams.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="#"
              className="inline-flex items-center justify-center rounded-md border border-slate-300/20 bg-slate-100/95 px-5 py-3 text-sm font-medium tracking-[0.08em] text-slate-950 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-100"
            >
              Explore Sonartra Signals
            </Link>
            <Link
              href="#"
              className="inline-flex items-center justify-center rounded-md border border-slate-500/40 px-5 py-3 text-sm font-medium tracking-[0.08em] text-slate-100 transition hover:border-slate-300/60 hover:bg-slate-200/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
            >
              View platform overview
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="order-1 md:order-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
        >
          <IntelligenceTriangle reducedMotion={prefersReducedMotion} pointerX={pointer.x} pointerY={pointer.y} />
        </motion.div>
      </div>
    </section>
  );
}
