"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/cn";

type ToastVariant = "info" | "success" | "loading";

type ToastProps = {
  open: boolean;
  message: string;
  variant?: ToastVariant;
  onClose?: () => void;
  durationMs?: number;
};

export function Toast({
  open,
  message,
  variant = "info",
  onClose,
  durationMs = 4000,
}: ToastProps) {
  useEffect(() => {
    if (!open || variant === "loading" || !onClose) return;
    const t = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(t);
  }, [open, variant, onClose, durationMs]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none fixed bottom-24 left-1/2 z-[100] -translate-x-1/2 md:bottom-8"
        >
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl border border-white/10 bg-glass px-4 py-3 text-sm text-text-primary shadow-glass backdrop-blur-xl",
              variant === "success" && "border-success/30 shadow-glow-success",
            )}
          >
            {variant === "loading" && (
              <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-btc-orange border-t-transparent" />
            )}
            {variant === "success" && (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/20 text-success">
                ✓
              </span>
            )}
            <span>{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
