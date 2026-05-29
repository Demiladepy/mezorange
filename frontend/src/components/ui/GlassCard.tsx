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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    ref.current.style.setProperty("--mouse-x", `${x}%`);
    ref.current.style.setProperty("--mouse-y", `${y}%`);
  };

  const Component = motion[as] as typeof motion.div;

  return (
    <Component
      ref={ref}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      whileHover={
        variant === "hoverable"
          ? { y: -4, scale: 1.01, transition: { duration: 0.3 } }
          : undefined
      }
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/5 bg-glass p-6 shadow-glass backdrop-blur-xl transition-[border-color,box-shadow] duration-300 before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 before:bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(247,147,26,0.1),transparent_55%)]",
        variant === "hoverable" &&
          "cursor-pointer hover:border-white/10 hover:shadow-glow",
        variant === "gradient-border" &&
          "border-transparent bg-clip-padding before:absolute before:inset-0 before:-z-10 before:rounded-xl before:bg-gradient-accent before:p-px before:content-[''] after:absolute after:inset-px after:-z-10 after:rounded-[11px] after:bg-slate after:content-['']",
        className,
      )}
      {...motionProps}
    >
      {children}
    </Component>
  );
}
