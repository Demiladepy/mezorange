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
      className="group block rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 transition hover:border-orange-500/50 hover:bg-zinc-900"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-50 group-hover:text-orange-400">
            {(name as string) ?? "Mezrange Vault"}
          </h3>
          <p className="mt-1 font-mono text-xs text-zinc-500">{address}</p>
        </div>
        {needsRebalance ? (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-400">
            Rebalance due
          </span>
        ) : (
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-400">
            In range
          </span>
        )}
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-zinc-500">Share token</dt>
          <dd className="mt-1 font-medium text-zinc-200">
            {(symbol as string) ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">TVL (token0)</dt>
          <dd className="mt-1 font-medium text-zinc-200">
            {formatTokenAmount(totalAssets as bigint | undefined)}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
