"use client";

import { MezoWordmark } from "@/components/brand/MezoWordmark";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
        <p className="text-xs text-text-muted">
          Mezrange Pro · Concentrated liquidity vaults on Mezo Testnet
        </p>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span>Powered by</span>
          <MezoWordmark glow />
        </div>
      </div>
    </footer>
  );
}
