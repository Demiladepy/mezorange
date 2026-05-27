"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function ConnectPrompt({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/50 px-8 py-16 text-center">
      <h2 className="text-xl font-semibold text-zinc-100">Connect your wallet</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        {message ??
          "Connect with Unisat, OKX, Xverse, or WalletConnect on Mezo Testnet to view vaults and manage liquidity."}
      </p>
      <div className="mt-6">
        <ConnectButton />
      </div>
    </div>
  );
}
