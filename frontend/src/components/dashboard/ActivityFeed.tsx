"use client";

import { Panel } from "@/components/ui/Panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { useGoldskyActivity } from "@/hooks/useGoldskyActivity";
import { useGoldskyMeta } from "@/hooks/useGoldskyMeta";
import { goldskyGraphqlUrl } from "@/lib/env";
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
        <p className="text-sm text-hl-muted">
          Subgraph is live but no vault events are indexed yet for{" "}
          <span className="font-mono text-hl-teal">{vaultAddress?.slice(0, 10)}…</span>.
          Events appear after the first on-chain deposit or rebalance. If you just deployed, confirm
          the Goldsky datasource targets this vault from block 13378088.
        </p>
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
              href={`https://explorer.test.mezo.org/tx/${item.tx}`}
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
