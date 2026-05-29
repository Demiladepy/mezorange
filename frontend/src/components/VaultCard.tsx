"use client";

import Link from "next/link";
import { useContractRead } from "wagmi";
import { mezrangeVaultAbi } from "@/lib/abis";
import { formatTokenAmount } from "@/lib/format";

type VaultCardProps = {
  address: `0x${string}`;
};

export function VaultCard({ address }: VaultCardProps) {
  const { data: name } = useContractRead({
    address,
    abi: mezrangeVaultAbi,
    functionName: "name",
  });

  const { data: symbol } = useContractRead({
    address,
    abi: mezrangeVaultAbi,
    functionName: "symbol",
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

  return (
    <Link
      href={`/vault/${address}`}
      className="group relative block overflow-hidden rounded-2xl border border-[color:var(--mz-border)] bg-[color:var(--mz-surface)] p-6 shadow-[var(--mz-shadow)] transition hover:-translate-y-0.5 hover:border-[color:color-mix(in_oklch,var(--mz-accent)_45%,var(--mz-border))] hover:bg-[color:color-mix(in_oklch,var(--mz-surface)_92%,transparent)]"
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 mz-grid" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--mz-text)] transition group-hover:text-[color:var(--mz-accent)]">
            {(name as string) ?? "Mezrange Vault"}
          </h3>
          <p className="mt-1 font-mono text-xs text-[color:var(--mz-dim)]">
            {address}
          </p>
        </div>
        {needsRebalance ? (
          <span className="mz-chip rounded-full px-2.5 py-1 text-xs font-medium text-[color:var(--mz-warn)]">
            Rebalance due
          </span>
        ) : (
          <span className="mz-chip rounded-full px-2.5 py-1 text-xs font-medium text-[color:var(--mz-ok)]">
            In range
          </span>
        )}
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-[color:var(--mz-dim)]">Share token</dt>
          <dd className="mt-1 font-medium text-[color:var(--mz-text)]">
            {(symbol as string) ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[color:var(--mz-dim)]">TVL (token0)</dt>
          <dd className="mt-1 font-medium text-[color:var(--mz-text)]">
            {formatTokenAmount(totalAssets as bigint | undefined)}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex items-center justify-between text-xs text-[color:var(--mz-dim)]">
        <span className="mz-chip rounded-full px-2.5 py-1">View vault</span>
        <span className="font-mono">→</span>
      </div>
    </Link>
  );
}
