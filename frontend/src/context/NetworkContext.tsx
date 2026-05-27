"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type MezoNetwork = "testnet" | "mainnet";

type NetworkContextValue = {
  network: MezoNetwork;
  setNetwork: (network: MezoNetwork) => void;
};

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetwork] = useState<MezoNetwork>("testnet");

  const value = useMemo(
    () => ({
      network,
      setNetwork,
    }),
    [network],
  );

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error("useNetwork must be used within NetworkProvider");
  }
  return ctx;
}
