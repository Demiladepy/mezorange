"use client";

import { Panel, StatCell } from "@/components/ui/Panel";
import { CountUp } from "@/components/ui/CountUp";
import { Skeleton } from "@/components/ui/Skeleton";

type StatsStripProps = {
  totalTvl: number;
  activeVaults: number;
  totalRebalances: number;
  isLoading?: boolean;
};

export function StatsStrip({
  totalTvl,
  activeVaults,
  totalRebalances,
  isLoading,
}: StatsStripProps) {
  return (
    <Panel padding="none" title="Protocol metrics">
      <div className="grid grid-cols-1 divide-y divide-hl-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <StatCell
          label="Total TVL"
          value={
            isLoading ? (
              <Skeleton className="mt-1 h-7 w-24" />
            ) : (
              <CountUp value={totalTvl / 1e18} decimals={4} suffix=" MUSD" />
            )
          }
          accent="teal"
        />
        <StatCell
          label="Active vaults"
          value={
            isLoading ? (
              <Skeleton className="mt-1 h-7 w-12" />
            ) : (
              <CountUp value={activeVaults} decimals={0} />
            )
          }
        />
        <StatCell
          label="Rebalances (indexed)"
          value={
            isLoading ? (
              <Skeleton className="mt-1 h-7 w-12" />
            ) : (
              <CountUp value={totalRebalances} decimals={0} />
            )
          }
          sub="via Goldsky · synced"
          accent="orange"
        />
      </div>
      {!isLoading && totalTvl === 0 && (
        <p className="border-t border-hl-border px-4 py-2 text-[11px] text-hl-muted">
          TVL reads token0-denominated assets from chain. Zero until first deposit lands liquidity.
        </p>
      )}
    </Panel>
  );
}
