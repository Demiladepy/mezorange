"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { fadeSlideUp, prefersReducedMotion } from "@/lib/motion";
import { useSyncExternalStore } from "react";

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getReducedMotionSnapshot() {
  return prefersReducedMotion();
}

function getReducedMotionServerSnapshot() {
  return false;
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  if (reduced) {
    return <main className="relative flex-1 pb-20 md:pb-0">{children}</main>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.main
        key={pathname}
        className="relative flex-1 pb-20 md:pb-0"
        initial={fadeSlideUp.initial}
        animate={fadeSlideUp.animate}
        exit={fadeSlideUp.exit}
        transition={fadeSlideUp.transition}
      >
        {children}
      </motion.main>
    </AnimatePresence>
  );
}
