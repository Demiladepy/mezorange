"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { GlassCard } from "@/components/ui/GlassCard";
import { PulseGlow } from "@/components/ui/PulseGlow";

export function ConnectPrompt({ message }: { message?: string }) {
  return (
    <GlassCard className="relative mx-auto max-w-lg text-center">
      <PulseGlow className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="relative">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10">
          <span className="motion-safe:animate-spin-slow inline-block h-8 w-8 rounded-full border-2 border-btc-orange/30 border-t-btc-orange" />
        </div>
        <h2 className="font-heading text-lg font-semibold text-text-primary">
          Connect your wallet
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          {message ??
            "Use Unisat, OKX, Xverse via Mezo Passport, or WalletConnect on Mezo Testnet."}
        </p>
        <div className="mt-6 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    </GlassCard>
  );
}
