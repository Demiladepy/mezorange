"use client";

import { motion } from "framer-motion";
import { VaultCardPremium } from "@/components/dashboard/VaultCardPremium";
import { Panel } from "@/components/ui/Panel";
import { VaultCardSkeleton } from "@/components/ui/Skeleton";
import { staggerContainer, staggerItem } from "@/lib/motion";

type VaultGridProps = {
  addresses: `0x${string}`[];
  isLoading?: boolean;
};

function EmptyVaults() {
  return (
    <Panel className="mx-auto max-w-md text-center">
      <h3 className="font-heading text-sm font-semibold text-hl-text">No vault configured</h3>
      <p className="mt-2 text-sm text-hl-muted">
        Set <code className="text-hl-teal">NEXT_PUBLIC_VAULT_ADDRESS</code> in{" "}
        <code className="text-hl-muted">frontend/.env.local</code> to point at your deployed
        MezrangeVault.
      </p>
    </Panel>
  );
}

export function VaultGrid({ addresses, isLoading }: VaultGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
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
      className="grid gap-4 md:grid-cols-2"
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
