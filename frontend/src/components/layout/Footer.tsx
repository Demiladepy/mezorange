"use client";

import { MezoWordmark } from "@/components/brand/MezoWordmark";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-hl-border py-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-hl-muted">
          Mezorange LP · Mezo Testnet · Slipstream CL
        </p>
        <div className="flex items-center gap-2 text-[10px] text-hl-muted">
          <span>Powered by</span>
          <MezoWordmark />
        </div>
      </div>
    </footer>
  );
}
