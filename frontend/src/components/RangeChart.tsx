"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useBlockNumber, useContractRead } from "wagmi";
import { erc20Abi, mezrangeVaultAbi, uniswapV3PoolAbi } from "@/lib/abis";
import { formatPrice } from "@/lib/format";
import {
  buildRangeChartData,
  sqrtPriceX96ToPrice,
  tickToPrice,
} from "@/lib/uniswap";

type RangeChartProps = {
  vaultAddress: `0x${string}`;
};

export function RangeChart({ vaultAddress }: RangeChartProps) {
  useBlockNumber({ watch: true });

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

  const chartData = useMemo(() => {
    if (
      tickLower === undefined ||
      tickUpper === undefined ||
      !slot0 ||
      decimals0 === undefined ||
      decimals1 === undefined
    ) {
      return [];
    }

    const lower = Number(tickLower);
    const upper = Number(tickUpper);
    const currentTick = Number(slot0[1]);
    const d0 = Number(decimals0);
    const d1 = Number(decimals1);

    return buildRangeChartData(lower, upper, currentTick, d0, d1);
  }, [tickLower, tickUpper, slot0, decimals0, decimals1]);

  const currentPrice = useMemo(() => {
    if (!slot0 || decimals0 === undefined || decimals1 === undefined) {
      return null;
    }
    return sqrtPriceX96ToPrice(
      slot0[0] as bigint,
      Number(decimals0),
      Number(decimals1),
    );
  }, [slot0, decimals0, decimals1]);

  const lowerPrice =
    tickLower !== undefined && decimals0 !== undefined && decimals1 !== undefined
      ? tickToPrice(Number(tickLower), Number(decimals0), Number(decimals1))
      : null;

  const upperPrice =
    tickUpper !== undefined && decimals0 !== undefined && decimals1 !== undefined
      ? tickToPrice(Number(tickUpper), Number(decimals0), Number(decimals1))
      : null;

  const pairLabel = `${(symbol1 as string) ?? "T1"}/${(symbol0 as string) ?? "T0"}`;

  if (!chartData.length) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h3 className="text-lg font-semibold text-zinc-50">Price range</h3>
        <p className="mt-4 text-sm text-zinc-500">Loading pool tick data…</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-50">Price range vs pool</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Uniswap V3 ticks mapped to {pairLabel} price
          </p>
        </div>
        {currentPrice !== null && (
          <p className="text-sm text-zinc-300">
            Spot:{" "}
            <span className="font-semibold text-orange-400">
              {formatPrice(currentPrice)}
            </span>
          </p>
        )}
      </div>

      <div className="mt-6 h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="rangeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis
              dataKey="tick"
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "#52525b" }}
            />
            <YAxis
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "#52525b" }}
              tickFormatter={(value) => formatPrice(Number(value))}
            />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: "0.75rem",
              }}
              labelFormatter={(tick) => `Tick ${tick}`}
              formatter={(value) => formatPrice(Number(value))}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="rangeMax"
              stroke="#f97316"
              fill="url(#rangeFill)"
              name="Range upper"
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="rangeMin"
              stroke="#fb923c"
              fill="transparent"
              name="Range lower"
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke="#22d3ee"
              strokeWidth={2}
              dot={{ r: 4, fill: "#22d3ee" }}
              name="Current price"
              connectNulls
            />
            {lowerPrice !== null && (
              <ReferenceLine
                y={lowerPrice}
                stroke="#a855f7"
                strokeDasharray="4 4"
                label={{ value: "Lower", fill: "#c4b5fd", fontSize: 12 }}
              />
            )}
            {upperPrice !== null && (
              <ReferenceLine
                y={upperPrice}
                stroke="#a855f7"
                strokeDasharray="4 4"
                label={{ value: "Upper", fill: "#c4b5fd", fontSize: 12 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
