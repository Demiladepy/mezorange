"use client";

import { useQuery } from "@tanstack/react-query";
import { goldskyGraphqlUrl } from "@/lib/env";
import { goldskyQuery } from "@/lib/goldsky";

export function useGoldskyMeta() {
  return useQuery({
    queryKey: ["goldsky", "meta"],
    enabled: Boolean(goldskyGraphqlUrl),
    queryFn: async () => {
      const data = await goldskyQuery<{
        _meta: {
          block: { number: number };
          hasIndexingErrors: boolean;
        };
        ownershipTransferreds: Array<{ id: string }>;
        depositeds: Array<{ id: string }>;
        rebalanceds: Array<{ id: string }>;
      }>(`{
        _meta { block { number } hasIndexingErrors }
        ownershipTransferreds(first: 1) { id }
        depositeds(first: 1) { id }
        rebalanceds(first: 1) { id }
      }`);
      return {
        block: data._meta.block.number,
        hasErrors: data._meta.hasIndexingErrors,
        hasAnyEvents:
          data.depositeds.length > 0 ||
          data.rebalanceds.length > 0 ||
          data.ownershipTransferreds.length > 0,
        indexedEvents:
          data.ownershipTransferreds.length +
          data.depositeds.length +
          data.rebalanceds.length,
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
