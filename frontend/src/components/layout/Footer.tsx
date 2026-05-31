"use client";

import { MezoWordmark } from "@/components/brand/MezoWordmark";
import {
  APP_URL,
  explorerAddress,
  GITHUB_REPO,
  GOLDSKY_SUBGRAPH_LABEL,
  MEZO_EXPLORER,
} from "@/lib/links";
import { defaultPoolAddress, defaultVaultAddress } from "@/lib/env";

const LINKS = [
  { label: "GitHub", href: GITHUB_REPO },
  { label: "Mezo Explorer", href: MEZO_EXPLORER },
  ...(defaultVaultAddress
    ? [{ label: "Vault contract", href: explorerAddress(defaultVaultAddress) }]
    : []),
  ...(defaultPoolAddress
    ? [{ label: "CL Pool", href: explorerAddress(defaultPoolAddress) }]
    : []),
  { label: "Live app", href: APP_URL },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t border-hl-border py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-hl-muted">
            Mezorange LP · Mezo Testnet · Slipstream CL
          </p>
          <div className="flex items-center gap-2 text-[10px] text-hl-muted">
            <span>Powered by</span>
            <MezoWordmark />
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-start">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] uppercase tracking-wide text-hl-muted transition hover:text-hl-teal"
            >
              {link.label} ↗
            </a>
          ))}
        </nav>

        <p className="mt-3 text-center text-[10px] text-hl-muted/80 sm:text-left">
          Indexed by Goldsky · {GOLDSKY_SUBGRAPH_LABEL}
        </p>
      </div>
    </footer>
  );
}
