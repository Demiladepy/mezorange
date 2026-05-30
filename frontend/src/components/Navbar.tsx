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
    <header className="sticky top-0 z-50 border-b border-hl-border bg-hl-bg/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded border border-hl-border bg-hl-panel font-heading text-[10px] font-bold text-hl-teal">
              MO
            </span>
            <span className="font-heading text-xs font-semibold tracking-wide text-hl-text">
              Mezorange <span className="text-hl-muted">LP</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-4 text-xs md:flex">
            <Link href="/" className="text-hl-muted transition hover:text-hl-teal">
              Dashboard
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <NetworkToggle network={network} onChange={setNetwork} />
          <div className={cn(!isConnected && "ring-1 ring-hl-teal/25 rounded-md")}>
            <ConnectButton
              chainStatus="icon"
              accountStatus={{ smallScreen: "avatar", largeScreen: "address" }}
              showBalance={false}
            />
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl justify-end px-4 pb-1.5 sm:px-6">
        <MezoWordmark className="text-[9px] opacity-70" />
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
    <div className="flex rounded border border-hl-border bg-hl-panel p-0.5 text-[10px] font-heading uppercase tracking-wide">
      <button
        type="button"
        onClick={() => onChange("testnet")}
        className={cn(
          "rounded px-2.5 py-1 transition",
          network === "testnet"
            ? "bg-hl-teal/15 text-hl-teal"
            : "text-hl-muted hover:text-hl-text",
        )}
      >
        Testnet
      </button>
      <button
        type="button"
        disabled
        title="Mainnet coming soon"
        className="cursor-not-allowed rounded px-2.5 py-1 text-hl-muted/40"
      >
        Mainnet
      </button>
    </div>
  );
}
