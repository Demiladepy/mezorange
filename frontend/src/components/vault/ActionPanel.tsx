"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWalletAccount } from "@mezo-org/passport";
import { useAccount, useContractRead } from "wagmi";
import { GlassCard } from "@/components/ui/GlassCard";
import { DepositForm } from "@/components/DepositForm";
import { WithdrawForm } from "@/components/WithdrawForm";
import { mezrangeVaultAbi } from "@/lib/abis";
import { cn } from "@/lib/cn";
import { shortenAddress } from "@/lib/format";

type ActionPanelProps = {
  vaultAddress: `0x${string}`;
};

const TABS = ["Deposit", "Withdraw", "Strategy"] as const;
type Tab = (typeof TABS)[number];

const RANGE_LABELS = ["Tight", "Medium", "Wide"];

export function ActionPanel({ vaultAddress }: ActionPanelProps) {
  const [tab, setTab] = useState<Tab>("Deposit");
  const { address, isConnected } = useAccount();
  const wallet = useWalletAccount();

  const { data: rangeWidth } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "rangeWidth",
  });
  const { data: userShares } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const hasDeposit = userShares !== undefined && (userShares as bigint) > BigInt(0);
  const widthIdx = rangeWidth !== undefined ? Number(rangeWidth) : 1;

  if (!isConnected) {
    return (
      <GlassCard className="text-center">
        <p className="text-sm text-text-secondary">Connect a wallet to manage this vault.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant={!hasDeposit ? "gradient-border" : "default"}>
      {wallet.networkFamily === "bitcoin" && (
        <div className="mb-4 rounded-lg border border-white/5 bg-white/[0.03] p-3 text-xs text-text-secondary">
          <p>
            Connected via <span className="text-btc-orange">Bitcoin wallet</span> (Passport).
          </p>
          <p className="mt-2 font-mono text-[10px] text-text-muted">
            BTC: {wallet.walletAddress ? shortenAddress(wallet.walletAddress, 6) : "—"}
          </p>
          <p className="font-mono text-[10px] text-text-muted">
            Mezo EVM: {address ? shortenAddress(address, 6) : "—"}
          </p>
          <p className="mt-2 text-[10px] leading-relaxed text-text-muted">
            Deposits use ERC-20 tokens on Mezo, not native BTC directly.
          </p>
        </div>
      )}

      {!hasDeposit && (
        <div className="mb-4 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-lg border border-btc-orange/30 bg-btc-orange/10">
            <span className="text-2xl">◇</span>
          </div>
          <p className="font-heading text-sm font-semibold text-text-primary">
            Ready to earn?
          </p>
          <p className="mt-1 text-xs text-text-muted">Deposit tokens to begin.</p>
        </div>
      )}

      <div className="flex gap-1 rounded-lg border border-white/5 bg-obsidian/50 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "min-h-[44px] flex-1 rounded-md px-3 py-2 text-xs font-medium transition duration-300",
              tab === t
                ? "bg-gradient-accent text-obsidian shadow-glow"
                : "text-text-muted hover:text-text-primary",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="relative mt-4 min-h-[280px] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: tab === "Deposit" ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: tab === "Deposit" ? 12 : -12 }}
            transition={{ duration: 0.25 }}
          >
            {tab === "Deposit" && (
              <DepositForm vaultAddress={vaultAddress} embedded />
            )}
            {tab === "Withdraw" && (
              <WithdrawForm vaultAddress={vaultAddress} embedded />
            )}
            {tab === "Strategy" && (
              <div className="space-y-4">
                <p className="text-xs text-text-muted">
                  Current range preset (owner-configurable on-chain):
                </p>
                <div className="space-y-3">
                  {RANGE_LABELS.map((label, i) => {
                    const active = i === widthIdx;
                    const widths = ["w-1/4", "w-1/2", "w-full"];
                    return (
                      <div
                        key={label}
                        className={cn(
                          "rounded-lg border p-3 transition",
                          active
                            ? "border-btc-orange/50 bg-btc-orange/10"
                            : "border-white/5 opacity-60",
                        )}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-heading font-semibold">{label}</span>
                          {active && (
                            <span className="text-btc-orange">Active</span>
                          )}
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-obsidian">
                          <div
                            className={cn(
                              "h-full rounded-full bg-gradient-accent",
                              widths[i],
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}
