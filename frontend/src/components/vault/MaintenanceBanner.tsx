"use client";

import { useContractRead } from "wagmi";
import { mezrangeVaultAbi } from "@/lib/abis";

type MaintenanceBannerProps = {
  vaultAddress: `0x${string}`;
};

export function MaintenanceBanner({ vaultAddress }: MaintenanceBannerProps) {
  const { data: paused } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "paused",
  });

  if (!paused) return null;

  return (
    <div
      role="alert"
      className="mb-6 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning backdrop-blur-xl"
    >
      <p className="font-heading font-semibold">Maintenance Mode</p>
      <p className="mt-1 text-xs text-text-secondary">
        This vault is paused. Deposits, withdrawals, and rebalances are temporarily
        disabled.
      </p>
    </div>
  );
}
