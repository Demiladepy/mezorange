"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount, useContractRead } from "wagmi";
import { isAddress } from "viem";
import { ConnectPrompt } from "@/components/ConnectPrompt";
import { DepositForm } from "@/components/DepositForm";
import { WithdrawForm } from "@/components/WithdrawForm";
import { VaultMetrics } from "@/components/VaultMetrics";
import { RangeChart } from "@/components/RangeChart";
import { RebalanceHistory } from "@/components/RebalanceHistory";
import { mezrangeVaultAbi } from "@/lib/abis";
import { useClientReady, PageLoader } from "@/hooks/useClientReady";

export default function VaultPage() {
  const ready = useClientReady();
  const params = useParams<{ address: string }>();
  const rawAddress = params.address;
  const vaultAddress = isAddress(rawAddress ?? "")
    ? (rawAddress as `0x${string}`)
    : undefined;

  const { isConnected } = useAccount();

  const { data: name } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "name",
    query: { enabled: Boolean(vaultAddress && ready) },
  });

  if (!ready) {
    return <PageLoader />;
  }

  if (!vaultAddress) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-red-400">Invalid vault address.</p>
        <Link href="/" className="mt-4 inline-block text-orange-400 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Dashboard
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-50">
          {(name as string) ?? "Vault"}
        </h1>
        <p className="mt-2 font-mono text-sm text-zinc-500">{vaultAddress}</p>
      </div>

      {!isConnected ? (
        <ConnectPrompt message="Connect your wallet to deposit, withdraw, and view live vault metrics." />
      ) : (
        <div className="space-y-8">
          <VaultMetrics vaultAddress={vaultAddress} />

          <div className="grid gap-6 lg:grid-cols-2">
            <DepositForm vaultAddress={vaultAddress} />
            <WithdrawForm vaultAddress={vaultAddress} />
          </div>

          <RangeChart vaultAddress={vaultAddress} />
          <RebalanceHistory vaultAddress={vaultAddress} />
        </div>
      )}
    </div>
  );
}
