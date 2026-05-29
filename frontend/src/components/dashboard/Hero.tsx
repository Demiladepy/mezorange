"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { PulseGlow } from "@/components/ui/PulseGlow";
import { prefersReducedMotion } from "@/lib/motion";

const subtitle = "Automated Liquidity. Continuous Yield.";

export function Hero() {
  const [typed, setTyped] = useState("");
  const reduced = prefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      const t = window.setTimeout(() => setTyped(subtitle), 0);
      return () => clearTimeout(t);
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(subtitle.slice(0, i));
      if (i >= subtitle.length) clearInterval(id);
    }, 35);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <PulseGlow className="left-1/2 top-0 -translate-x-1/2" size="lg" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative text-center"
      >
        <p className="font-heading text-xs uppercase tracking-[0.25em] text-text-muted">
          Mezo Testnet · Chain 31611
        </p>
        <h1 className="mt-4 font-heading text-display font-bold">
          <span className="animate-gradient-shift bg-gradient-accent bg-[length:200%_auto] bg-clip-text text-transparent">
            Mezrange Pro
          </span>
        </h1>
        <p className="mt-4 min-h-[1.5rem] font-body text-lg text-text-secondary md:text-xl">
          {typed}
          {!reduced && typed.length < subtitle.length && (
            <span className="animate-pulse text-btc-orange">|</span>
          )}
        </p>
      </motion.div>
    </section>
  );
}
