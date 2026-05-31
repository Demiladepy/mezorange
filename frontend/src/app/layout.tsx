import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { APP_URL } from "@/lib/links";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

const title = "Mezorange LP | Mezo DeFi";
const description =
  "Automated concentrated-liquidity vault for BTC/MUSD on Mezo Testnet. Monitor ranges, indexed activity, and deposit via Slipstream CL.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL(APP_URL),
  openGraph: {
    title,
    description,
    url: APP_URL,
    siteName: "Mezorange LP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-body">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
