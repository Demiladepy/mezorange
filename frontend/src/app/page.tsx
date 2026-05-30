"use client";

import { motion } from "framer-motion";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { Hero } from "@/components/dashboard/Hero";
import { StatsStrip } from "@/components/dashboard/StatsStrip";
import { VaultGrid } from "@/components/dashboard/VaultGrid";
import { Panel } from "@/components/ui/Panel";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useVaultAddresses } from "@/hooks/useVaultList";
import { useClientReady, PageLoader } from "@/hooks/useClientReady";
import { defaultVaultAddress } from "@/lib/env";
import { staggerContainer } from "@/lib/motion";

export default function DashboardPage() {
  const ready = useClientReady();
  const { addresses, isLoading } = useVaultAddresses(ready);
  const stats = useDashboardStats(addresses);
  const activityVault = addresses[0] ?? defaultVaultAddress;

  if (!ready) {
    return <PageLoader label="Connecting to Mezo…" />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6">
      <Hero />
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="mt-6 space-y-6"
      >
        <StatsStrip
          totalTvl={stats.totalTvl}
          activeVaults={stats.activeVaults}
          totalRebalances={stats.totalRebalances}
          isLoading={stats.isLoading || isLoading}
        />

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Panel title="Vaults" className="min-h-[280px]">
            <VaultGrid addresses={addresses} isLoading={isLoading} />
          </Panel>
          <ActivityFeed vaultAddress={activityVault} />
        </div>
      </motion.div>
    </div>
  );
}
