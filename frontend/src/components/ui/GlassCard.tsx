"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { type ReactNode, useRef } from "react";
import { cn } from "@/lib/cn";

type GlassCardVariant = "default" | "hoverable" | "gradient-border";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  variant?: GlassCardVariant;
  as?: "div" | "article" | "section";
  onClick?: () => void;
  href?: string;
} & Omit<HTMLMotionProps<"div">, "children">;

export function GlassCard({
  children,
  className,
  variant = "default",
  as = "div",
  onClick,
  ...motionProps
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const Component = motion[as] as typeof motion.div;

  return (
    <Component
      ref={ref}
      onClick={onClick}
      whileHover={
        variant === "hoverable"
          ? { y: -2, transition: { duration: 0.2 } }
          : undefined
      }
      className={cn(
        "relative overflow-hidden rounded-md border border-hl-border bg-hl-panel p-4 transition-[border-color,background-color] duration-200",
        variant === "hoverable" &&
          "cursor-pointer hover:border-hl-teal/35 hover:bg-[#12151a]",
        variant === "gradient-border" &&
          "border-hl-teal/30",
        className,
      )}
      {...motionProps}
    >
      {children}
    </Component>
  );
}
