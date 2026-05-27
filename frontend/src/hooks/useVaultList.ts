"use client";

import { useMemo } from "react";
import { useContractRead } from "wagmi";
import { mezrangeVaultFactoryAbi } from "@/lib/abis";
import { defaultVaultAddress, factoryAddress } from "@/lib/env";

export function useVaultAddresses(ready = true) {
  const hasFactory = Boolean(factoryAddress);

  const { data: allVaults, isLoading } = useContractRead({
    address: factoryAddress,
    abi: mezrangeVaultFactoryAbi,
    functionName: "getAllVaults",
    query: { enabled: hasFactory && ready },
  });

  const addresses = useMemo(() => {
    if (allVaults && (allVaults as `0x${string}`[]).length > 0) {
      return allVaults as `0x${string}`[];
    }
    if (defaultVaultAddress) {
      return [defaultVaultAddress];
    }
    return [] as `0x${string}`[];
  }, [allVaults]);

  return {
    addresses,
    isLoading: hasFactory ? isLoading : false,
    mode: hasFactory ? ("factory" as const) : ("single" as const),
  };
}
