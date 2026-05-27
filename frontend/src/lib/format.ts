import { formatUnits } from "viem";

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

export function formatTokenAmount(
  value: bigint | undefined,
  decimals = 18,
  maxFractionDigits = 4,
): string {
  if (value === undefined) return "—";
  const formatted = formatUnits(value, decimals);
  const num = Number(formatted);
  if (!Number.isFinite(num)) return formatted;
  return num.toLocaleString(undefined, {
    maximumFractionDigits: maxFractionDigits,
  });
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `${(value * 100).toFixed(2)}%`;
}

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (value >= 1) return value.toFixed(4);
  return value.toPrecision(4);
}
