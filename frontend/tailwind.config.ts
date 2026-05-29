import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./styles/**/*.{js,ts}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: "#0B0B0F",
        slate: "#1A1B23",
        "text-primary": "#F5F5F6",
        "text-secondary": "#9B9BA3",
        "text-muted": "#6B6B75",
        "btc-orange": "#F7931A",
        "btc-gold": "#FFD700",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        glass: "rgba(18, 19, 28, 0.7)",
      },
      fontFamily: {
        heading: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
        body: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: ["clamp(2.5rem, 5vw, 3.75rem)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
        xl: "24px",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
      boxShadow: {
        glow: "0 0 32px rgba(247, 147, 26, 0.4)",
        "glow-success": "0 0 24px rgba(16, 185, 129, 0.35)",
        "glow-warning": "0 0 24px rgba(245, 158, 11, 0.35)",
        "glow-danger": "0 0 24px rgba(239, 68, 68, 0.35)",
        glass: "0 18px 55px rgba(0, 0, 0, 0.55)",
      },
      backgroundImage: {
        "gradient-accent": "linear-gradient(135deg, #F7931A 0%, #FFD700 100%)",
        "gradient-shimmer":
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
      },
      animation: {
        shimmer: "shimmer 2s infinite",
        "pulse-glow": "pulseGlow 4s ease-in-out infinite",
        "gradient-shift": "gradientShift 6s ease infinite",
        float: "float 6s ease-in-out infinite",
        "spin-slow": "spin 12s linear infinite",
        "orbit-ring": "orbitRing 3s linear infinite",
      },
      keyframes: {
        orbitRing: {
          "0%": { transform: "rotate(0deg)", opacity: "0.5" },
          "50%": { opacity: "1" },
          "100%": { transform: "rotate(360deg)", opacity: "0.5" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      transitionDuration: {
        DEFAULT: "300ms",
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
};

export default config;
