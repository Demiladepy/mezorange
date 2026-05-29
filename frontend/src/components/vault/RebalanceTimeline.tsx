"use client";

import { useContractEvent } from "@/hooks/useContractEvent";
import { useGoldskyRebalances } from "@/hooks/useGoldskyVaultEvents";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { mezrangeVaultAbi } from "@/lib/abis";
import { shortenAddress } from "@/lib/format";
import { cn } from "@/lib/cn";
import { goldskyGraphqlUrl } from "@/lib/env";

type RebalanceTimelineProps = {
  vaultAddress: `0x${string}`;
};

export function RebalanceTimeline({ vaultAddress }: RebalanceTimelineProps) {
  const goldsky = useGoldskyRebalances(vaultAddress);
  const { data: logs, isLoading } = useContractEvent({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    eventName: "Rebalanced",
    fromBlock: BigInt(0),
    enabled: !goldskyGraphqlUrl,
  });

  const entries = goldskyGraphqlUrl
    ? (goldsky.data ?? []).map((e) => ({
        transactionHash: e.transactionHash_,
        logIndex: 0,
        blockNumber: BigInt(e.block_number),
        args: {
          oldTokenId: BigInt(e.oldTokenId),
          newTokenId: BigInt(e.newTokenId),
          newTickLower: e.newTickLower,
          newTickUpper: e.newTickUpper,
        },
      }))
    : [...(logs ?? [])].reverse();

  return (
    <GlassCard className="max-h-[420px] overflow-hidden">
      <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-text-secondary">
        Rebalance History
      </h3>

      {(goldskyGraphqlUrl ? goldsky.isLoading : isLoading) && (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!(goldskyGraphqlUrl ? goldsky.isLoading : isLoading) && entries.length === 0 && (
        <p className="mt-6 text-sm text-text-muted">No rebalances recorded yet.</p>
      )}

      <ul className="mt-6 max-h-[320px] space-y-0 overflow-y-auto pr-2 scrollbar-thin">
        {entries.map((log, index) => {
          const args = log.args as {
            oldTokenId?: bigint;
            newTokenId?: bigint;
            newTickLower?: number;
            newTickUpper?: number;
          };
          const latest = index === 0;

          return (
            <li key={`${log.transactionHash}-${log.logIndex}`} className="relative flex gap-4 pb-6">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "z-10 h-3 w-3 rounded-full border-2",
                    latest
                      ? "border-btc-orange bg-btc-orange shadow-glow"
                      : "border-white/20 bg-slate",
                  )}
                />
                {index < entries.length - 1 && (
                  <span className="mt-1 w-px flex-1 bg-white/10" />
                )}
              </div>
              <div className="min-w-0 flex-1 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-text-secondary">
                    Block {log.blockNumber?.toString() ?? "—"}
                  </span>
                  <a
                    href={`https://explorer.test.mezo.org/tx/${log.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-btc-orange hover:underline"
                  >
                    {shortenAddress(log.transactionHash ?? "", 6)} ↗
                  </a>
                </div>
                <p className="mt-2 font-mono text-[11px] text-text-muted">
                  NFT {args.oldTokenId?.toString()} → {args.newTokenId?.toString()}
                </p>
                <p className="mt-1 text-[11px] text-text-secondary">
                  Ticks [{args.newTickLower}, {args.newTickUpper}]
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}
