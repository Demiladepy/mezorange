"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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

const CHART_TABS = ["Fee Events", "APY", "Impermanent Loss"] as const;
type ChartTab = (typeof CHART_TABS)[number];

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
  const [tab, setTab] = useState<ChartTab>("Fee Events");
  const goldskyFees = useGoldskyFeesCompounded(vaultAddress);

  const { data: feeLogs } = useContractEvent({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    eventName: "FeesCompounded",
    fromBlock: BigInt(0),
    enabled: !goldskyGraphqlUrl,
  });

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
    return [];
  }, [feeLogs, goldskyFees.data]);

  const hasFeeData = feeData.length > 0;
  const comingSoon = tab !== "Fee Events";

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
              t !== "Fee Events" && "opacity-70",
            )}
          >
            {t}
            {t !== "Fee Events" && (
              <span className="ml-1 text-[9px] text-text-muted">v0.2</span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 flex h-64 items-center justify-center">
        {comingSoon ? (
          <div className="text-center">
            <p className="font-heading text-sm font-semibold text-text-primary">
              {tab} — coming in v0.2
            </p>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-text-muted">
              Requires sustained vault activity and extended subgraph indexing. Fee events
              below use real on-chain data where available.
            </p>
          </div>
        ) : hasFeeData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={feeData}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fill: "#6B6B75", fontSize: 10 }} />
              <YAxis tick={{ fill: "#6B6B75", fontSize: 10 }} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="fees" fill="#F7931A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center">
            <p className="font-heading text-sm font-semibold text-text-primary">
              No fee events yet
            </p>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-text-muted">
              FeesCompounded events will appear here after the vault earns and compounds CL
              fees. Range and rebalance data is live above.
            </p>
          </div>
        )}
      </div>

      <p className="mt-2 text-[10px] text-text-muted">
        Fee chart uses indexed Goldsky events or direct RPC logs — no synthetic data.
      </p>
    </GlassCard>
  );
}
