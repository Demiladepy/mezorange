"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useNetwork, type MezoNetwork } from "@/context/NetworkContext";

export function Navbar() {
  const { network, setNetwork } = useNetwork();

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-sm font-bold text-white">
              M
            </span>
            <span className="text-lg font-semibold tracking-tight text-zinc-50">
              Mezrange
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-zinc-400 sm:flex">
            <Link href="/" className="transition hover:text-zinc-100">
              Dashboard
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <NetworkToggle network={network} onChange={setNetwork} />
          <ConnectButton
            chainStatus="icon"
            accountStatus="address"
            showBalance={false}
          />
        </div>
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
    <div className="flex rounded-lg border border-zinc-700 bg-zinc-900 p-0.5 text-xs">
      <button
        type="button"
        onClick={() => onChange("testnet")}
        className={`rounded-md px-3 py-1.5 font-medium transition ${
          network === "testnet"
            ? "bg-orange-500 text-white"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        Testnet
      </button>
      <button
        type="button"
        disabled
        title="Mainnet coming soon"
        className="cursor-not-allowed rounded-md px-3 py-1.5 font-medium text-zinc-600"
      >
        Mainnet
      </button>
    </div>
  );
}
