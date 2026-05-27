"use client";

import { useMemo, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import {
  getConfig,
  getDefaultWallets,
  mezoTestnet,
} from "@mezo-org/passport";
import { walletConnectProjectId } from "@/lib/env";
import { NetworkProvider, useNetwork } from "@/context/NetworkContext";

const queryClient = new QueryClient();

function Web3ProvidersInner({ children }: { children: ReactNode }) {
  const { network } = useNetwork();

  const config = useMemo(
    () =>
      getConfig({
        appName: "Mezrange Pro Vault",
        appDescription: "Concentrated liquidity vault dashboard on Mezo",
        mezoNetwork: network === "mainnet" ? "mainnet" : "testnet",
        walletConnectProjectId,
        wallets: getDefaultWallets(network === "mainnet" ? "mainnet" : "testnet"),
      }),
    [network],
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={mezoTestnet}
          theme={darkTheme({
            accentColor: "#f97316",
            accentColorForeground: "white",
            borderRadius: "medium",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export function Web3Providers({ children }: { children: ReactNode }) {
  return (
    <NetworkProvider>
      <Web3ProvidersInner>{children}</Web3ProvidersInner>
    </NetworkProvider>
  );
}
