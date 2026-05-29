/**
 * Mezrange Pro — Mezo brand design tokens
 */

export const colors = {
  obsidian: "#0B0B0F",
  slate: "#1A1B23",
  glass: "rgba(18, 19, 28, 0.7)",

  text: {
    primary: "#F5F5F6",
    secondary: "#9B9BA3",
    muted: "#6B6B75",
  },

  accent: {
    orange: "#F7931A",
    gold: "#FFD700",
    gradient: "linear-gradient(135deg, #F7931A 0%, #FFD700 100%)",
  },

  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",

  glow: {
    success: "0 0 24px rgba(16, 185, 129, 0.35)",
    warning: "0 0 24px rgba(245, 158, 11, 0.35)",
    danger: "0 0 24px rgba(239, 68, 68, 0.35)",
    accent: "0 0 32px rgba(247, 147, 26, 0.4)",
  },
} as const;

export const typography = {
  fontFamily: {
    heading: "var(--font-jetbrains-mono), ui-monospace, monospace",
    body: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "2rem",
    display: "clamp(2.5rem, 5vw, 3.75rem)",
  },
  letterSpacing: {
    tight: "-0.02em",
    wide: "0.08em",
  },
} as const;

export const spacing = {
  unit: 8,
  scale: {
    1: "0.5rem",
    2: "1rem",
    3: "1.5rem",
    4: "2rem",
    5: "2.5rem",
    6: "3rem",
    8: "4rem",
  },
  section: "2rem",
  card: "1.5rem",
} as const;

export const radius = {
  sm: "6px",
  md: "10px",
  lg: "16px",
  xl: "24px",
  full: "9999px",
} as const;

export const motion = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const;

export const effects = {
  glass: {
    background: colors.glass,
    backdropBlur: "24px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  hover: {
    scale: 1.02,
    border: "rgba(255, 255, 255, 0.1)",
  },
} as const;
