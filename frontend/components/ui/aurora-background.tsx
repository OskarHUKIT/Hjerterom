"use client";

import { cn } from "@/lib/utils";
import React from "react";

export interface AuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–1 opacity multiplier for the aurora layer (default 0.5). */
  intensity?: number;
  showRadialGradient?: boolean;
  /** When true, skip animation and render a static northern-lights gradient. */
  staticFallback?: boolean;
}

const AURORA_GRADIENT = `
  [--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)]
  [--dark-gradient:repeating-linear-gradient(100deg,var(--black)_0%,var(--black)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--black)_16%)]
  [--aurora:repeating-linear-gradient(100deg,var(--indigo-500)_10%,var(--indigo-400)_15%,var(--cyan-400)_20%,var(--cyan-300)_25%,var(--indigo-500)_30%)]
  [background-image:var(--white-gradient),var(--aurora)]
  dark:[background-image:var(--dark-gradient),var(--aurora)]
  [background-size:300%,_200%]
  [background-position:50%_50%,50%_50%]
`;

const AURORA_ANIMATED = `
  filter blur-[10px] invert dark:invert-0
  after:content-[""] after:absolute after:inset-0 after:[background-image:var(--white-gradient),var(--aurora)]
  after:dark:[background-image:var(--dark-gradient),var(--aurora)]
  after:[background-size:200%,_100%]
  after:animate-aurora after:[background-attachment:fixed] after:mix-blend-difference
`;

/**
 * Aceternity-style aurora layer — Boly palette (indigo-500 → cyan-400).
 * Use as an absolutely positioned backdrop (`-z-10`), not a page shell.
 */
export function AuroraBackground({
  className,
  intensity = 0.5,
  showRadialGradient = true,
  staticFallback = false,
  style,
  ...props
}: AuroraBackgroundProps) {
  const opacity = Math.min(1, Math.max(0, intensity));

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      style={{ opacity, ...style }}
      {...props}
    >
      <div
        className={cn(
          AURORA_GRADIENT,
          !staticFallback && AURORA_ANIMATED,
          "absolute -inset-[10px] will-change-transform",
          staticFallback ? "opacity-80" : "opacity-50",
          showRadialGradient &&
            "[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]"
        )}
      />
    </div>
  );
}

/** Static gradient shown before lazy mount and for prefers-reduced-motion. */
export function AuroraBackgroundFallback({
  className,
  intensity = 0.5,
  style,
  ...props
}: Omit<AuroraBackgroundProps, "staticFallback" | "showRadialGradient">) {
  return (
    <AuroraBackground
      className={className}
      intensity={intensity}
      staticFallback
      showRadialGradient
      style={style}
      {...props}
    />
  );
}
