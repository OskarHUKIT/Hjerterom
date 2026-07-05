"use client";

import { useEffect, useState, type ComponentProps } from "react";
import dynamic from "next/dynamic";
import { AuroraBackgroundFallback } from "@/components/ui/aurora-background";

const AuroraBackgroundAnimated = dynamic(
  () =>
    import("@/components/ui/aurora-background").then((mod) => ({
      default: mod.AuroraBackground,
    })),
  { ssr: false, loading: () => null }
);

type LazyAuroraBackgroundProps = ComponentProps<typeof AuroraBackgroundFallback>;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}

/**
 * Defers aurora animation until after hydration (LCP-safe).
 * Renders an identical-size static gradient until mounted; no layout shift.
 */
export function LazyAuroraBackground(props: LazyAuroraBackgroundProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const mount = () => setReady(true);
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(mount, { timeout: 2000 });
      return () => cancelIdleCallback(id);
    }
    const id = window.setTimeout(mount, 1);
    return () => window.clearTimeout(id);
  }, [prefersReducedMotion]);

  if (prefersReducedMotion || !ready) {
    return <AuroraBackgroundFallback {...props} />;
  }

  return <AuroraBackgroundAnimated {...props} />;
}
