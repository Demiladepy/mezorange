"use client";

import { shortenAddress } from "@/lib/format";
import { explorerAddress } from "@/lib/links";
import { CopyButton } from "@/components/ui/CopyButton";

type AddressChipProps = {
  address: string;
  chars?: number;
};

export function AddressChip({ address, chars = 4 }: AddressChipProps) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="font-mono">{shortenAddress(address, chars)}</span>
      <CopyButton value={address} />
      <a
        href={explorerAddress(address)}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded border border-hl-border bg-hl-bg/80 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-hl-teal transition hover:border-hl-teal/40"
      >
        Explorer ↗
      </a>
    </span>
  );
}
