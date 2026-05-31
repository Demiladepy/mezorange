export const MEZO_EXPLORER = "https://explorer.test.mezo.org";
export const GITHUB_REPO = "https://github.com/Demiladepy/mezorange";
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://mezorange-lp.vercel.app";
export const GOLDSKY_SUBGRAPH_LABEL = "mezorange-mezo-testnet/1.0.0";

export function explorerAddress(address: string): string {
  return `${MEZO_EXPLORER}/address/${address}`;
}

export function explorerTx(tx: string): string {
  return `${MEZO_EXPLORER}/tx/${tx}`;
}
