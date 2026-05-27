"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBlockNumber, usePublicClient, useWatchContractEvent } from "wagmi";
import type { Abi, ContractEventName } from "viem";

type UseContractEventParameters = {
  address?: `0x${string}`;
  abi: Abi;
  eventName: ContractEventName;
  fromBlock?: bigint;
  enabled?: boolean;
};

export function useContractEvent({
  address,
  abi,
  eventName,
  fromBlock = BigInt(0),
  enabled = true,
}: UseContractEventParameters) {
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  useBlockNumber({ watch: true });

  const queryKey = ["contractEvent", address, eventName, fromBlock.toString()] as const;

  const query = useQuery({
    queryKey,
    enabled: Boolean(address && publicClient && enabled),
    queryFn: async () => {
      if (!publicClient || !address) return [];
      return publicClient.getContractEvents({
        address,
        abi,
        eventName,
        fromBlock,
        toBlock: "latest",
      });
    },
    refetchInterval: 15_000,
  });

  useWatchContractEvent({
    address,
    abi,
    eventName,
    enabled: Boolean(address && enabled),
    onLogs(logs) {
      queryClient.setQueryData(queryKey, (previous: typeof query.data) => [
        ...(previous ?? []),
        ...logs,
      ]);
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
