"use client";

import { motion } from "framer-motion";

type PulseRingsProps = {
  reducedMotion: boolean;
};

const ringBase = "fill-none stroke-[1.2] stroke-slate-300/20";

export function PulseRings({ reducedMotion }: PulseRingsProps) {
  const rings = [100, 132, 164];

  return (
    <g aria-hidden="true">
      {rings.map((radius, index) => {
        const delay = index * 1.75;

        if (reducedMotion) {
          return <circle key={radius} cx="200" cy="210" r={radius} className={ringBase} />;
        }

        return (
          <motion.circle
            key={radius}
            cx="200"
            cy="210"
            r={radius}
            className={ringBase}
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{
              opacity: [0.08, 0.26, 0.08],
              scale: [0.94, 1.03, 0.94],
            }}
            transition={{
              duration: 9,
              ease: "easeInOut",
              delay,
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: 0.3,
            }}
            style={{ transformOrigin: "200px 210px" }}
          />
        );
      })}
    </g>
  );
}
