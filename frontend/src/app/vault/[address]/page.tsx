"use client";

import { isAddress } from "viem";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectPrompt } from "@/components/ConnectPrompt";
import { MaintenanceBanner } from "@/components/vault/MaintenanceBanner";
import { VaultHero } from "@/components/vault/VaultHero";
import { PriceVisualizer } from "@/components/vault/PriceVisualizer";
import { RebalanceTimeline } from "@/components/vault/RebalanceTimeline";
import { ActionPanel } from "@/components/vault/ActionPanel";
import { PerformanceCharts } from "@/components/vault/PerformanceCharts";
import { KeeperRebalance } from "@/components/vault/KeeperRebalance";
import { UserPosition } from "@/components/vault/UserPosition";
import { useClientReady, PageLoader } from "@/hooks/useClientReady";

export default function VaultPage() {
  const ready = useClientReady();
  const params = useParams<{ address: string }>();
  const vaultAddress = isAddress(params.address ?? "")
    ? (params.address as `0x${string}`)
    : undefined;
  const { isConnected } = useAccount();

  if (!ready) {
    return <PageLoader label="Loading vault…" />;
  }

  if (!vaultAddress) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-danger">Invalid vault address.</p>
        <Link href="/" className="mt-4 inline-block text-btc-orange hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 md:pb-10">
      <MaintenanceBanner vaultAddress={vaultAddress} />
      <VaultHero vaultAddress={vaultAddress} />

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-8">
          <PriceVisualizer vaultAddress={vaultAddress} />
          <RebalanceTimeline vaultAddress={vaultAddress} />
          <PerformanceCharts vaultAddress={vaultAddress} />
        </div>

        <div className="space-y-6">
          {isConnected ? (
            <>
              <UserPosition vaultAddress={vaultAddress} />
              <ActionPanel vaultAddress={vaultAddress} />
              <KeeperRebalance vaultAddress={vaultAddress} />
            </>
          ) : (
            <ConnectPrompt message="Connect your wallet to deposit, withdraw, and trigger keeper rebalance. Range charts and activity below are live without a wallet." />
          )}
        </div>
      </div>
    </div>
  );
}
