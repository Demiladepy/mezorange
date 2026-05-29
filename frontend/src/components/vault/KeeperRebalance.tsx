"use client";

import { useState } from "react";
import {
  useAccount,
  useContractRead,
  useContractWrite,
  useWaitForTransactionReceipt,
} from "wagmi";
import { GlassCard } from "@/components/ui/GlassCard";
import { Toast } from "@/components/ui/Toast";
import { mezrangeVaultAbi } from "@/lib/abis";
import { cn } from "@/lib/cn";

type KeeperRebalanceProps = {
  vaultAddress: `0x${string}`;
};

export function KeeperRebalance({ vaultAddress }: KeeperRebalanceProps) {
  const { address } = useAccount();
  const [status, setStatus] = useState<string | null>(null);

  const { data: keeper } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "keeper",
  });
  const { data: needsRebalance } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "needsRebalance",
  });
  const { data: paused } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "paused",
  });

  const { writeContractAsync, data: hash } = useContractWrite();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [toast, setToast] = useState<"loading" | "success" | null>(null);

  const isKeeper =
    address && keeper && address.toLowerCase() === (keeper as string).toLowerCase();

  if (!isKeeper) return null;

  async function handleRebalance() {
    try {
      setToast("loading");
      setStatus("Submitting rebalance…");
      await writeContractAsync({
        address: vaultAddress,
        abi: mezrangeVaultAbi,
        functionName: "rebalance",
      });
      setStatus("Rebalance submitted.");
    } catch (e) {
      setToast(null);
      setStatus(e instanceof Error ? e.message : "Rebalance failed.");
    }
  }

  const canRebalance = needsRebalance && !paused;
  const toastSucceeded = toast === "loading" && isSuccess;

  return (
    <>
    <Toast
      open={toast !== null}
      variant={toastSucceeded ? "success" : "loading"}
      message={toastSucceeded ? "Rebalance complete" : "Rebalancing…"}
      onClose={() => setToast(null)}
    />
    <GlassCard className="border-warning/20">
      <p className="font-heading text-xs uppercase tracking-wider text-warning">
        Keeper Controls
      </p>
      <button
        type="button"
        disabled={!canRebalance || isLoading}
        onClick={handleRebalance}
        className={cn(
          "mt-3 w-full rounded-lg px-4 py-3 text-sm font-semibold transition duration-300",
          canRebalance
            ? "bg-gradient-accent text-obsidian shadow-glow hover:opacity-90"
            : "cursor-not-allowed bg-white/5 text-text-muted",
        )}
      >
        {isLoading ? "Rebalancing…" : "Trigger Rebalance"}
      </button>
      {!needsRebalance && (
        <p className="mt-2 text-xs text-text-muted">No rebalance needed right now.</p>
      )}
      {status && <p className="mt-2 text-xs text-text-muted">{status}</p>}
    </GlassCard>
    </>
  );
}
