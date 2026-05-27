"use client";

import { useMemo } from "react";
import { useBlockNumber, useContractRead } from "wagmi";
import { useContractEvent } from "@/hooks/useContractEvent";
import { erc20Abi, mezrangeVaultAbi, uniswapV3PoolAbi } from "@/lib/abis";
import {
  formatPercent,
  formatPrice,
  formatTokenAmount,
} from "@/lib/format";
import { sqrtPriceX96ToPrice, tickToPrice } from "@/lib/uniswap";

type VaultMetricsProps = {
  vaultAddress: `0x${string}`;
};

export function VaultMetrics({ vaultAddress }: VaultMetricsProps) {
  useBlockNumber({ watch: true });

  const { data: totalAssets } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "totalAssets",
  });

  const { data: totalBalances } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "totalBalances",
  });

  const { data: tickLower } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "tickLower",
  });

  const { data: tickUpper } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "tickUpper",
  });

  const { data: needsRebalance } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "needsRebalance",
  });

  const { data: poolAddress } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "pool",
  });

  const { data: token0 } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "token0",
  });

  const { data: token1 } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "token1",
  });

  const { data: decimals0 } = useContractRead({
    address: token0 as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: Boolean(token0) },
  });

  const { data: decimals1 } = useContractRead({
    address: token1 as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: Boolean(token1) },
  });

  const { data: symbol0 } = useContractRead({
    address: token0 as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: Boolean(token0) },
  });

  const { data: symbol1 } = useContractRead({
    address: token1 as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: Boolean(token1) },
  });

  const { data: slot0 } = useContractRead({
    address: poolAddress as `0x${string}` | undefined,
    abi: uniswapV3PoolAbi,
    functionName: "slot0",
    query: { enabled: Boolean(poolAddress) },
  });

  const rebalanceLogs = useContractEvent({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    eventName: "Rebalanced",
    fromBlock: BigInt(0),
  });

  const feeLogs = useContractEvent({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    eventName: "FeesCompounded",
    fromBlock: BigInt(0),
  });

  const currentTick = slot0 ? Number(slot0[1]) : null;
  const lower = tickLower !== undefined ? Number(tickLower) : null;
  const upper = tickUpper !== undefined ? Number(tickUpper) : null;
  const d0 = decimals0 !== undefined ? Number(decimals0) : 18;
  const d1 = decimals1 !== undefined ? Number(decimals1) : 18;

  const currentPrice = useMemo(() => {
    if (slot0) {
      return sqrtPriceX96ToPrice(slot0[0] as bigint, d0, d1);
    }
    if (currentTick !== null) {
      return tickToPrice(currentTick, d0, d1);
    }
    return null;
  }, [slot0, currentTick, d0, d1]);

  const lowerPrice = lower !== null ? tickToPrice(lower, d0, d1) : null;
  const upperPrice = upper !== null ? tickToPrice(upper, d0, d1) : null;

  const feesEarned = useMemo(() => {
    if (!feeLogs.data?.length) return { amount0: BigInt(0), amount1: BigInt(0) };
    return feeLogs.data.reduce(
      (acc, log) => {
        const args = log.args as { amount0?: bigint; amount1?: bigint };
        return {
          amount0: acc.amount0 + (args.amount0 ?? BigInt(0)),
          amount1: acc.amount1 + (args.amount1 ?? BigInt(0)),
        };
      },
      { amount0: BigInt(0), amount1: BigInt(0) },
    );
  }, [feeLogs.data]);

  const estimatedApy = useMemo(() => {
    const tvl = totalAssets as bigint | undefined;
    if (!tvl || tvl === BigInt(0)) return null;
    const feeValue = feesEarned.amount0;
    if (feeValue === BigInt(0)) return 0;
    return Number(feeValue) / Number(tvl);
  }, [feesEarned.amount0, totalAssets]);

  const metrics = [
    {
      label: "TVL (token0)",
      value: formatTokenAmount(totalAssets as bigint | undefined, d0),
    },
    {
      label: "Est. fee yield",
      value: formatPercent(estimatedApy),
    },
    {
      label: "Current price",
      value:
        currentPrice !== null
          ? `${formatPrice(currentPrice)} ${(symbol1 as string) ?? "T1"}/${(symbol0 as string) ?? "T0"}`
          : "—",
    },
    {
      label: "Active range",
      value:
        lower !== null && upper !== null
          ? `[${lower}, ${upper}]`
          : "—",
    },
    {
      label: "Range prices",
      value:
        lowerPrice !== null && upperPrice !== null
          ? `${formatPrice(lowerPrice)} – ${formatPrice(upperPrice)}`
          : "—",
    },
    {
      label: "Rebalances",
      value: String(rebalanceLogs.data?.length ?? 0),
    },
    {
      label: "Fees earned",
      value: `${formatTokenAmount(feesEarned.amount0, d0)} ${(symbol0 as string) ?? "T0"} + ${formatTokenAmount(feesEarned.amount1, d1)} ${(symbol1 as string) ?? "T1"}`,
    },
    {
      label: "Status",
      value: needsRebalance ? "Needs rebalance" : "In range",
    },
  ];

  const [total0, total1] = (totalBalances as [bigint, bigint] | undefined) ?? [
    undefined,
    undefined,
  ];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h3 className="text-lg font-semibold text-zinc-50">Vault metrics</h3>
      <p className="mt-1 text-sm text-zinc-400">
        Live on-chain data refreshed each block.
      </p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl bg-zinc-950/60 p-4">
            <dt className="text-xs uppercase tracking-wide text-zinc-500">
              {metric.label}
            </dt>
            <dd className="mt-2 text-sm font-medium text-zinc-100">
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-400">
        <p>
          Reserves:{" "}
          <span className="text-zinc-200">
            {formatTokenAmount(total0, d0)} {(symbol0 as string) ?? "T0"}
          </span>{" "}
          +{" "}
          <span className="text-zinc-200">
            {formatTokenAmount(total1, d1)} {(symbol1 as string) ?? "T1"}
          </span>
        </p>
      </div>
    </div>
  );
}
