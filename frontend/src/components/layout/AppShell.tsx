"use client";

import dynamic from "next/dynamic";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { PageTransition } from "@/components/layout/PageTransition";

const MezoBackground = dynamic(
  () => import("@/components/three/MezoBackground"),
  { ssr: false },
);

const Web3Providers = dynamic(
  () =>
    import("@/components/providers/Web3Provider").then((m) => m.Web3Providers),
  { ssr: false },
);

const Navbar = dynamic(
  () => import("@/components/Navbar").then((m) => m.Navbar),
  { ssr: false },
);

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Web3Providers>
      <div className="relative flex min-h-screen flex-col hl-grid-bg">
        <div className="pointer-events-none absolute inset-0 opacity-[0.18]">
          <MezoBackground />
        </div>
        <Navbar />
        <div className="relative z-10 flex flex-1 flex-col">
          <PageTransition>{children}</PageTransition>
          <Footer />
        </div>
        <MobileNav />
      </div>
    </Web3Providers>
  );
}
