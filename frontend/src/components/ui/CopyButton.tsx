"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type CopyButtonProps = {
  value: string;
  className?: string;
  label?: string;
};

export function CopyButton({ value, className, label = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "rounded border border-hl-border bg-hl-bg/80 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-hl-muted transition hover:border-hl-teal/40 hover:text-hl-teal",
        copied && "border-hl-teal/40 text-hl-teal",
        className,
      )}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
