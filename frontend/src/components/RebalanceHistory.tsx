"use client";

import { useContractEvent } from "@/hooks/useContractEvent";
import { mezrangeVaultAbi } from "@/lib/abis";
import { shortenAddress } from "@/lib/format";

type RebalanceHistoryProps = {
  vaultAddress: `0x${string}`;
};

export function RebalanceHistory({ vaultAddress }: RebalanceHistoryProps) {
  const { data: logs, isLoading } = useContractEvent({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    eventName: "Rebalanced",
    fromBlock: BigInt(0),
  });

  const entries = [...(logs ?? [])].reverse();

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h3 className="text-lg font-semibold text-zinc-50">Rebalance history</h3>
      <p className="mt-1 text-sm text-zinc-400">
        Parsed from on-chain <code className="text-orange-400">Rebalanced</code> events.
      </p>

      {isLoading && (
        <p className="mt-6 text-sm text-zinc-500">Loading events…</p>
      )}

      {!isLoading && entries.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500">No rebalances recorded yet.</p>
      )}

      <ul className="mt-6 space-y-3">
        {entries.map((log) => {
          const args = log.args as {
            oldTokenId?: bigint;
            newTokenId?: bigint;
            newTickLower?: number;
            newTickUpper?: number;
          };

          return (
          <li
            key={`${log.transactionHash}-${log.logIndex}`}
            className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-zinc-200">
                Block {log.blockNumber?.toString() ?? "—"}
              </span>
              <a
                href={`https://explorer.test.mezo.org/tx/${log.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-orange-400 hover:underline"
              >
                {shortenAddress(log.transactionHash ?? "", 6)}
              </a>
            </div>
            <p className="mt-2 text-zinc-400">
              NFT {args.oldTokenId?.toString()} →{" "}
              {args.newTokenId?.toString()} · ticks [
              {args.newTickLower?.toString()}, {args.newTickUpper?.toString()}]
            </p>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
