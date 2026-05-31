"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export function ScopeBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="note"
      className={cn(
        "flex flex-col gap-3 rounded-md border border-btc-orange/25 bg-btc-orange/5 px-4 py-3 sm:flex-row sm:items-start sm:justify-between",
      )}
    >
      <div>
        <p className="font-heading text-xs font-semibold uppercase tracking-wide text-btc-orange">
          Mezo Hackathon · v0.1
        </p>
        <p className="mt-1 text-xs leading-relaxed text-hl-muted">
          Testnet only · manual rebalance · direct vault deploy (factory gas-capped on Mezo).
          Native BTC approve is limited — dual-token deposits use ERC-20 MUSD + wrapped BTC paths.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 self-start rounded border border-hl-border px-2 py-1 text-[10px] uppercase tracking-wide text-hl-muted transition hover:text-hl-text"
      >
        Dismiss
      </button>
    </div>
  );
}
