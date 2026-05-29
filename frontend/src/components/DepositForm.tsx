"use client";

import { useState } from "react";
import {
  useAccount,
  useContractRead,
  useContractWrite,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits } from "viem";
import { erc20Abi, mezrangeVaultAbi } from "@/lib/abis";
import { cn } from "@/lib/cn";

type DepositFormProps = {
  vaultAddress: `0x${string}`;
  embedded?: boolean;
};

export function DepositForm({ vaultAddress, embedded }: DepositFormProps) {
  const { address } = useAccount();
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

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

  const { writeContractAsync: approve0, data: approve0Hash } = useContractWrite();
  const { writeContractAsync: approve1, data: approve1Hash } = useContractWrite();
  const { writeContractAsync: deposit, data: depositHash } = useContractWrite();

  const { isLoading: waitingApprove0 } = useWaitForTransactionReceipt({
    hash: approve0Hash,
  });
  const { isLoading: waitingApprove1 } = useWaitForTransactionReceipt({
    hash: approve1Hash,
  });
  const { isLoading: waitingDeposit } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

  const busy = waitingApprove0 || waitingApprove1 || waitingDeposit;

  async function handleDeposit() {
    if (!address || !token0 || !token1 || !decimals0 || !decimals1) return;

    try {
      setStatus("Approving tokens…");
      const parsed0 = parseUnits(amount0 || "0", Number(decimals0));
      const parsed1 = parseUnits(amount1 || "0", Number(decimals1));

      await approve0({
        address: token0 as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [vaultAddress, parsed0],
      });

      await approve1({
        address: token1 as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [vaultAddress, parsed1],
      });

      setStatus("Depositing…");
      await deposit({
        address: vaultAddress,
        abi: mezrangeVaultAbi,
        functionName: "depositDual",
        args: [parsed0, parsed1, address],
      });

      setStatus("Deposit confirmed.");
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 1200);
      setAmount0("");
      setAmount1("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Deposit failed.");
    }
  }

  return (
    <div className={cn(!embedded && "rounded-xl border border-white/5 bg-glass p-6 backdrop-blur-xl")}>
      {!embedded && (
        <>
          <h3 className="font-heading text-lg font-semibold text-text-primary">Deposit</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Provide equal-value amounts of both pool tokens.
          </p>
        </>
      )}

      <div className={cn("space-y-3", !embedded && "mt-4")}>
        <label className="block text-sm">
          <span className="text-text-muted">{(symbol0 as string) ?? "Token0"}</span>
          <input
            type="number"
            min="0"
            step="any"
            value={amount0}
            onChange={(e) => setAmount0(e.target.value)}
            className="mz-input mt-1"
            placeholder="0.0"
          />
        </label>
        <label className="block text-sm">
          <span className="text-text-muted">{(symbol1 as string) ?? "Token1"}</span>
          <input
            type="number"
            min="0"
            step="any"
            value={amount1}
            onChange={(e) => setAmount1(e.target.value)}
            className="mz-input mt-1"
            placeholder="0.0"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={!address || busy || !amount0 || !amount1}
        onClick={handleDeposit}
        className={cn("mz-btn-primary relative mt-4 overflow-hidden", celebrate && "ring-2 ring-btc-gold/50")}
      >
        {busy ? "Processing…" : "Approve & Deposit"}
        {celebrate && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                className="absolute h-1.5 w-1.5 rounded-full bg-btc-gold motion-safe:animate-ping"
                style={{
                  transform: `rotate(${i * 45}deg) translateY(-20px)`,
                }}
              />
            ))}
          </span>
        )}
      </button>

      {status && <p className="mt-3 text-xs text-text-muted">{status}</p>}
    </div>
  );
}
