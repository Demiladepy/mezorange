"use client";

import { useQuery } from "@tanstack/react-query";
import { goldskyGraphqlUrl } from "@/lib/env";
import { goldskyQuery } from "@/lib/goldsky";

export type ActivityItem = {
  id: string;
  kind: "deposit" | "withdraw" | "rebalance" | "fees";
  block: string;
  tx: string;
  summary: string;
};

export function useGoldskyActivity(vaultAddress?: `0x${string}`) {
  const enabled = Boolean(goldskyGraphqlUrl && vaultAddress);

  return useQuery({
    queryKey: ["goldsky", "activity", vaultAddress?.toLowerCase()],
    enabled,
    queryFn: async () => {
      const contract = vaultAddress!.toLowerCase();
      const query = `
        query($contracts: [String!]!) {
          depositeds(
            first: 20,
            orderBy: block_number,
            orderDirection: desc,
            where: { contractId__in: $contracts }
          ) {
            id
            block_number
            transactionHash_
            user
            amount0
            amount1
            shares
          }
          withdrawns(
            first: 20,
            orderBy: block_number,
            orderDirection: desc,
            where: { contractId__in: $contracts }
          ) {
            id
            block_number
            transactionHash_
            user
            amount0
            amount1
            shares
          }
          rebalanceds(
            first: 20,
            orderBy: block_number,
            orderDirection: desc,
            where: { contractId__in: $contracts }
          ) {
            id
            block_number
            transactionHash_
            newTickLower
            newTickUpper
          }
          feesCompoundeds(
            first: 20,
            orderBy: block_number,
            orderDirection: desc,
            where: { contractId__in: $contracts }
          ) {
            id
            block_number
            transactionHash_
            amount0
            amount1
          }
        }
      `;

      const data = await goldskyQuery<{
        depositeds: Array<{
          id: string;
          block_number: string;
          transactionHash_: string;
          user: string;
          amount0: string;
          amount1: string;
          shares: string;
        }>;
        withdrawns: Array<{
          id: string;
          block_number: string;
          transactionHash_: string;
          user: string;
          amount0: string;
          amount1: string;
          shares: string;
        }>;
        rebalanceds: Array<{
          id: string;
          block_number: string;
          transactionHash_: string;
          newTickLower: number;
          newTickUpper: number;
        }>;
        feesCompoundeds: Array<{
          id: string;
          block_number: string;
          transactionHash_: string;
          amount0: string;
          amount1: string;
        }>;
      }>(query, { contracts: [contract] });

      const items: ActivityItem[] = [
        ...data.depositeds.map((e) => ({
          id: e.id,
          kind: "deposit" as const,
          block: e.block_number,
          tx: e.transactionHash_,
          summary: `Deposit · ${e.user.slice(0, 6)}…${e.user.slice(-4)}`,
        })),
        ...data.withdrawns.map((e) => ({
          id: e.id,
          kind: "withdraw" as const,
          block: e.block_number,
          tx: e.transactionHash_,
          summary: `Withdraw · ${e.user.slice(0, 6)}…${e.user.slice(-4)}`,
        })),
        ...data.rebalanceds.map((e) => ({
          id: e.id,
          kind: "rebalance" as const,
          block: e.block_number,
          tx: e.transactionHash_,
          summary: `Rebalance · ticks [${e.newTickLower}, ${e.newTickUpper}]`,
        })),
        ...data.feesCompoundeds.map((e) => ({
          id: e.id,
          kind: "fees" as const,
          block: e.block_number,
          tx: e.transactionHash_,
          summary: "Fees compounded",
        })),
      ];

      return items
        .sort((a, b) => Number(b.block) - Number(a.block))
        .slice(0, 24);
    },
    staleTime: 12_000,
    refetchInterval: 20_000,
  });
}
