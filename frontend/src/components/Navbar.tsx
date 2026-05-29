"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { MezoWordmark } from "@/components/brand/MezoWordmark";
import { useNetwork, type MezoNetwork } from "@/context/NetworkContext";
import { cn } from "@/lib/cn";

export function Navbar() {
  const { network, setNetwork } = useNetwork();
  const { isConnected } = useAccount();

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-glass/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-slate">
              <span className="font-heading text-xs font-bold text-btc-orange">MZ</span>
            </span>
            <span className="hidden font-heading text-sm font-semibold tracking-tight text-text-primary sm:inline">
              Mezrange <span className="text-text-muted">Pro</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-text-muted md:flex">
            <Link href="/" className="transition duration-300 hover:text-btc-orange">
              Vaults
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <NetworkToggle network={network} onChange={setNetwork} />
          <div className="relative">
            {!isConnected && (
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-1 rounded-xl motion-safe:animate-orbit-ring border border-btc-orange/40"
              />
            )}
            <ConnectButton
              chainStatus="icon"
              accountStatus={{ smallScreen: "avatar", largeScreen: "address" }}
              showBalance={false}
            />
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl justify-end px-4 pb-2 sm:px-6">
        <MezoWordmark className="text-[10px]" />
      </div>
    </header>
  );
}

function NetworkToggle({
  network,
  onChange,
}: {
  network: MezoNetwork;
  onChange: (network: MezoNetwork) => void;
}) {
  return (
    <div className="flex rounded-lg border border-white/10 bg-obsidian/60 p-0.5 text-xs">
      <button
        type="button"
        onClick={() => onChange("testnet")}
        className={cn(
          "rounded-md px-3 py-1.5 font-medium transition duration-300",
          network === "testnet"
            ? "bg-gradient-accent text-obsidian shadow-glow"
            : "text-text-muted hover:text-text-primary",
        )}
      >
        Testnet
      </button>
      <button
        type="button"
        disabled
        title="Mainnet coming soon"
        className="cursor-not-allowed rounded-md px-3 py-1.5 font-medium text-text-muted/50"
      >
        Mainnet
      </button>
    </div>
  );
}
