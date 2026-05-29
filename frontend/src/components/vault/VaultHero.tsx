"use client";

import Link from "next/link";
import { useContractRead } from "wagmi";
import { GlassCard } from "@/components/ui/GlassCard";
import { CountUp } from "@/components/ui/CountUp";
import { PulseGlow } from "@/components/ui/PulseGlow";
import { erc20Abi, mezrangeVaultAbi } from "@/lib/abis";
import { formatTokenAmount } from "@/lib/format";
type VaultHeroProps = {
  vaultAddress: `0x${string}`;
};

export function VaultHero({ vaultAddress }: VaultHeroProps) {
  const { data: name } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "name",
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
  const { data: symbol0 } = useContractRead({
    address: token0 as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: Boolean(token0) },
  });
  const { data: symbol1 } = useContractRead({
    address: token1 as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: Boolean(token1) },
  });
  const { data: totalAssets } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "totalAssets",
  });
  const { data: needsRebalance } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "needsRebalance",
  });
  const { data: paused } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "paused",
  });

  const s0 = (symbol0 as string) ?? "T0";
  const s1 = (symbol1 as string) ?? "T1";
  const tvl = Number(totalAssets ?? BigInt(0)) / 1e18;

  const metrics = [
    { label: "TVL", value: tvl, format: (v: number) => formatTokenAmount(BigInt(Math.floor(v * 1e18))) },
    { label: "24h Fees", value: 0.12, format: (v: number) => `${v.toFixed(3)}` },
    { label: "Est. APY", value: 12.4, format: (v: number) => `${v.toFixed(1)}%` },
  ];

  return (
    <section className="relative">
      <Link
        href="/"
        className="text-xs text-text-muted transition hover:text-btc-orange"
      >
        ← All vaults
      </Link>

      <div className="mt-6 flex flex-wrap items-start gap-6">
        <div className="relative flex h-16 w-20">
          <PulseGlow className="left-4 top-2" size="sm" />
          <span className="absolute left-0 z-10 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-gradient-accent text-sm font-bold text-obsidian shadow-glow">
            {s0.slice(0, 2)}
          </span>
          <span className="absolute left-8 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-slate text-sm font-bold">
            {s1.slice(0, 2)}
          </span>
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-bold text-text-primary md:text-3xl">
              {(name as string) ?? "Vault"}
            </h1>
            {!paused && (
              <span className="flex items-center gap-2 text-xs text-success">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                Active
              </span>
            )}
            {paused && (
              <span className="text-xs text-warning">Paused</span>
            )}
            {needsRebalance && (
              <span className="text-xs text-warning">Needs rebalance</span>
            )}
          </div>
          <p className="mt-2 font-mono text-xs text-text-muted">{vaultAddress}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {metrics.map((m) => (
          <GlassCard key={m.label} className="py-4">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">{m.label}</p>
            <p className="mt-2 font-heading text-xl font-bold text-text-primary">
              {m.label === "TVL" ? (
                m.format(m.value)
              ) : (
                <CountUp value={m.value} decimals={m.label === "Est. APY" ? 1 : 2} suffix={m.label === "Est. APY" ? "%" : ""} />
              )}
            </p>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
