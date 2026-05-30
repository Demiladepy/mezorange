"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useContractRead } from "wagmi";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { GlassCard } from "@/components/ui/GlassCard";
import { erc20Abi, mezrangeVaultAbi, uniswapV3PoolAbi } from "@/lib/abis";
import { formatTokenAmount } from "@/lib/format";
import { cn } from "@/lib/cn";

type VaultCardPremiumProps = {
  address: `0x${string}`;
};

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

  const s0 = (symbol0 as string) ?? "T0";
  const s1 = (symbol1 as string) ?? "T1";

  return (
    <Link href={`/vault/${address}`} className="block">
      <GlassCard variant="hoverable" className="h-full">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-sm font-semibold text-hl-text">
              {(name as string) ?? "Vault"}
            </h3>
            <p className="mt-0.5 font-mono text-[10px] text-hl-muted">
              {s0}/{s1} · {address.slice(0, 6)}…{address.slice(-4)}
            </p>
          </div>
          <span
            className={cn(
              "rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide",
              needsRebalance
                ? "border border-warning/40 bg-warning/10 text-warning"
                : "border border-hl-teal/35 bg-hl-teal/10 text-hl-teal",
            )}
          >
            {needsRebalance ? "Rebalance" : "In range"}
          </span>
        </div>

        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-hl-muted">TVL</p>
            <p className="font-heading text-2xl font-semibold tabular-nums text-hl-teal">
              {formatTokenAmount(totalAssets as bigint | undefined)}
            </p>
          </div>
          <div className="h-10 w-20 opacity-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <defs>
                  <linearGradient id={`spark-${address}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#50D2C1" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#50D2C1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#50D2C1"
                  fill={`url(#spark-${address})`}
                  strokeWidth={1.25}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {slot0 && tickLower !== undefined && tickUpper !== undefined && (
          <p className="mt-3 border-t border-hl-border pt-3 font-mono text-[10px] text-hl-muted">
            tick {Number(slot0[1])} · range [{Number(tickLower)}, {Number(tickUpper)}]
          </p>
        )}
      </GlassCard>
    </Link>
  );
}
