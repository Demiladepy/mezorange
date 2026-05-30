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
    const fromFactory = (allVaults as `0x${string}`[] | undefined) ?? [];
    const merged = new Map<string, `0x${string}`>();
    if (defaultVaultAddress) {
      merged.set(defaultVaultAddress.toLowerCase(), defaultVaultAddress);
    }
    for (const addr of fromFactory) {
      merged.set(addr.toLowerCase(), addr);
    }
    return Array.from(merged.values());
  }, [allVaults]);

  return {
    addresses,
    isLoading: hasFactory ? isLoading : false,
    mode: hasFactory ? ("factory" as const) : ("single" as const),
  };
}
