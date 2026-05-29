"use client";

import { cn } from "@/lib/cn";

type MezoWordmarkProps = {
  className?: string;
  glow?: boolean;
};

export function MezoWordmark({ className, glow = false }: MezoWordmarkProps) {
  return (
    <span
      className={cn(
        "font-heading text-sm font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-accent",
        glow && "drop-shadow-[0_0_12px_rgba(247,147,26,0.5)]",
        className,
      )}
    >
      MEZO
    </span>
  );
}
