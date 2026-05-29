"use client";

import { useQuery } from "@tanstack/react-query";
import { goldskyGraphqlUrl } from "@/lib/env";
import { goldskyQuery } from "@/lib/goldsky";

type GoldskyRebalanced = {
  id: string;
  block_number: string;
  timestamp_: string;
  transactionHash_: string;
  oldTokenId: string;
  newTokenId: string;
  newTickLower: number;
  newTickUpper: number;
};

type GoldskyFeesCompounded = {
  id: string;
  block_number: string;
  timestamp_: string;
  transactionHash_: string;
  amount0: string;
  amount1: string;
};

export function useGoldskyRebalances(vaultAddress?: `0x${string}`) {
  const enabled = Boolean(goldskyGraphqlUrl && vaultAddress);
  return useQuery({
    queryKey: ["goldsky", "rebalanceds", vaultAddress?.toLowerCase()],
    enabled,
    queryFn: async () => {
      const query = `
        query($contract: String!) {
          rebalanceds(
            first: 200,
            orderBy: block_number,
            orderDirection: desc,
            where: { contractId_: $contract }
          ) {
            id
            block_number
            timestamp_
            transactionHash_
            oldTokenId
            newTokenId
            newTickLower
            newTickUpper
          }
        }
      `;

      const data = await goldskyQuery<{ rebalanceds: GoldskyRebalanced[] }>(query, {
        contract: vaultAddress!.toLowerCase(),
      });
      return data.rebalanceds;
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

export function useGoldskyFeesCompounded(vaultAddress?: `0x${string}`) {
  const enabled = Boolean(goldskyGraphqlUrl && vaultAddress);
  return useQuery({
    queryKey: ["goldsky", "feesCompoundeds", vaultAddress?.toLowerCase()],
    enabled,
    queryFn: async () => {
      const query = `
        query($contract: String!) {
          feesCompoundeds(
            first: 200,
            orderBy: block_number,
            orderDirection: desc,
            where: { contractId_: $contract }
          ) {
            id
            block_number
            timestamp_
            transactionHash_
            amount0
            amount1
          }
        }
      `;

      const data = await goldskyQuery<{ feesCompoundeds: GoldskyFeesCompounded[] }>(
        query,
        { contract: vaultAddress!.toLowerCase() },
      );
      return data.feesCompoundeds;
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

