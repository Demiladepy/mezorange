"use client";

import { GlassCard } from "@/components/ui/GlassCard";
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
  const stats = [
    { label: "Total TVL", value: totalTvl, suffix: "", decimals: 0 },
    { label: "Active Vaults", value: activeVaults, suffix: "", decimals: 0 },
    { label: "Total Rebalances", value: totalRebalances, suffix: "", decimals: 0 },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <GlassCard key={stat.label} className="text-center">
          {isLoading ? (
            <Skeleton className="mx-auto h-8 w-24" />
          ) : (
            <p className="font-heading text-2xl font-bold text-text-primary">
              <CountUp value={stat.value} decimals={stat.decimals} suffix={stat.suffix} />
            </p>
          )}
          <p className="mt-2 text-xs uppercase tracking-wider text-text-muted">
            {stat.label}
          </p>
        </GlassCard>
      ))}
    </div>
  );
}
