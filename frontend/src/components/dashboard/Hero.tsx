"use client";

import { Panel, StatCell } from "@/components/ui/Panel";
import { defaultPoolAddress, defaultVaultAddress } from "@/lib/env";
import { shortenAddress } from "@/lib/format";

export function Hero() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-heading text-[11px] uppercase tracking-[0.2em] text-hl-teal">
            Mezo Testnet · Slipstream CL
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-hl-text md:text-4xl">
            Mezorange LP
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-hl-muted">
            Automated concentrated-liquidity vault for BTC/MUSD on Mezo&apos;s CL DEX. Deposit,
            monitor range position, and rebalance when price drifts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hl-badge hl-badge-live">Live</span>
          <span className="hl-badge">Chain 31611</span>
        </div>
      </div>

      <Panel padding="none" className="overflow-hidden">
        <div className="grid grid-cols-1 divide-y divide-hl-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          <StatCell
            label="Vault"
            value={defaultVaultAddress ? shortenAddress(defaultVaultAddress, 4) : "—"}
            sub="MezrangeVault"
          />
          <StatCell
            label="Pool"
            value={defaultPoolAddress ? shortenAddress(defaultPoolAddress, 4) : "—"}
            sub="BTC/MUSD · ts 200"
          />
          <StatCell label="Indexer" value="Goldsky" sub="Subgraph · mezorange/1.0.0" accent="teal" />
          <StatCell label="Mode" value="Manual" sub="Keeper auto-rebalance in v0.2" accent="orange" />
        </div>
      </Panel>
    </div>
  );
}
