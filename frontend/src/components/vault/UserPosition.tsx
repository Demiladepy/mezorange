"use client";

import { useAccount, useContractRead } from "wagmi";
import { GlassCard } from "@/components/ui/GlassCard";
import { mezrangeVaultAbi } from "@/lib/abis";
import { formatTokenAmount } from "@/lib/format";

type UserPositionProps = {
  vaultAddress: `0x${string}`;
};

export function UserPosition({ vaultAddress }: UserPositionProps) {
  const { address, isConnected } = useAccount();

  const { data: shares } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const { data: totalSupply } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "totalSupply",
  });
  const { data: symbol } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "symbol",
  });

  if (!isConnected || !address) return null;

  const userShares = shares as bigint | undefined;
  const supply = totalSupply as bigint | undefined;
  const hasPosition = userShares !== undefined && userShares > BigInt(0);

  const sharePct =
    hasPosition && supply && supply > BigInt(0)
      ? (Number(userShares) / Number(supply)) * 100
      : null;

  return (
    <GlassCard className="border-hl-teal/20">
      <p className="font-heading text-[10px] uppercase tracking-wider text-hl-teal">
        Your position
      </p>
      {hasPosition ? (
        <div className="mt-3 space-y-1">
          <p className="font-heading text-xl font-semibold tabular-nums text-hl-text">
            {formatTokenAmount(userShares)}{" "}
            <span className="text-sm font-normal text-hl-muted">
              {(symbol as string) ?? "shares"}
            </span>
          </p>
          {sharePct !== null && (
            <p className="text-xs text-hl-muted">
              {sharePct.toFixed(2)}% of vault supply
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-hl-muted">
          No vault shares yet. Deposit below to open a position.
        </p>
      )}
    </GlassCard>
  );
}
