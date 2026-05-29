"use client";

import { motion } from "framer-motion";
import { VaultCardPremium } from "@/components/dashboard/VaultCardPremium";
import { GlassCard } from "@/components/ui/GlassCard";
import { VaultCardSkeleton } from "@/components/ui/Skeleton";
import { staggerContainer, staggerItem } from "@/lib/motion";

type VaultGridProps = {
  addresses: `0x${string}`[];
  isLoading?: boolean;
};

function EmptyVaults() {
  return (
    <GlassCard className="mx-auto max-w-md text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center motion-safe:animate-spin-slow">
        <div
          className="h-14 w-14 rotate-45 border border-btc-orange/40 bg-gradient-to-br from-btc-orange/20 to-transparent"
          style={{ transformStyle: "preserve-3d" }}
        />
      </div>
      <h3 className="font-heading text-xl font-semibold text-text-primary">No Vaults Yet</h3>
      <p className="mt-2 text-sm text-text-secondary">
        Deploy a vault via the factory or set{" "}
        <code className="text-btc-orange">NEXT_PUBLIC_VAULT_ADDRESS</code> to explore
        concentrated liquidity strategies on Mezo.
      </p>
      <p className="mt-6 text-2xl text-btc-orange motion-safe:animate-pulse">+</p>
    </GlassCard>
  );
}

export function VaultGrid({ addresses, isLoading }: VaultGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <VaultCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (addresses.length === 0) {
    return <EmptyVaults />;
  }

  return (
    <motion.div
      className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {addresses.map((address) => (
        <motion.div key={address} variants={staggerItem}>
          <VaultCardPremium address={address} />
        </motion.div>
      ))}
    </motion.div>
  );
}
