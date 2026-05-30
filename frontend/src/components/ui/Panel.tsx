"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

type PanelProps = {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
  padding?: "none" | "sm" | "md";
};

export function Panel({ children, className, title, action, padding = "md" }: PanelProps) {
  return (
    <section
      className={cn(
        "rounded-md border border-hl-border bg-hl-panel",
        padding === "md" && "p-4",
        padding === "sm" && "p-3",
        className,
      )}
    >
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-hl-border pb-2">
          {title && (
            <h2 className="font-heading text-[11px] font-medium uppercase tracking-[0.14em] text-hl-muted">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCell({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: "teal" | "orange" | "neutral";
}) {
  return (
    <div className="border-r border-hl-border px-4 py-3 last:border-r-0">
      <p className="text-[10px] uppercase tracking-[0.12em] text-hl-muted">{label}</p>
      <div
        className={cn(
          "mt-1 font-heading text-xl font-semibold tabular-nums tracking-tight",
          accent === "teal" && "text-hl-teal",
          accent === "orange" && "text-btc-orange",
          (!accent || accent === "neutral") && "text-hl-text",
        )}
      >
        {value}
      </div>
      {sub && <p className="mt-0.5 text-[11px] text-hl-muted">{sub}</p>}
    </div>
  );
}
