"use client";

import { motion } from "framer-motion";
import { Hero } from "@/components/dashboard/Hero";
import { StatsStrip } from "@/components/dashboard/StatsStrip";
import { VaultGrid } from "@/components/dashboard/VaultGrid";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useVaultAddresses } from "@/hooks/useVaultList";
import { useClientReady, PageLoader } from "@/hooks/useClientReady";
import { staggerContainer } from "@/lib/motion";

export default function DashboardPage() {
  const ready = useClientReady();
  const { addresses, isLoading } = useVaultAddresses(ready);
  const stats = useDashboardStats(addresses);

  if (!ready) {
    return <PageLoader label="Initializing Mezrange…" />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6">
      <Hero />
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="mt-8 space-y-10"
      >
        <StatsStrip
          totalTvl={stats.totalTvl}
          activeVaults={stats.activeVaults}
          totalRebalances={stats.totalRebalances}
          isLoading={stats.isLoading || isLoading}
        />
        <VaultGrid addresses={addresses} isLoading={isLoading} />
      </motion.div>
    </div>
  );
}
