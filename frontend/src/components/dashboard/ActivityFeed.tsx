"use client";

import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { useGoldskyActivity } from "@/hooks/useGoldskyActivity";
import { useGoldskyMeta } from "@/hooks/useGoldskyMeta";
import { defaultVaultAddress, goldskyGraphqlUrl } from "@/lib/env";
import { explorerTx } from "@/lib/links";
import { cn } from "@/lib/cn";

const KIND_STYLE = {
  deposit: "text-hl-teal",
  withdraw: "text-hl-orange",
  rebalance: "text-btc-orange",
  fees: "text-hl-muted",
} as const;

type ActivityFeedProps = {
  vaultAddress?: `0x${string}`;
};

export function ActivityFeed({ vaultAddress }: ActivityFeedProps) {
  const { data, isLoading, isError, error } = useGoldskyActivity(vaultAddress);
  const meta = useGoldskyMeta();

  return (
    <Panel title="On-chain activity" className="h-full">
      {!goldskyGraphqlUrl && (
        <p className="text-sm text-hl-muted">Set NEXT_PUBLIC_GOLDSKY_GRAPHQL_URL to load indexed events.</p>
      )}

      {goldskyGraphqlUrl && meta.data && (
        <p className="mb-3 font-mono text-[10px] text-hl-muted">
          Subgraph synced · block {meta.data.block.toLocaleString()}
          {meta.data.hasAnyEvents ? " · indexing live" : ""}
          {meta.data.hasErrors ? " · indexing errors" : ""}
        </p>
      )}

      {goldskyGraphqlUrl && isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-sm" />
          ))}
        </div>
      )}

      {goldskyGraphqlUrl && isError && (
        <p className="text-sm text-danger">
          Goldsky query failed: {error instanceof Error ? error.message : "unknown error"}
        </p>
      )}

      {goldskyGraphqlUrl && !isLoading && !isError && (data?.length ?? 0) === 0 && (
        <div className="rounded border border-hl-border/80 bg-hl-bg/40 p-4 text-sm text-hl-muted">
          <p className="font-heading text-xs font-semibold text-hl-text">Indexer is live</p>
          <p className="mt-2 text-xs leading-relaxed">
            No vault activity indexed yet — expected before the first deposit or rebalance.
            The subgraph watches this vault from block 13378088.
          </p>
          {defaultVaultAddress && (
            <Link
              href={`/vault/${defaultVaultAddress}`}
              className="mt-3 inline-block text-xs text-hl-teal hover:underline"
            >
              Open vault to deposit →
            </Link>
          )}
        </div>
      )}

      <ul className="max-h-[420px] space-y-0 overflow-y-auto scrollbar-thin">
        {data?.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 border-b border-hl-border/60 py-2.5 text-xs last:border-b-0"
          >
            <div className="min-w-0">
              <p className={cn("font-medium", KIND_STYLE[item.kind])}>{item.summary}</p>
              <p className="mt-0.5 font-mono text-[10px] text-hl-muted">block {item.block}</p>
            </div>
            <a
              href={explorerTx(item.tx)}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 font-mono text-[10px] text-hl-teal hover:underline"
            >
              tx ↗
            </a>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
