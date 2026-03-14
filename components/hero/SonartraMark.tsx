import * as React from "react";

type SonartraMarkProps = {
  x?: number;
  y?: number;
  size?: number;
  className?: string;
};

/**
 * Temporary geometric Sonartra "S" mark placeholder.
 * Replace this component with final brand SVG when available.
 */
export function SonartraMark({ x = 172, y = 182, size = 56, className }: SonartraMarkProps) {
  return (
    <g className={className} transform={`translate(${x} ${y})`} aria-label="Sonartra mark">
      <defs>
        <linearGradient id="sonartra-mark-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9db4cf" />
          <stop offset="100%" stopColor="#7b92ad" />
        </linearGradient>
      </defs>

      <rect
        x="4"
        y="4"
        width={size - 8}
        height={size - 8}
        rx="14"
        fill="rgba(20,28,39,0.75)"
        stroke="rgba(156,178,204,0.36)"
      />

      <path
        d="M37 17.5H23.5C20.5 17.5 18.5 19.2 18.5 22.05C18.5 24.4 19.95 25.85 23.4 26.8L29.95 28.7C32.15 29.35 33.2 30.2 33.2 31.95C33.2 34.2 31.55 35.7 28.95 35.7H16.7"
        fill="none"
        stroke="url(#sonartra-mark-stroke)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}
