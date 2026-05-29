"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GlassCard } from "@/components/ui/GlassCard";
import { useContractEvent } from "@/hooks/useContractEvent";
import { useGoldskyFeesCompounded } from "@/hooks/useGoldskyVaultEvents";
import { mezrangeVaultAbi } from "@/lib/abis";
import { cn } from "@/lib/cn";
import { goldskyGraphqlUrl } from "@/lib/env";

type PerformanceChartsProps = {
  vaultAddress: `0x${string}`;
};

const CHART_TABS = ["APY Over Time", "Fee Earnings", "Impermanent Loss"] as const;
type ChartTab = (typeof CHART_TABS)[number];

function buildMockSeries(days: number, base: number, variance: number) {
  return Array.from({ length: days }, (_, i) => ({
    day: `D${i + 1}`,
    value: base + Math.sin(i * 0.5) * variance + i * (variance / days),
    hodl: base + i * (variance / days) * 0.9,
    lp: base + Math.sin(i * 0.4) * variance * 0.8 + i * (variance / days) * 1.05,
  }));
}

const tooltipStyle = {
  contentStyle: {
    background: "rgba(18, 19, 28, 0.9)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    backdropFilter: "blur(12px)",
  },
  labelStyle: { color: "#9B9BA3" },
};

export function PerformanceCharts({ vaultAddress }: PerformanceChartsProps) {
  const [tab, setTab] = useState<ChartTab>("APY Over Time");
  const goldskyFees = useGoldskyFeesCompounded(vaultAddress);

  const { data: feeLogs } = useContractEvent({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    eventName: "FeesCompounded",
    fromBlock: BigInt(0),
    enabled: !goldskyGraphqlUrl,
  });

  const apyData = useMemo(() => buildMockSeries(14, 8, 4), []);
  const feeData = useMemo(() => {
    if (goldskyGraphqlUrl && goldskyFees.data?.length) {
      return [...goldskyFees.data]
        .slice(0, 14)
        .reverse()
        .map((e, i) => ({
          day: `#${i + 1}`,
          fees: Number(e.amount0) / 1e18,
        }));
    }
    if (feeLogs?.length) {
      return feeLogs.slice(-14).map((log, i) => {
        const args = log.args as { amount0?: bigint };
        return {
          day: `#${i + 1}`,
          fees: Number(args.amount0 ?? BigInt(0)) / 1e18,
        };
      });
    }
    return buildMockSeries(14, 0.02, 0.05).map((d) => ({
      day: d.day,
      fees: d.value / 100,
    }));
  }, [feeLogs, goldskyFees.data]);

  const ilData = useMemo(() => buildMockSeries(14, 100, 5), []);

  return (
    <GlassCard>
      <div className="flex flex-wrap gap-2">
        {CHART_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-3 py-2 text-xs font-medium transition duration-300",
              tab === t
                ? "bg-white/10 text-btc-orange"
                : "text-text-muted hover:text-text-primary",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 h-64">
        {tab === "APY Over Time" && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={apyData}>
              <defs>
                <linearGradient id="apyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F7931A" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#F7931A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fill: "#6B6B75", fontSize: 10 }} />
              <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
              <Tooltip {...tooltipStyle} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#F7931A"
                fill="url(#apyFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {tab === "Fee Earnings" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={feeData}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fill: "#6B6B75", fontSize: 10 }} />
              <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="fees" fill="#F7931A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {tab === "Impermanent Loss" && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ilData}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fill: "#6B6B75", fontSize: 10 }} />
              <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="hodl" stroke="#9B9BA3" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="lp" stroke="#F7931A" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="mt-2 text-[10px] text-text-muted">
        Historical charts use on-chain fee events where available; APY and IL series are
        illustrative until indexed subgraph data is connected.
      </p>
    </GlassCard>
  );
}
