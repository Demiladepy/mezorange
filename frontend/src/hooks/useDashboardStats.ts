"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { mezrangeVaultAbi } from "@/lib/abis";
import { goldskyGraphqlUrl } from "@/lib/env";
import { goldskyQuery } from "@/lib/goldsky";

export function useDashboardStats(addresses: `0x${string}`[]) {
  const contracts = useMemo(
    () =>
      addresses.flatMap((address) => [
        {
          address,
          abi: mezrangeVaultAbi,
          functionName: "totalAssets" as const,
        },
      ]),
    [addresses],
  );

  const { data, isLoading } = useReadContracts({
    contracts,
    query: { enabled: addresses.length > 0 },
  });

  const totalTvl = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, item) => {
      if (item.status !== "success") return sum;
      return sum + Number(item.result as bigint);
    }, 0);
  }, [data]);

  const rebalances = useQuery({
    queryKey: ["goldsky", "totalRebalances", addresses.map((a) => a.toLowerCase()).join(",")],
    enabled: Boolean(goldskyGraphqlUrl && addresses.length > 0),
    queryFn: async () => {
      const contractsLower = addresses.map((a) => a.toLowerCase());
      const pageSize = 500;
      let skip = 0;
      let total = 0;

      while (true) {
        const query = `
          query {
            rebalanceds(
              first: ${pageSize},
              skip: ${skip},
              where: { contractId__in: ${JSON.stringify(contractsLower)} }
            ) { id }
          }
        `;
        const page = await goldskyQuery<{ rebalanceds: Array<{ id: string }> }>(query);
        total += page.rebalanceds.length;
        if (page.rebalanceds.length < pageSize) break;
        skip += pageSize;
      }

      return total;
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  return {
    totalTvl,
    activeVaults: addresses.length,
    totalRebalances: goldskyGraphqlUrl ? rebalances.data ?? 0 : 0,
    isLoading: goldskyGraphqlUrl ? isLoading || rebalances.isLoading : isLoading,
  };
}
