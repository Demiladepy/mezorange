"use client";

import { cn } from "@/lib/cn";

type PulseGlowProps = {
  color?: "accent" | "success" | "warning" | "danger";
  className?: string;
  size?: "sm" | "md" | "lg";
};

const colorMap = {
  accent: "from-btc-orange/40 via-btc-gold/20 to-transparent",
  success: "from-success/40 to-transparent",
  warning: "from-warning/40 to-transparent",
  danger: "from-danger/40 to-transparent",
};

const sizeMap = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-40 w-40",
};

export function PulseGlow({
  color = "accent",
  className,
  size = "md",
}: PulseGlowProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute rounded-full bg-gradient-radial opacity-60 blur-2xl motion-safe:animate-pulse-glow",
        colorMap[color],
        sizeMap[size],
        className,
      )}
      style={{
        background:
          color === "accent"
            ? "radial-gradient(circle, rgba(247,147,26,0.35) 0%, transparent 70%)"
            : undefined,
      }}
    />
  );
}
