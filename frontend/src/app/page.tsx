"use client";

import { useAccount } from "wagmi";
import { ConnectPrompt } from "@/components/ConnectPrompt";
import { VaultCard } from "@/components/VaultCard";
import { useVaultAddresses } from "@/hooks/useVaultList";
import { useClientReady, PageLoader } from "@/hooks/useClientReady";
import { factoryAddress, defaultVaultAddress } from "@/lib/env";

export default function DashboardPage() {
  const ready = useClientReady();
  const { isConnected } = useAccount();
  const { addresses, isLoading, mode } = useVaultAddresses(ready);

  if (!ready) {
    return <PageLoader />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
          Vault Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-zinc-400">
          Monitor Mezrange concentrated-liquidity vaults on Mezo Testnet (chain
          ID 31611). Connect a Bitcoin wallet via Passport to deposit or
          withdraw.
        </p>
      </div>

      {!isConnected ? (
        <ConnectPrompt />
      ) : isLoading ? (
        <p className="text-sm text-zinc-500">Loading vaults…</p>
      ) : addresses.length === 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-100">
          <p className="font-medium">No vault addresses configured</p>
          <p className="mt-2 text-amber-200/80">
            Set{" "}
            <code className="rounded bg-black/20 px-1.5 py-0.5">
              NEXT_PUBLIC_FACTORY_ADDRESS
            </code>{" "}
            or{" "}
            <code className="rounded bg-black/20 px-1.5 py-0.5">
              NEXT_PUBLIC_VAULT_ADDRESS
            </code>{" "}
            in <code className="rounded bg-black/20 px-1.5 py-0.5">.env.local</code>.
          </p>
          <p className="mt-2 text-xs text-amber-200/60">
            Factory: {factoryAddress ?? "not set"} · Vault:{" "}
            {defaultVaultAddress ?? "not set"}
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-zinc-500">
            {mode === "factory"
              ? `${addresses.length} vault${addresses.length === 1 ? "" : "s"} from factory`
              : "Single vault mode"}
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            {addresses.map((address) => (
              <VaultCard key={address} address={address} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
