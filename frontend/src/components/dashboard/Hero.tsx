"use client";

import Link from "next/link";
import { Panel, StatCell } from "@/components/ui/Panel";
import { AddressChip } from "@/components/ui/AddressChip";
import { defaultPoolAddress, defaultVaultAddress } from "@/lib/env";
import { GOLDSKY_SUBGRAPH_LABEL } from "@/lib/links";

export function Hero() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="hl-badge hl-badge-live">Live</span>
          <span className="hl-badge">Chain 31611</span>
          {defaultVaultAddress && (
            <Link
              href={`/vault/${defaultVaultAddress}`}
              className="hl-badge border-hl-teal/40 bg-hl-teal/10 text-hl-teal transition hover:bg-hl-teal/20"
            >
              View live vault →
            </Link>
          )}
        </div>
      </div>

      <Panel padding="none" className="overflow-hidden">
        <div className="grid grid-cols-1 divide-y divide-hl-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          <StatCell
            label="Vault"
            value={
              defaultVaultAddress ? (
                <AddressChip address={defaultVaultAddress} />
              ) : (
                "—"
              )
            }
            sub="MezrangeVault"
          />
          <StatCell
            label="Pool"
            value={
              defaultPoolAddress ? (
                <AddressChip address={defaultPoolAddress} />
              ) : (
                "—"
              )
            }
            sub="BTC/MUSD · ts 200"
          />
          <StatCell
            label="Indexer"
            value="Goldsky"
            sub={`Subgraph · ${GOLDSKY_SUBGRAPH_LABEL}`}
            accent="teal"
          />
          <StatCell label="Mode" value="Manual" sub="Keeper auto-rebalance in v0.2" accent="orange" />
        </div>
      </Panel>
    </div>
  );
}
