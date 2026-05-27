import type { Metadata } from "next";
import { ClientShell } from "@/components/ClientShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mezrange Pro Vault",
  description: "Concentrated liquidity vault dashboard on Mezo Testnet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-950 font-sans text-zinc-100">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
