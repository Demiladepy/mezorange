"use client";

import { useMemo } from "react";
import { useContractRead } from "wagmi";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { erc20Abi, mezrangeVaultAbi, uniswapV3PoolAbi } from "@/lib/abis";
import { formatPrice } from "@/lib/format";
import { tickToPrice } from "@/lib/uniswap";
import { cn } from "@/lib/cn";

type PriceVisualizerProps = {
  vaultAddress: `0x${string}`;
};

export function PriceVisualizer({ vaultAddress }: PriceVisualizerProps) {
  const { data: tickLower, isLoading: l0 } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "tickLower",
  });
  const { data: tickUpper, isLoading: l1 } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "tickUpper",
  });
  const { data: needsRebalance } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "needsRebalance",
  });
  const { data: pool } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "pool",
  });
  const { data: token0 } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "token0",
  });
  const { data: token1 } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "token1",
  });
  const { data: decimals0 } = useContractRead({
    address: token0 as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: Boolean(token0) },
  });
  const { data: decimals1 } = useContractRead({
    address: token1 as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: Boolean(token1) },
  });
  const { data: slot0, isLoading: l2 } = useContractRead({
    address: pool as `0x${string}` | undefined,
    abi: uniswapV3PoolAbi,
    functionName: "slot0",
    query: { enabled: Boolean(pool) },
  });

  const isLoading = l0 || l1 || l2;

  const viz = useMemo(() => {
    if (
      tickLower === undefined ||
      tickUpper === undefined ||
      !slot0 ||
      decimals0 === undefined ||
      decimals1 === undefined
    ) {
      return null;
    }
    const lower = Number(tickLower);
    const upper = Number(tickUpper);
    const current = Number(slot0[1]);
    const d0 = Number(decimals0);
    const d1 = Number(decimals1);
    const min = lower - Math.max(200, (upper - lower) * 0.3);
    const max = upper + Math.max(200, (upper - lower) * 0.3);
    const span = max - min || 1;
    const pos = ((current - min) / span) * 100;
    const rangeStart = ((lower - min) / span) * 100;
    const rangeEnd = ((upper - min) / span) * 100;
    const inRange = current >= lower && current <= upper;
    const price = tickToPrice(current, d0, d1);
    const pLower = tickToPrice(lower, d0, d1);
    const pUpper = tickToPrice(upper, d0, d1);
    return { pos, rangeStart, rangeEnd, inRange, price, pLower, pUpper };
  }, [tickLower, tickUpper, slot0, decimals0, decimals1]);

  if (isLoading || !viz) {
    return (
      <GlassCard>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-6 h-12 w-full rounded-full" />
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Price Range
        </h3>
        <span
          className={cn(
            "text-xs font-medium",
            viz.inRange ? "text-success" : "text-danger",
          )}
        >
          {viz.inRange ? "● In Range" : "● Out of Range"}
          {needsRebalance ? " · Rebalance suggested" : ""}
        </span>
      </div>

      <div className="relative mt-8 h-14 rounded-full border border-white/10 bg-obsidian/80">
        <div
          className="absolute inset-y-1 rounded-full bg-gradient-to-r from-indigo-500/40 via-purple-500/50 to-violet-500/40"
          style={{
            left: `${viz.rangeStart}%`,
            width: `${viz.rangeEnd - viz.rangeStart}%`,
          }}
        />
        <div
          className="absolute inset-y-0 w-0.5 bg-gradient-to-b from-btc-gold via-btc-orange to-btc-gold shadow-glow transition-[left] duration-500 ease-out motion-reduce:transition-none"
          style={{ left: `${viz.pos}%` }}
        >
          <div className="absolute -top-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border border-btc-orange bg-btc-orange shadow-glow" />
        </div>
        <div
          className="absolute inset-0 rounded-full opacity-30"
          style={{
            background:
              "linear-gradient(90deg, rgba(239,68,68,0.15) 0%, transparent 15%, transparent 85%, rgba(239,68,68,0.15) 100%)",
          }}
        />
      </div>

      <div className="mt-4 flex justify-between font-mono text-[10px] text-text-muted">
        <span>{formatPrice(viz.pLower)}</span>
        <span className="text-btc-orange">{formatPrice(viz.price)}</span>
        <span>{formatPrice(viz.pUpper)}</span>
      </div>
    </GlassCard>
  );
}
