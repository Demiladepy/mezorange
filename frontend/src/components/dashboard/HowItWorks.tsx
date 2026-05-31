"use client";

import { Panel } from "@/components/ui/Panel";

const STEPS = [
  {
    n: "01",
    title: "Deposit dual-sided",
    body: "Provide BTC and MUSD into the MezrangeVault. Shares track your pro-rata CL position.",
  },
  {
    n: "02",
    title: "Monitor the range",
    body: "Watch live tick position vs vault bounds. Goldsky indexes deposits, rebalances, and fees.",
  },
  {
    n: "03",
    title: "Rebalance when needed",
    body: "When price drifts, the keeper recenters liquidity. v0.1 triggers rebalance manually from the UI.",
  },
] as const;

export function HowItWorks() {
  return (
    <Panel title="How it works">
      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step) => (
          <div
            key={step.n}
            className="rounded border border-hl-border/80 bg-hl-bg/40 p-3"
          >
            <p className="font-mono text-[10px] text-hl-teal">{step.n}</p>
            <h3 className="mt-2 font-heading text-sm font-semibold text-hl-text">
              {step.title}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-hl-muted">{step.body}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
