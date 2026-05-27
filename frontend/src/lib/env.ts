export const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "00000000000000000000000000000000";

export const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as
  | `0x${string}`
  | undefined;

export const defaultVaultAddress = process.env.NEXT_PUBLIC_VAULT_ADDRESS as
  | `0x${string}`
  | undefined;

export const mezoTestnetRpc =
  process.env.NEXT_PUBLIC_MEZO_TESTNET_RPC ?? "https://rpc.test.mezo.org";
