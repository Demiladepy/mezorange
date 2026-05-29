"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useContractRead } from "wagmi";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { GlassCard } from "@/components/ui/GlassCard";
import { CountUp } from "@/components/ui/CountUp";
import { erc20Abi, mezrangeVaultAbi, uniswapV3PoolAbi } from "@/lib/abis";
import { formatTokenAmount } from "@/lib/format";
import { cn } from "@/lib/cn";

type VaultCardPremiumProps = {
  address: `0x${string}`;
};

const RANGE_WIDTH_LABELS = ["Tight", "Medium", "Wide"];

export function VaultCardPremium({ address }: VaultCardPremiumProps) {
  const { data: name } = useContractRead({
    address,
    abi: mezrangeVaultAbi,
    functionName: "name",
  });
  const { data: symbol0Addr } = useContractRead({
    address,
    abi: mezrangeVaultAbi,
    functionName: "token0",
  });
  const { data: symbol1Addr } = useContractRead({
    address,
    abi: mezrangeVaultAbi,
    functionName: "token1",
  });
  const { data: symbol0 } = useContractRead({
    address: symbol0Addr as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: Boolean(symbol0Addr) },
  });
  const { data: symbol1 } = useContractRead({
    address: symbol1Addr as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: Boolean(symbol1Addr) },
  });
  const { data: totalAssets } = useContractRead({
    address,
    abi: mezrangeVaultAbi,
    functionName: "totalAssets",
  });
  const { data: needsRebalance } = useContractRead({
    address,
    abi: mezrangeVaultAbi,
    functionName: "needsRebalance",
  });
  const { data: tickLower } = useContractRead({
    address,
    abi: mezrangeVaultAbi,
    functionName: "tickLower",
  });
  const { data: tickUpper } = useContractRead({
    address,
    abi: mezrangeVaultAbi,
    functionName: "tickUpper",
  });
  const { data: pool } = useContractRead({
    address,
    abi: mezrangeVaultAbi,
    functionName: "pool",
  });
  const { data: slot0 } = useContractRead({
    address: pool as `0x${string}` | undefined,
    abi: uniswapV3PoolAbi,
    functionName: "slot0",
    query: { enabled: Boolean(pool) },
  });

  const sparkData = useMemo(() => {
    if (tickLower === undefined || tickUpper === undefined || !slot0) {
      return [{ v: 50 }, { v: 50 }];
    }
    const lower = Number(tickLower);
    const upper = Number(tickUpper);
    const current = Number(slot0[1]);
    const span = upper - lower || 1;
    const pos = ((current - lower) / span) * 100;
    return Array.from({ length: 12 }, (_, i) => ({
      v: Math.max(5, Math.min(95, pos + (i - 6) * 3 + Math.sin(i) * 8)),
    }));
  }, [tickLower, tickUpper, slot0]);

  const apyEstimate = 12.4;

  const s0 = (symbol0 as string) ?? "T0";
  const s1 = (symbol1 as string) ?? "T1";

  return (
    <Link href={`/vault/${address}`} className="block">
      <GlassCard variant="hoverable" className="h-full">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-14">
              <span className="absolute left-0 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-gradient-accent text-xs font-bold text-obsidian">
                {s0.slice(0, 3)}
              </span>
              <span className="absolute left-6 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate text-xs font-bold text-text-primary">
                {s1.slice(0, 3)}
              </span>
            </div>
            <div>
              <h3 className="font-heading text-sm font-semibold text-text-primary">
                {(name as string) ?? "Vault"}
              </h3>
              <p className="font-mono text-[10px] text-text-muted">
                {address.slice(0, 6)}…{address.slice(-4)}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              needsRebalance
                ? "bg-warning/15 text-warning shadow-glow-warning"
                : "bg-success/15 text-success shadow-glow-success",
            )}
          >
            {needsRebalance ? "Rebalance" : "Active"}
          </span>
        </div>

        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Est. APY</p>
            <p className="font-heading text-3xl font-bold text-btc-orange">
              <CountUp value={apyEstimate} decimals={1} suffix="%" />
            </p>
          </div>
          <div className="h-12 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <defs>
                  <linearGradient id={`spark-${address}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F7931A" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#F7931A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#F7931A"
                  fill={`url(#spark-${address})`}
                  strokeWidth={1.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-4 flex justify-between border-t border-white/5 pt-4 text-xs text-text-secondary">
          <span>TVL {formatTokenAmount(totalAssets as bigint | undefined)}</span>
          <span>{RANGE_WIDTH_LABELS[0]}</span>
        </div>
      </GlassCard>
    </Link>
  );
}
