"use client";

import dynamic from "next/dynamic";
import { PageLoader } from "@/hooks/useClientReady";

const Web3Providers = dynamic(
  () =>
    import("@/components/providers/Web3Provider").then((mod) => mod.Web3Providers),
  { ssr: false, loading: () => <PageLoader /> },
);

const Navbar = dynamic(
  () => import("@/components/Navbar").then((mod) => mod.Navbar),
  { ssr: false },
);

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <Web3Providers>
      <Navbar />
      <main className="flex-1">{children}</main>
    </Web3Providers>
  );
}
