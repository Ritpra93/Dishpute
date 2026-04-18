"use client";

import { useEffect, useRef } from "react";
import { animate, useMotionValue, useTransform, motion } from "motion/react";

interface DollarCounterProps {
  /** Target value in cents. */
  cents: number;
  /** Render with cents (e.g. "$892.34") or whole dollars ("$892"). */
  precise?: boolean;
  /** Animate from previous to next value. Defaults to true. */
  animated?: boolean;
  className?: string;
}

/**
 * Big animated dollar counter — the demo's signature beat.
 * Uses motion's spring tween on a numeric MotionValue rather than React state
 * so animation is driven directly by rAF (no re-render per frame).
 */
export function DollarCounter({
  cents,
  precise = false,
  animated = true,
  className,
}: DollarCounterProps) {
  const value = useMotionValue(animated ? 0 : cents);
  const display = useTransform(value, (latest) => {
    const dollars = latest / 100;
    return dollars.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: precise ? 2 : 0,
      maximumFractionDigits: precise ? 2 : 0,
    });
  });

  const prev = useRef(animated ? 0 : cents);

  useEffect(() => {
    const controls = animate(value, cents, {
      duration: animated ? 1.4 : 0,
      ease: [0.16, 1, 0.3, 1],
      onComplete: () => {
        prev.current = cents;
      },
    });
    return () => controls.stop();
  }, [cents, animated, value]);

  return (
    <motion.span
      className={
        "block font-semibold tabular-nums text-money tracking-tight " + (className ?? "")
      }
      initial={animated ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {display}
    </motion.span>
  );
}
